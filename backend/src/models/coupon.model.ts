import { Schema, model, Document } from "mongoose";

// Interface cho Coupon Document
export interface ICoupon extends Document {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number; // Chỉ áp dụng cho percentage
  usageLimit: number;
  usedCount: number;
  expiryDate: Date;
  isActive: boolean;
  description?: string;
  applicableFlights?: Schema.Types.ObjectId[]; // Có thể áp dụng cho flights cụ thể
  applicableUsers?: Schema.Types.ObjectId[]; // Có thể áp dụng cho users cụ thể
  createdBy: Schema.Types.ObjectId; // Admin tạo coupon
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValid(): boolean;
  isExpired(): boolean;
  isUsageLimitReached(): boolean;
  calculateDiscount(orderValue: number): number;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Coupon code must be at least 3 characters"],
      maxlength: [20, "Coupon code cannot exceed 20 characters"],
      match: [/^[A-Z0-9]+$/, "Coupon code can only contain uppercase letters and numbers"],
    },
    discountType: {
      type: String,
      required: [true, "Discount type is required"],
      enum: {
        values: ["percentage", "fixed"],
        message: "Discount type must be either 'percentage' or 'fixed'",
      },
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    minOrderValue: {
      type: Number,
      required: [true, "Minimum order value is required"],
      min: [0, "Minimum order value cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
      // Chỉ bắt buộc khi discountType là percentage
      required: function() {
        return this.discountType === "percentage";
      },
    },
    usageLimit: {
      type: Number,
      required: [true, "Usage limit is required"],
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    applicableFlights: [{
      type: Schema.Types.ObjectId,
      ref: "Flight",
    }],
    applicableUsers: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by admin is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index cho performance
couponSchema.index({ isActive: 1, expiryDate: 1 });
couponSchema.index({ createdBy: 1 });

// Methods
couponSchema.methods.isValid = function(): boolean {
  return this.isActive &&
         !this.isExpired() &&
         !this.isUsageLimitReached();
};

couponSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiryDate;
};

couponSchema.methods.isUsageLimitReached = function(): boolean {
  return this.usedCount >= this.usageLimit;
};

couponSchema.methods.calculateDiscount = function(orderValue: number): number {
  if (orderValue < this.minOrderValue) {
    return 0;
  }

  if (this.discountType === "fixed") {
    return Math.min(this.discountValue, orderValue);
  } else if (this.discountType === "percentage") {
    const discount = (orderValue * this.discountValue) / 100;
    return Math.min(discount, this.maxDiscount || discount, orderValue);
  }

  return 0;
};

// Pre-save middleware để validate
couponSchema.pre('save', function(next) {
  // Validate percentage không vượt quá 100%
  if (this.discountType === "percentage" && this.discountValue > 100) {
    return next(new Error("Percentage discount cannot exceed 100%"));
  }

  next();
});

export default model<ICoupon>("Coupon", couponSchema);
