import { Schema, model } from "mongoose";

const ticketSchema = new Schema(
  {
    ticketCode: {
      type: String,
      required: [true, "Ticket code is required"],
      unique: true,
      trim: true,
    },
    passengerName: {
      type: String,
      required: [true, "Passenger name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    flightId: {
      type: Schema.Types.ObjectId,
      ref: "Flight",
      required: [true, "Flight ID is required"],
    },
    seatNumber: {
      type: String,
      required: [true, "Seat number is required"],
      trim: true,
    },
    seatNumbers: [{
      type: String,
      trim: true,
    }], // Mảng ghế cho nhiều hành khách
    seatClasses: [{
      type: String,
      enum: ["economy", "business", "first"],
      default: "economy",
    }], // Mảng loại vé tương ứng với từng ghế
    ticketClass: {
      type: String,
      required: [true, "Ticket class is required"],
      enum: ["economy", "business", "first"],
      default: "economy",
    },
    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Price must be greater than or equal to 0"],
    },
    passengerCount: {
      type: Number,
      required: [true, "Passenger count is required"],
      min: [1, "At least 1 passenger is required"],
      // ✅ Loại bỏ giới hạn cứng, sẽ kiểm tra dựa trên số ghế còn lại của chuyến bay
      default: 1,
    },
    status: {
      type: String,
      enum: ["booked", "cancelled", "checked-in"],
      default: "booked",
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    paymentDeadline: {
      type: Date,
      default: function() {
        // Tính thời hạn thanh toán dựa trên thời gian đặt vé thực tế
        const bookingTime = this.bookingDate || new Date();
        return new Date(bookingTime.getTime() + 1 * 60 * 60 * 1000); // 1 giờ sau khi đặt
      },
    },
    qrCode: {
      type: String, // base64 hoặc URL
      default: null,
    },
    // ✅ Payment related fields
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentIntentId: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "wallet"],
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundId: {
      type: String,
      default: null,
    },
    refundReason: {
      type: String,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default model("Ticket", ticketSchema);
