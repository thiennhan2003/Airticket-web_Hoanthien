import { Schema, model } from "mongoose";

const verificationSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    verificationCode: {
      type: String,
      required: [true, "Verification code is required"],
      length: 6, // Mã 6 chữ số
    },
    tempToken: {
      type: String,
      required: [true, "Temp token is required"],
      unique: true,
    },
    type: {
      type: String,
      enum: ["login", "register", "password_reset"],
      default: "login",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // Hết hạn sau 5 phút
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3, // Tối đa 3 lần thử
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index để tự động xóa bản ghi hết hạn
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để tìm kiếm nhanh theo email và tempToken
verificationSchema.index({ email: 1, tempToken: 1 });

export default model("Verification", verificationSchema);
