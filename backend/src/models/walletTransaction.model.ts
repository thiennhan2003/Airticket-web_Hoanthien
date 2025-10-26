import { Schema, model, Document } from "mongoose";

// Interface cho Wallet Transaction Document
export interface IWalletTransaction extends Document {
  userId: Schema.Types.ObjectId;
  type: "topup" | "payment" | "refund" | "withdrawal";
  amount: number;
  balanceAfter: number;
  description: string;
  paymentMethod?: string;
  referenceId?: string; // ticketId, paymentIntentId, hoặc withdrawalId
  status: "pending" | "completed" | "failed" | "cancelled";
  metadata?: {
    originalAmount?: number;
    originalCurrency?: string;
    exchangeRate?: number;
    fees?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: ["topup", "payment", "refund", "withdrawal"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be greater than 0"],
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      min: [0, "Balance cannot be negative"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "bank_transfer", "wallet"],
      default: null,
    },
    referenceId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    metadata: {
      originalAmount: Number,
      originalCurrency: String,
      exchangeRate: Number,
      fees: Number,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index để tối ưu query
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, userId: 1 });

export default model<IWalletTransaction>("WalletTransaction", walletTransactionSchema);
