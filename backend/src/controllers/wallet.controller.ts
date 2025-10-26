import { Request, Response, NextFunction } from 'express';
import walletService from '../services/wallet.service';
import User from '../models/users.model';
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';

/**
 * Wallet Controller
 * Xử lý các API liên quan đến ví điện tử
 */

// Lấy thông tin ví của user
const getWalletInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const walletInfo = await walletService.getWalletInfo(user._id.toString());

    sendJsonSuccess(res, walletInfo, httpStatus.OK.statusCode, 'Wallet info retrieved successfully');
  } catch (error: any) {
    next(error);
  }
};

// Lấy lịch sử giao dịch ví
const getWalletTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await walletService.getWalletTransactions(
      user._id.toString(),
      parseInt(page as string),
      parseInt(limit as string)
    );

    sendJsonSuccess(res, transactions, httpStatus.OK.statusCode, 'Wallet transactions retrieved successfully');
  } catch (error: any) {
    next(error);
  }
};

// Nạp tiền vào ví
const topup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const { amount, paymentMethod, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid amount'
      });
    }

    if (!['stripe', 'vnpay', 'momo', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid payment method'
      });
    }

    const topupResult = await walletService.topup({
      userId: user._id.toString(),
      amount: amount,
      paymentMethod: paymentMethod,
      description: description || 'Nạp tiền vào ví điện tử'
    });

    sendJsonSuccess(res, topupResult, httpStatus.CREATED.statusCode, 'Topup initiated successfully');
  } catch (error: any) {
    next(error);
  }
};

// Xác nhận nạp tiền thành công
const confirmTopup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Payment intent ID is required'
      });
    }

    const confirmResult = await walletService.confirmTopup(paymentIntentId);

    sendJsonSuccess(res, confirmResult, httpStatus.OK.statusCode, 'Topup confirmed successfully');
  } catch (error: any) {
    next(error);
  }
};

// Thanh toán bằng ví
const payWithWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const { ticketId, amount, pin } = req.body;

    if (!ticketId || !amount) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Ticket ID and amount are required'
      });
    }

    // Kiểm tra vé có thuộc về user không
    const ticket = await import('../models/ticket.model');
    const Ticket = ticket.default;
    const ticketData = await Ticket.findById(ticketId);

    if (!ticketData) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Ticket not found'
      });
    }

    if (ticketData.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        statusCode: 403,
        message: 'You do not have permission to pay for this ticket'
      });
    }

    const paymentResult = await walletService.payWithWallet({
      userId: user._id.toString(),
      ticketId: ticketId,
      amount: amount,
      pin: pin
    });

    sendJsonSuccess(res, paymentResult, httpStatus.OK.statusCode, 'Payment completed successfully');
  } catch (error: any) {
    next(error);
  }
};

// Thiết lập PIN cho ví
const setWalletPin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const { pin, currentPin } = req.body;

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'PIN must be 4-6 digits'
      });
    }

    const result = await walletService.setWalletPin(user._id.toString(), pin, currentPin);

    sendJsonSuccess(res, result, httpStatus.OK.statusCode, 'Wallet PIN set successfully');
  } catch (error: any) {
    next(error);
  }
};

// Rút tiền từ ví
const withdraw = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;
    const { amount, bankAccount, pin } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid amount'
      });
    }

    if (!bankAccount || !bankAccount.bankName || !bankAccount.accountNumber || !bankAccount.accountHolder) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Bank account information is required'
      });
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Valid PIN is required'
      });
    }

    const result = await walletService.withdraw({
      userId: user._id.toString(),
      amount: amount,
      bankAccount: bankAccount,
      pin: pin
    });

    sendJsonSuccess(res, result, httpStatus.CREATED.statusCode, 'Withdrawal request submitted successfully');
  } catch (error: any) {
    next(error);
  }
};

// Kiểm tra số dư ví
const checkBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = res.locals.user;

    const userData = await User.findById(user._id);
    if (!userData) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found'
      });
    }

    sendJsonSuccess(res, {
      walletBalance: userData.walletBalance,
      isWalletActive: userData.isWalletActive,
      walletLevel: userData.walletLevel,
      canWithdraw: userData.walletBalance >= 50000 // Minimum withdrawal
    }, httpStatus.OK.statusCode, 'Balance retrieved successfully');
  } catch (error: any) {
    next(error);
  }
};

export default {
  getWalletInfo,
  getWalletTransactions,
  topup,
  confirmTopup,
  payWithWallet,
  setWalletPin,
  withdraw,
  checkBalance
};
