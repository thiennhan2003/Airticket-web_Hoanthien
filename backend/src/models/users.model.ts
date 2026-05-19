import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

// Interface cho User Document
export interface IUser extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: "user" | "admin" | "staff";
  isActive: boolean;
  // Wallet fields
  walletBalance: number;
  isWalletActive: boolean;
  walletPin?: string; // Mã PIN bảo mật (hashed)
  walletDailyLimit: number; // Giới hạn chi tiêu hàng ngày
  walletMonthlyLimit: number; // Giới hạn chi tiêu hàng tháng
  totalSpentInWallet: number; // Tổng tiền đã chi tiêu qua ví
  totalTopupInWallet: number; // Tổng tiền đã nạp vào ví
  walletLevel: "bronze" | "silver" | "gold" | "diamond"; // Cấp độ ví
  createdAt: Date;
  updatedAt: Date;

  // Schema methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareWalletPin(candidatePin: string): Promise<boolean>;
  updateWalletBalance(amount: number, operation: 'add' | 'subtract' | 'refund' | 'loyalty'): number;
  updateWalletLevel(): void;
  checkSpendingLimit(amount: number, period?: 'daily' | 'monthly'): boolean;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "staff"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Wallet fields
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },
    isWalletActive: {
      type: Boolean,
      default: true,
    },
    walletPin: {
      type: String,
      default: null,
      minlength: [4, "PIN must be at least 4 digits"],
      maxlength: [100, "PIN hash cannot be more than 100 characters"],
    },
    walletDailyLimit: {
      type: Number,
      default: 100000000, // 100 triệu VND/ngày
      min: [0, "Daily limit cannot be negative"],
    },
    walletMonthlyLimit: {
      type: Number,
      default: 500000000, // 500 triệu VND/tháng
      min: [0, "Monthly limit cannot be negative"],
    },
    totalSpentInWallet: {
      type: Number,
      default: 0,
      min: [0, "Total spent cannot be negative"],
    },
    totalTopupInWallet: {
      type: Number,
      default: 0,
      min: [0, "Total topup cannot be negative"],
    },
    walletLevel: {
      type: String,
      enum: ["bronze", "silver", "gold", "diamond"],
      default: "bronze",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Middleware hash password và walletPin trước khi lưu
userSchema.pre<IUser>('save', async function(next) {
  // Hash password nếu được thay đổi
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      return next(error);
    }
  }

  // Hash walletPin nếu được thay đổi
  if (this.isModified('walletPin') && this.walletPin) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.walletPin = await bcrypt.hash(this.walletPin, salt);
    } catch (error: any) {
      return next(error);
    }
  }

  next();
});

// Phương thức so sánh mật khẩu
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Phương thức so sánh wallet PIN
userSchema.methods.compareWalletPin = async function(candidatePin: string): Promise<boolean> {
  if (!this.walletPin) return false;
  return bcrypt.compare(candidatePin, this.walletPin);
};

// Phương thức cập nhật số dư ví
userSchema.methods.updateWalletBalance = function(amount: number, operation: 'add' | 'subtract' | 'refund' | 'loyalty'): number {
  if (operation === 'add') {
    this.walletBalance += amount;
    this.totalTopupInWallet += amount;
  } else if (operation === 'subtract') {
    this.walletBalance -= amount;
    this.totalSpentInWallet += amount;
  } else if (operation === 'refund') {
    this.walletBalance += amount;
    this.totalSpentInWallet -= amount; // ← Trừ totalSpentInWallet khi hoàn tiền
  } else if (operation === 'loyalty') {
    // Chỉ cập nhật totalSpentInWallet để tính loyalty points, KHÔNG ảnh hưởng walletBalance
    this.totalSpentInWallet += amount;
  }

  // Cập nhật cấp độ ví dựa trên tổng chi tiêu
  this.updateWalletLevel();

  return this.walletBalance;
};

// Phương thức cập nhật cấp độ ví
userSchema.methods.updateWalletLevel = function(): void {
  const totalSpent = this.totalSpentInWallet;

  if (totalSpent >= 100000000) { // 100 triệu VND
    this.walletLevel = 'diamond';
  } else if (totalSpent >= 50000000) { // 50 triệu VND
    this.walletLevel = 'gold';
  } else if (totalSpent >= 10000000) { // 10 triệu VND
    this.walletLevel = 'silver';
  } else {
    this.walletLevel = 'bronze';
  }
};

// Phương thức kiểm tra giới hạn chi tiêu
userSchema.methods.checkSpendingLimit = function(amount: number, period: 'daily' | 'monthly' = 'daily'): boolean {
  // Logic kiểm tra giới hạn (có thể implement với cache hoặc database riêng)
  // Ở đây đơn giản hóa
  if (period === 'daily') {
    return amount <= this.walletDailyLimit;
  } else {
    return amount <= this.walletMonthlyLimit;
  }
};

export default model<IUser>("User", userSchema);
