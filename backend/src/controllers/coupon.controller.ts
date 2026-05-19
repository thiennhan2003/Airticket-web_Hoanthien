import { Request, Response, NextFunction } from 'express';
import Coupon from '../models/coupon.model';
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';
import User from '../models/users.model';

/**
 * Coupon Controller
 * Handles coupon management operations including CRUD and validation
 */

// Get all coupons with filtering and pagination
const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      discountType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

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

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const coupons = await Coupon.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('applicableFlights', 'flightCode route')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments(filter);
    const totalPages = Math.ceil(total / Number(limit));

    sendJsonSuccess(res, {
      coupons,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    }, httpStatus.OK.statusCode, 'Coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get coupon by ID
const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id)
      .populate('createdBy', 'fullName email')
      .populate('applicableFlights', 'flightCode route')
      .populate('applicableUsers', 'fullName email');

    if (!coupon) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Coupon not found'
      });
    }

    sendJsonSuccess(res, coupon, httpStatus.OK.statusCode, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create new coupon
const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const couponData = {
      ...req.body,
      createdBy: res.locals.user._id
    };

    const coupon = new Coupon(couponData);
    await coupon.save();

    // Populate createdBy info
    await coupon.populate('createdBy', 'fullName email');

    sendJsonSuccess(res, coupon, httpStatus.CREATED.statusCode, 'Coupon created successfully');
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Coupon code already exists'
      });
    }
    next(error);
  }
};

// Update coupon
const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email');

    if (!coupon) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Coupon not found'
      });
    }

    sendJsonSuccess(res, coupon, httpStatus.OK.statusCode, 'Coupon updated successfully');
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Coupon code already exists'
      });
    }
    next(error);
  }
};

// Delete coupon
const deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Coupon not found'
      });
    }

    sendJsonSuccess(res, null, httpStatus.OK.statusCode, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Toggle coupon active status
const toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    sendJsonSuccess(res, coupon, httpStatus.OK.statusCode,
      `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

// Validate coupon for booking
const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, orderValue, userId, flightId } = req.body;

    if (!code) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Coupon code is required'
      });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Coupon not found or inactive'
      });
    }

    // Check if expired
    if (coupon.isExpired()) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Coupon has expired'
      });
    }

    // Check usage limit
    if (coupon.isUsageLimitReached()) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Coupon usage limit reached'
      });
    }

    // Check minimum order value
    if (orderValue < coupon.minOrderValue) {
      return res.status(400).json({
        statusCode: 400,
        message: `Minimum order value of ${coupon.minOrderValue.toLocaleString('vi-VN')} VND required`
      });
    }

    // Check if applicable to specific flights
    if (coupon.applicableFlights && coupon.applicableFlights.length > 0) {
      if (!flightId || !coupon.applicableFlights.some((id: any) => id.toString() === flightId)) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Coupon not applicable to this flight'
        });
      }
    }

    // Check if applicable to specific users
    if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
      if (!userId || !coupon.applicableUsers.some((id: any) => id.toString() === userId)) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Coupon not applicable to this user'
        });
      }
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderValue);

    sendJsonSuccess(res, {
      coupon,
      discountAmount,
      finalAmount: orderValue - discountAmount,
      isValid: true
    }, httpStatus.OK.statusCode, 'Coupon is valid');
  } catch (error) {
    next(error);
  }
};

// Apply coupon to booking (increase used count)
const applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Coupon already validated by middleware, get it from res.locals
    const coupon = res.locals.coupon;

    // Increase used count
    coupon.usedCount += 1;
    await coupon.save();

    sendJsonSuccess(res, {
      coupon,
      usedCount: coupon.usedCount
    }, httpStatus.OK.statusCode, 'Coupon applied successfully');
  } catch (error) {
    next(error);
  }
};

// Get coupon statistics
const getStatistics = async (req: Request, res: Response, next: NextFunction) => {
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

    const result = stats[0] || {
      totalCoupons: 0,
      activeCoupons: 0,
      expiredCoupons: 0,
      totalUsed: 0,
      totalDiscountGiven: 0
    };

    sendJsonSuccess(res, result, httpStatus.OK.statusCode, 'Coupon statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  delete: deleteCoupon,
  toggleStatus,
  validateCoupon,
  applyCoupon,
  getStatistics
};
