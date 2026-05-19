import express from "express";
import flightController from "../../controllers/flight.controller";
import validateSchemaYup from "../../middlewares/validate.middleware";
import flightValidation from "../../validations/flight.validation";

const router = express.Router();

// Get all flights
router.get(
  "/",
  // validateSchemaYup(flightValidation.getAllSchema),
  flightController.getAll
);

// Get flight by id
router.get(
  "/:id",
  // validateSchemaYup(flightValidation.getByIdSchema),
  flightController.getById
);

// Create flight
router.post(
  "/",
  // validateSchemaYup(flightValidation.createSchema),
  flightController.Create
);

// Update flight
router.put(
  "/:id",
  // validateSchemaYup(flightValidation.updateByIdSchema),
  flightController.Update
);

// Delete flight
router.delete(
  "/:id",
  // validateSchemaYup(flightValidation.deleteByIdSchema),
  flightController.Delete
);

// Get flight by id with detailed info
router.get(
  "/:id/details",
  flightController.getByIdWithDetails
);

// Reset notification status để gửi lại thông báo
router.put(
  "/:id/reset-notifications",
  flightController.resetNotificationStatus
);

// Test gửi email thông báo
router.post(
  "/:flightCode/test-notification",
  flightController.testEmailNotification
);

// Kiểm tra vé của chuyến bay
router.get(
  "/:flightCode/tickets",
  flightController.checkFlightTickets
);

export default router;
