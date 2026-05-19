import { Request, Response, NextFunction } from 'express';
import seatLayoutService from '../services/seatLayout.service';
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';

/**
 * Controller for seat layout management
 */

// Get seat layout for a flight
const getSeatLayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightId } = req.params;
    const seatLayout = await seatLayoutService.getSeatLayout(flightId);
    sendJsonSuccess(res, seatLayout, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Book seats for a flight
const bookSeats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightId } = req.params;
    const { seatIds, ticketId } = req.body;

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'seatIds must be a non-empty array'
      });
    }

    const seatLayout = await seatLayoutService.bookSeats(flightId, seatIds, ticketId);
    sendJsonSuccess(res, seatLayout, httpStatus.OK.statusCode, 'Seats booked successfully');
  } catch (error) {
    next(error);
  }
};

// Release seats (for ticket cancellation)
const releaseSeats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightId } = req.params;
    const { seatIds } = req.body;

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'seatIds must be a non-empty array'
      });
    }

    const seatLayout = await seatLayoutService.releaseSeats(flightId, seatIds);
    sendJsonSuccess(res, seatLayout, httpStatus.OK.statusCode, 'Seats released successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getSeatLayout,
  bookSeats,
  releaseSeats,
};
