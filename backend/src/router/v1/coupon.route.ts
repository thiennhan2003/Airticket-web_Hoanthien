import express from "express";
import couponController from "../../controllers/coupon.controller";
import validateSchemaYup from "../../middlewares/validate.middleware";
import couponValidation from "../../validations/coupon.validation";
import { authenticateToken, authorize, validateCoupon } from "../../middlewares/auth.middleware";

const router = express.Router();

// Get all coupons (Admin only)
router.get(
  "/",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.getAllSchema),
  couponController.getAll
);

// Get coupon by ID (Admin only)
router.get(
  "/:id",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.getByIdSchema),
  couponController.getById
);

// Create new coupon (Admin only)
router.post(
  "/",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.createSchema),
  couponController.create
);

// Update coupon (Admin only)
router.put(
  "/:id",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.updateSchema),
  couponController.update
);

// Delete coupon (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.deleteSchema),
  couponController.delete
);

// Toggle coupon status (Admin only)
router.patch(
  "/:id/toggle-status",
  authenticateToken,
  authorize(['admin']),
  validateSchemaYup(couponValidation.getByIdSchema),
  couponController.toggleStatus
);

// Validate coupon for booking (User/Admin)
router.post(
  "/validate",
  authenticateToken,
  validateSchemaYup(couponValidation.validateSchema),
  couponController.validateCoupon
);

// Apply coupon to booking (User/Admin)
router.post(
  "/apply",
  authenticateToken,
  validateSchemaYup(couponValidation.applySchema),
  validateCoupon,
  couponController.applyCoupon
);

// Get coupon statistics (Admin only)
router.get(
  "/stats/summary",
  authenticateToken,
  authorize(['admin']),
  couponController.getStatistics
);

export default router;
