import { Schema, model } from "mongoose";

const seatLayoutSchema = new Schema(
  {
    flightId: {
      type: Schema.Types.ObjectId,
      ref: "Flight",
      required: [true, "Flight ID is required"],
      unique: true,
    },
    // Seat layout structure - array of rows, each row contains seats A-E
    layout: [{
      row: {
        type: Number,
        required: true,
      },
      seats: [{
        seatId: {
          type: String,
          required: true, // e.g., "1A", "1B", "2A", etc.
        },
        seatClass: {
          type: String,
          required: true,
          enum: ["economy", "business", "first"],
        },
        status: {
          type: String,
          required: true,
          enum: ["available", "booked", "blocked"],
          default: "available",
        },
        // For booked seats, reference to ticket
        ticketId: {
          type: Schema.Types.Mixed, // Cho phép cả ObjectId và string
          ref: "Ticket",
          default: null,
        },
      }],
    }],
    // Seat class distribution
    seatClasses: {
      first: {
        rows: {
          type: [Number], // e.g., [1, 2] for first class rows
        },
        count: {
          type: Number,
          default: 0,
        },
      },
      business: {
        rows: {
          type: [Number], // e.g., [3, 4, 5] for business class rows
        },
        count: {
          type: Number,
          default: 0,
        },
      },
      economy: {
        rows: {
          type: [Number], // e.g., [6, 7, 8, ..., 30] for economy class rows
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    },
    totalSeats: {
      type: Number,
      required: true,
      min: [1, "Total seats must be >= 1"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model("SeatLayout", seatLayoutSchema);
