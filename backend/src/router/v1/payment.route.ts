import express from "express";
import paymentController from "../../controllers/payment.controller";
import webhookController from "../../controllers/webhook.controller";
import { authenticateToken } from "../../middlewares/auth.middleware";

const router = express.Router();

// Test route - no authentication required
router.get("/test", (req, res) => {
  res.json({
    message: "Payment routes are working!",
    timestamp: new Date().toISOString(),
    // Temporarily log JWT_SECRET for debugging
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
  });
});

// Test route - with authentication required
router.get("/test-auth", authenticateToken, (req, res) => {
  res.json({
    message: "Payment routes with auth are working!",
    user: res.locals.user.email,
    timestamp: new Date().toISOString()
  });
});

// Create payment intent for ticket booking
router.post(
  "/create-payment-intent",
  authenticateToken,
  paymentController.createPaymentIntent
);

// Confirm payment after successful Stripe payment
router.post(
  "/confirm-payment",
  authenticateToken,
  paymentController.confirmPayment
);

// Process refund for cancelled ticket
router.post(
  "/refund",
  authenticateToken,
  paymentController.processRefund
);

// Get payment status for a ticket
router.get(
  "/status/:ticketId",
  authenticateToken,
  paymentController.getPaymentStatus
);

// Stripe webhook endpoint (no authentication for security)
router.post(
  "/webhook",
  express.raw({ type: 'application/json' }),
  webhookController.handleWebhook
);

export default router;
