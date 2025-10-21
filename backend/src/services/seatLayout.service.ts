import createError from "http-errors";
import SeatLayout from "../models/seatLayout.model";
import Flight from "../models/flight.model";
import { Types } from "mongoose";

/**
 * Service for managing airplane seat layouts
 */

// Generate default seat layout for a flight
const generateSeatLayout = async (flightId: string, totalSeats: number) => {
  const flight = await Flight.findById(flightId);
  if (!flight) {
    throw createError(404, "Flight not found");
  }

  // Calculate seat class distribution based on total seats
  const firstClassSeats = Math.floor(totalSeats * 0.1); // 10% first class
  const businessSeats = Math.floor(totalSeats * 0.2); // 20% business
  const economySeats = totalSeats - firstClassSeats - businessSeats;

  // Calculate rows for each class (5 seats per row: A-E)
  const seatsPerRow = 5;
  const firstClassRows = Math.ceil(firstClassSeats / seatsPerRow);
  const businessRows = Math.ceil(businessSeats / seatsPerRow);
  const economyRows = Math.ceil(economySeats / seatsPerRow);

  const layout = [];
  let currentRow = 1;

  // First class seats (rows 1-2)
  for (let row = 1; row <= firstClassRows; row++) {
    const rowSeats = [];
    for (let seat = 0; seat < seatsPerRow; seat++) {
      rowSeats.push({
        seatId: `${currentRow}${String.fromCharCode(65 + seat)}`, // 1A, 1B, 1C, 1D, 1E
        seatClass: "first",
        status: "available",
        ticketId: null,
      });
    }
    layout.push({ row: currentRow, seats: rowSeats });
    currentRow++;
  }

  // Business class seats
  for (let row = 1; row <= businessRows; row++) {
    const rowSeats = [];
    for (let seat = 0; seat < seatsPerRow; seat++) {
      rowSeats.push({
        seatId: `${currentRow}${String.fromCharCode(65 + seat)}`,
        seatClass: "business",
        status: "available",
        ticketId: null,
      });
    }
    layout.push({ row: currentRow, seats: rowSeats });
    currentRow++;
  }

  // Economy class seats
  for (let row = 1; row <= economyRows; row++) {
    const rowSeats = [];
    for (let seat = 0; seat < seatsPerRow; seat++) {
      rowSeats.push({
        seatId: `${currentRow}${String.fromCharCode(65 + seat)}`,
        seatClass: "economy",
        status: "available",
        ticketId: null,
      });
    }
    layout.push({ row: currentRow, seats: rowSeats });
    currentRow++;
  }

  const seatClasses = {
    first: {
      rows: Array.from({ length: firstClassRows }, (_, i) => i + 1),
      count: firstClassSeats,
    },
    business: {
      rows: Array.from({ length: businessRows }, (_, i) => i + firstClassRows + 1),
      count: businessSeats,
    },
    economy: {
      rows: Array.from({ length: economyRows }, (_, i) => i + firstClassRows + businessRows + 1),
      count: economySeats,
    },
  };

  return {
    flightId,
    layout,
    seatClasses,
    totalSeats,
  };
};

// Get seat layout for a flight
const getSeatLayout = async (flightId: string) => {
  let seatLayout = await SeatLayout.findOne({ flightId });

  if (!seatLayout) {
    // Generate default layout if it doesn't exist
    const flight = await Flight.findById(flightId);
    if (!flight) {
      throw createError(404, "Flight not found");
    }

    const layoutData = await generateSeatLayout(flightId, flight.totalSeats);
    seatLayout = await SeatLayout.create(layoutData);
  }

  return seatLayout;
};

// Update seat status
const updateSeatStatus = async (flightId: string, seatId: string, status: "available" | "booked" | "blocked", ticketId?: any) => {
  const seatLayout = await SeatLayout.findOne({ flightId });
  if (!seatLayout) {
    throw createError(404, "Seat layout not found");
  }

  // Find and update the seat
  let seatUpdated = false;
  for (const row of seatLayout.layout) {
    for (const seat of row.seats) {
      if (seat.seatId === seatId) {
        seat.status = status;
        if (ticketId) {
          seat.ticketId = ticketId;
        }
        // Không gán gì nếu không có ticketId, để Mongoose tự xử lý với default value
        seatUpdated = true;
        break;
      }
    }
    if (seatUpdated) break;
  }

  if (!seatUpdated) {
    throw createError(404, "Seat not found");
  }

  await seatLayout.save();
  return seatLayout;
};

// Book seats for a ticket
const bookSeats = async (flightId: string, seatIds: string[], ticketId: any) => {
  const seatLayout = await SeatLayout.findOne({ flightId });
  if (!seatLayout) {
    throw createError(404, "Seat layout not found");
  }

  // Check if seats are available
  for (const seatId of seatIds) {
    let seatFound = false;
    for (const row of seatLayout.layout) {
      for (const seat of row.seats) {
        if (seat.seatId === seatId) {
          seatFound = true;
          if (seat.status !== "available") {
            throw createError(400, `Seat ${seatId} is not available`);
          }
          break;
        }
      }
      if (seatFound) break;
    }
    if (!seatFound) {
      throw createError(404, `Seat ${seatId} not found`);
    }
  }

  // Book the seats
  for (const seatId of seatIds) {
    for (const row of seatLayout.layout) {
      for (const seat of row.seats) {
        if (seat.seatId === seatId) {
          seat.status = "booked";
          // Sử dụng trực tiếp ticketId nếu nó đã là ObjectId hợp lệ
          seat.ticketId = ticketId;
          break;
        }
      }
    }
  }

  await seatLayout.save();
  return seatLayout;
};

// Release seats (when ticket is cancelled)
const releaseSeats = async (flightId: string, seatIds: string[]) => {
  const seatLayout = await SeatLayout.findOne({ flightId });
  if (!seatLayout) {
    throw createError(404, "Seat layout not found");
  }

  for (const seatId of seatIds) {
    for (const row of seatLayout.layout) {
      for (const seat of row.seats) {
        if (seat.seatId === seatId && seat.status === "booked") {
          seat.status = "available";
          // Không gán gì cho ticketId, để Mongoose tự xử lý với default value
          break;
        }
      }
    }
  }

  await seatLayout.save();
  return seatLayout;
};

export default {
  generateSeatLayout,
  getSeatLayout,
  updateSeatStatus,
  bookSeats,
  releaseSeats,
};
