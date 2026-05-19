import express from "express";
import seatLayoutController from "../../controllers/seatLayout.controller";

const router = express.Router();

// Get seat layout for a flight
router.get(
  "/flights/:flightId/seats",
  seatLayoutController.getSeatLayout
);

// Book seats for a flight
router.post(
  "/flights/:flightId/seats/book",
  seatLayoutController.bookSeats
);

// Release seats (for cancellation)
router.post(
  "/flights/:flightId/seats/release",
  seatLayoutController.releaseSeats
);

export default router;
