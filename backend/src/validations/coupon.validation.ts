import * as yup from "yup";

// get all
const getAllSchema = yup
  .object({
    query: yup.object({
      page: yup.number().integer().positive().optional(),
      limit: yup.number().integer().positive().optional(),
      search: yup.string().min(1).max(20).optional(),
      isActive: yup.string().oneOf(["true", "false"]).optional(),
      discountType: yup.string().oneOf(["percentage", "fixed"]).optional(),
      sortBy: yup.string().oneOf(["createdAt", "code", "discountValue", "expiryDate"]).optional(),
      sortOrder: yup.string().oneOf(["asc", "desc"]).optional(),
    }),
  })
  .required();

// get by id
const getByIdSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
  })
  .required();

// create coupon
const createSchema = yup
  .object({
    body: yup.object({
      code: yup
        .string()
        .min(3, "Coupon code must be at least 3 characters")
        .max(20, "Coupon code cannot exceed 20 characters")
        .matches(/^[A-Z0-9]+$/, "Coupon code can only contain uppercase letters and numbers")
        .required(),
      discountType: yup
        .string()
        .oneOf(["percentage", "fixed"], "Discount type must be either 'percentage' or 'fixed'")
        .required(),
      discountValue: yup
        .number()
        .positive("Discount value must be positive")
        .required(),
      minOrderValue: yup
        .number()
        .min(0, "Minimum order value cannot be negative")
        .required(),
      maxDiscount: yup
        .number()
        .min(0, "Maximum discount cannot be negative")
        .when("discountType", {
          is: "percentage",
          then: (schema) => schema.required("Maximum discount is required for percentage coupons"),
          otherwise: (schema) => schema.optional(),
        }),
      usageLimit: yup
        .number()
        .integer("Usage limit must be a whole number")
        .min(1, "Usage limit must be at least 1")
        .required(),
      expiryDate: yup
        .date()
        .min(new Date(), "Expiry date must be in the future")
        .required(),
      isActive: yup.boolean().optional(),
      description: yup
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),
      applicableFlights: yup
        .array()
        .of(yup.string().matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId"))
        .optional(),
      applicableUsers: yup
        .array()
        .of(yup.string().matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId"))
        .optional(),
    }),
  })
  .required();

// update coupon
const updateSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
    body: yup.object({
      code: yup
        .string()
        .min(3, "Coupon code must be at least 3 characters")
        .max(20, "Coupon code cannot exceed 20 characters")
        .matches(/^[A-Z0-9]+$/, "Coupon code can only contain uppercase letters and numbers")
        .optional(),
      discountType: yup
        .string()
        .oneOf(["percentage", "fixed"], "Discount type must be either 'percentage' or 'fixed'")
        .optional(),
      discountValue: yup
        .number()
        .positive("Discount value must be positive")
        .optional(),
      minOrderValue: yup
        .number()
        .min(0, "Minimum order value cannot be negative")
        .optional(),
      maxDiscount: yup
        .number()
        .min(0, "Maximum discount cannot be negative")
        .optional(),
      usageLimit: yup
        .number()
        .integer("Usage limit must be a whole number")
        .min(1, "Usage limit must be at least 1")
        .optional(),
      expiryDate: yup
        .date()
        .min(new Date(), "Expiry date must be in the future")
        .optional(),
      isActive: yup.boolean().optional(),
      description: yup
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),
      applicableFlights: yup
        .array()
        .of(yup.string().matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId"))
        .optional(),
      applicableUsers: yup
        .array()
        .of(yup.string().matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId"))
        .optional(),
    }),
  })
  .required();

// delete coupon
const deleteSchema = yup
  .object({
    params: yup.object({
      id: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "ID must be a valid ObjectId" })
        .required(),
    }),
  })
  .required();

// validate coupon
const validateSchema = yup
  .object({
    body: yup.object({
      code: yup
        .string()
        .min(3, "Coupon code must be at least 3 characters")
        .max(20, "Coupon code cannot exceed 20 characters")
        .matches(/^[A-Z0-9]+$/, "Coupon code can only contain uppercase letters and numbers")
        .required(),
      orderValue: yup
        .number()
        .positive("Order value must be positive")
        .required(),
      userId: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId")
        .optional(),
      flightId: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId")
        .optional(),
    }),
  })
  .required();

// apply coupon
const applySchema = yup
  .object({
    body: yup.object({
      couponId: yup
        .string()
        .matches(/^[0-9a-fA-F]{24}$/, { message: "Coupon ID must be a valid ObjectId" })
        .required(),
    }),
  })
  .required();

export default {
  getAllSchema,
  getByIdSchema,
  createSchema,
  updateSchema,
  deleteSchema,
  validateSchema,
  applySchema,
};
