import express from "express";
import ticketController from "../../controllers/ticket.controller";
import validateSchemaYup from "../../middlewares/validate.middleware";
import ticketValidation from "../../validations/ticket.validation";

const router = express.Router();

// Get all tickets
router.get(
  "/",
//   validateSchemaYup(ticketValidation.getAllSchema),
  ticketController.getAll
);

// Get ticket by id
router.get(
  "/:id",
//   validateSchemaYup(ticketValidation.getByIdSchema),
  ticketController.getById
);

// Create ticket
router.post(
  "/",
//   validateSchemaYup(ticketValidation.createSchema),
  ticketController.Create
);

// Update ticket
router.put(
  "/:id",
//   validateSchemaYup(ticketValidation.updateByIdSchema),
  ticketController.Update
);

// Delete ticket
router.delete(
  "/:id",
//   validateSchemaYup(ticketValidation.deleteByIdSchema),
  ticketController.Delete
);

// Check-in ticket
router.put(
  "/:id/checkin",
//   validateSchemaYup(ticketValidation.checkinSchema),
  ticketController.checkin
);

// Get ticket from QR code
router.post(
  "/qr-info",
//   validateSchemaYup(ticketValidation.getFromQRCodeSchema),
  ticketController.getFromQRCode
);

export default router;
