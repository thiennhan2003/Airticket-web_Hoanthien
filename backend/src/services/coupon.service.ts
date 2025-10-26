import Coupon from '../models/coupon.model';
import createError from 'http-errors';

/**
 * Coupon Service
 * Handles business logic for coupon operations
 */

class CouponService {
  /**
   * Get all coupons with filtering and pagination
   */
  async getAll(query: any) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        discountType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Build filter object
      const filter: any = {};

      if (search) {
        filter.code = { $regex: search, $options: 'i' };
      }

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (discountType) {
        filter.discountType = discountType;
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      const coupons = await Coupon.find(filter)
        .populate('createdBy', 'fullName email')
        .populate('applicableFlights', 'flightCode route')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

      const total = await Coupon.countDocuments(filter);
      const totalPages = Math.ceil(total / Number(limit));

      return {
        coupons,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: Number(limit)
        }
      };
    } catch (error) {
      throw createError(500, 'Error retrieving coupons');
    }
  }

  /**
   * Get coupon by ID
   */
  async getById(id: string) {
    try {
      const coupon = await Coupon.findById(id)
        .populate('createdBy', 'fullName email')
        .populate('applicableFlights', 'flightCode route')
        .populate('applicableUsers', 'fullName email');

      if (!coupon) {
        throw createError(404, 'Coupon not found');
      }

      return coupon;
    } catch (error: any) {
      if (error.status) throw error;
      throw createError(500, 'Error retrieving coupon');
    }
  }

  /**
   * Create new coupon
   */
  async create(couponData: any) {
    try {
      const coupon = new Coupon(couponData);
      await coupon.save();

      // Populate createdBy info
      await coupon.populate('createdBy', 'fullName email');

      return coupon;
    } catch (error: any) {
      if (error.code === 11000) {
        throw createError(400, 'Coupon code already exists');
      }
      throw error;
    }
  }

  /**
   * Update coupon by ID
   */
  async updateById(id: string, updateData: any) {
    try {
      const coupon = await Coupon.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'fullName email');

      if (!coupon) {
        throw createError(404, 'Coupon not found');
      }

      return coupon;
    } catch (error: any) {
      if (error.code === 11000) {
        throw createError(400, 'Coupon code already exists');
      }
      throw error;
    }
  }

  /**
   * Delete coupon by ID
   */
  async deleteById(id: string) {
    try {
      const coupon = await Coupon.findByIdAndDelete(id);

      if (!coupon) {
        throw createError(404, 'Coupon not found');
      }

      return coupon;
    } catch (error: any) {
      throw createError(500, 'Error deleting coupon');
    }
  }

  /**
   * Find coupon by code
   */
  async findByCode(code: string) {
    try {
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      return coupon;
    } catch (error: any) {
      throw createError(500, 'Error finding coupon by code');
    }
  }

  /**
   * Validate coupon for booking
   */
  async validateCoupon(code: string, orderValue: number, userId?: string, flightId?: string) {
    try {
      const coupon = await this.findByCode(code);

      if (!coupon) {
        throw createError(404, 'Coupon not found or inactive');
      }

      // Check if expired
      if (coupon.isExpired()) {
        throw createError(400, 'Coupon has expired');
      }

      // Check usage limit
      if (coupon.isUsageLimitReached()) {
        throw createError(400, 'Coupon usage limit reached');
      }

      // Check minimum order value
      if (orderValue < coupon.minOrderValue) {
        throw createError(400, `Minimum order value of ${coupon.minOrderValue.toLocaleString('vi-VN')} VND required`);
      }

      // Check if applicable to specific flights
      if (coupon.applicableFlights && coupon.applicableFlights.length > 0) {
        if (!flightId || !coupon.applicableFlights.some((id: any) => id.toString() === flightId)) {
          throw createError(400, 'Coupon not applicable to this flight');
        }
      }

      // Check if applicable to specific users
      if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
        if (!userId || !coupon.applicableUsers.some((id: any) => id.toString() === userId)) {
          throw createError(400, 'Coupon not applicable to this user');
        }
      }

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(orderValue);

      return {
        coupon,
        discountAmount,
        finalAmount: orderValue - discountAmount,
        isValid: true
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Apply coupon (increase used count)
   */
  async applyCoupon(couponId: string) {
    try {
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        throw createError(404, 'Coupon not found');
      }

      // Check if still valid
      if (!coupon.isValid()) {
        throw createError(400, 'Coupon is no longer valid');
      }

      // Increase used count
      coupon.usedCount += 1;
      await coupon.save();

      return {
        coupon,
        usedCount: coupon.usedCount
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get coupon statistics
   */
  async getStatistics() {
    try {
      const stats = await Coupon.aggregate([
        {
          $group: {
            _id: null,
            totalCoupons: { $sum: 1 },
            activeCoupons: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            expiredCoupons: {
              $sum: {
                $cond: [
                  { $lt: ['$expiryDate', new Date()] },
                  1,
                  0
                ]
              }
            },
            totalUsed: { $sum: '$usedCount' },
            totalDiscountGiven: {
              $sum: {
                $multiply: ['$usedCount', '$discountValue']
              }
            }
          }
        }
      ]);

      return stats[0] || {
        totalCoupons: 0,
        activeCoupons: 0,
        expiredCoupons: 0,
        totalUsed: 0,
        totalDiscountGiven: 0
      };
    } catch (error: any) {
      throw createError(500, 'Error retrieving coupon statistics');
    }
  }
}

export default new CouponService();
