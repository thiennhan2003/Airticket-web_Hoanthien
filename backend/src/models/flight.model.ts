import { Schema, model } from "mongoose";

const flightSchema = new Schema(
  {
    flightCode: {
      type: String,
      required: [true, "Flight code is required"],
      unique: true,
      trim: true,
    },
    route: {
      type: String,
      required: [true, "Route is required"], // Ví dụ: "Hà Nội - Hồ Chí Minh"
      trim: true,
    },
    departureTime: {
      type: Date,
      required: [true, "Departure time is required"],
    },
    arrivalTime: {
      type: Date,
      required: [true, "Arrival time is required"],
    },
    totalSeats: {
      type: Number,
      required: [true, "Total seats are required"],
      min: [1, "Total seats must be >= 1"],
    },
    availableSeats: {
      type: Number,
      required: [true, "Available seats are required"],
      min: [0, "Available seats must be >= 0"],
    },
    firstClassPrice: {
      type: Number,
      required: [true, "First class price is required"],
      min: [0, "First class price must be >= 0"],
    },
    businessPrice: {
      type: Number,
      required: [true, "Business price is required"],
      min: [0, "Business price must be >= 0"],
    },
    economyPrice: {
      type: Number,
      required: [true, "Economy price is required"],
      min: [0, "Economy price must be >= 0"],
    },
    // Thông báo check-in đã được gửi
    checkinReminderSent: {
      type: Boolean,
      default: false,
    },
    // Thông báo check-in 2h đã được gửi
    checkinReminder2HSent: {
      type: Boolean,
      default: false,
    },
    // Thông báo check-in real-time đã được gửi
    realtimeCheckinSent: {
      type: Boolean,
      default: false,
    },
    // Thông báo lên máy bay 1h đã được gửi
    boardingReminder1HSent: {
      type: Boolean,
      default: false,
    },
    // Thông báo thay đổi lịch bay đã được gửi
    changeNotificationSent: {
      type: Boolean,
      default: false,
    },
    // Lý do delay/thay đổi lịch bay
    delayReason: {
      type: String,
      trim: true,
      default: null,
    },
    // Lưu thời gian gốc để phát hiện thay đổi
    originalDepartureTime: {
      type: Date,
      default: null,
    },
    originalArrivalTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model("Flight", flightSchema);
