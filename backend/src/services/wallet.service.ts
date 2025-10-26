import User from '../models/users.model';
import WalletTransaction from '../models/walletTransaction.model';
import paymentService from './payment.service';
import emailService from './email.service';
import { sendJsonSuccess, sendJsonError } from '../helpers/response.helper';

interface TopupData {
  userId: string;
  amount: number;
  paymentMethod: 'stripe' | 'vnpay' | 'momo' | 'bank_transfer';
  description?: string;
}

interface WalletPaymentData {
  userId: string;
  ticketId: string;
  amount: number;
  pin?: string;
}

interface WithdrawalData {
  userId: string;
  amount: number;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  pin: string;
}

class WalletService {
  /**
   * Nạp tiền vào ví điện tử
   */
  async topup(data: TopupData) {
    try {
      const { userId, amount, paymentMethod, description = 'Nạp tiền vào ví điện tử' } = data;

      // Kiểm tra user tồn tại
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isWalletActive) {
        throw new Error('Wallet is not active');
      }

      // Kiểm tra giới hạn nạp tiền (có thể config)
      const maxTopupAmount = 50000000; // 50 triệu VND
      if (amount > maxTopupAmount) {
        throw new Error(`Amount exceeds maximum topup limit of ${maxTopupAmount.toLocaleString('vi-VN')} VND`);
      }

      let paymentResult;
      let transactionId = '';

      // Xử lý payment dựa trên phương thức
      if (paymentMethod === 'stripe') {
        paymentResult = await paymentService.createPaymentIntent({
          amount: amount,
          currency: 'vnd',
          ticketId: `wallet-${userId}-${Date.now()}`, // Tạo ticket ID giả
          customerEmail: user.email,
          description: description
        });
        transactionId = paymentResult.paymentIntentId;
      } else {
        // VNPay, MoMo - sẽ implement sau
        throw new Error('Payment method not implemented yet');
      }

      // Tạo wallet transaction record
      const walletTransaction = new WalletTransaction({
        userId: userId,
        type: 'topup',
        amount: amount,
        balanceAfter: user.walletBalance + amount,
        description: description,
        paymentMethod: paymentMethod,
        referenceId: transactionId,
        status: 'pending'
      });

      await walletTransaction.save();

      return {
        success: true,
        transactionId: walletTransaction._id,
        paymentIntentId: paymentResult?.paymentIntentId,
        clientSecret: paymentResult?.clientSecret,
        amount: amount,
        message: 'Topup initiated successfully'
      };

    } catch (error: any) {
      console.error('Wallet topup error:', error);
      throw error;
    }
  }

  /**
   * Xác nhận nạp tiền thành công
   */
  async confirmTopup(paymentIntentId: string) {
    try {
      // Tìm wallet transaction dựa trên paymentIntentId
      const walletTransaction = await WalletTransaction.findOne({
        referenceId: paymentIntentId,
        type: 'topup',
        status: 'pending'
      });

      if (!walletTransaction) {
        throw new Error('Topup transaction not found');
      }

      // Cập nhật transaction status
      walletTransaction.status = 'completed';
      await walletTransaction.save();

      // Cập nhật user wallet balance
      const user = await User.findById(walletTransaction.userId);
      if (user) {
        user.updateWalletBalance(walletTransaction.amount, 'add');
        await user.save();

        // Gửi email xác nhận
        await this.sendTopupConfirmationEmail(user, walletTransaction);

        return {
          success: true,
          transactionId: walletTransaction._id,
          newBalance: user.walletBalance,
          message: 'Topup confirmed successfully'
        };
      }

    } catch (error: any) {
      console.error('Confirm topup error:', error);
      throw error;
    }
  }

  /**
   * Thanh toán bằng ví điện tử
   */
  async payWithWallet(data: WalletPaymentData) {
    try {
      const { userId, ticketId, amount, pin } = data;

      // Kiểm tra user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isWalletActive) {
        throw new Error('Wallet is not active');
      }

      // Kiểm tra số dư
      if (user.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Kiểm tra PIN nếu có
      if (user.walletPin && pin) {
        const isPinValid = await user.compareWalletPin(pin);
        if (!isPinValid) {
          throw new Error('Invalid wallet PIN');
        }
      }

      // Kiểm tra giới hạn chi tiêu
      if (!user.checkSpendingLimit(amount, 'daily')) {
        throw new Error('Daily spending limit exceeded');
      }

      // Tạo wallet transaction
      const walletTransaction = new WalletTransaction({
        userId: userId,
        type: 'payment',
        amount: amount,
        balanceAfter: user.walletBalance - amount,
        description: `Thanh toán vé máy bay - ${ticketId}`,
        paymentMethod: 'wallet',
        referenceId: ticketId,
        status: 'completed'
      });

      await walletTransaction.save();

      // Cập nhật user balance
      user.updateWalletBalance(amount, 'subtract');
      await user.save();

      // Gửi email xác nhận
      await this.sendPaymentConfirmationEmail(user, walletTransaction);

      return {
        success: true,
        transactionId: walletTransaction._id,
        newBalance: user.walletBalance,
        message: 'Payment completed successfully'
      };

    } catch (error: any) {
      console.error('Wallet payment error:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin ví của user
   */
  async getWalletInfo(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Lấy lịch sử giao dịch gần đây
      const recentTransactions = await WalletTransaction.find({
        userId: userId
      })
      .sort({ createdAt: -1 })
      .limit(10);

      return {
        walletBalance: user.walletBalance,
        isWalletActive: user.isWalletActive,
        walletLevel: user.walletLevel,
        walletDailyLimit: user.walletDailyLimit,
        walletMonthlyLimit: user.walletMonthlyLimit,
        totalSpentInWallet: user.totalSpentInWallet,
        totalTopupInWallet: user.totalTopupInWallet,
        recentTransactions: recentTransactions
      };

    } catch (error: any) {
      console.error('Get wallet info error:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử giao dịch ví
   */
  async getWalletTransactions(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const transactions = await WalletTransaction.find({
        userId: userId
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const total = await WalletTransaction.countDocuments({
        userId: userId
      });

      return {
        transactions: transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };

    } catch (error: any) {
      console.error('Get wallet transactions error:', error);
      throw error;
    }
  }

  /**
   * Thiết lập hoặc thay đổi PIN ví
   */
  async setWalletPin(userId: string, pin: string, currentPin?: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Kiểm tra PIN hiện tại nếu đang thay đổi
      if (user.walletPin && currentPin) {
        const isCurrentPinValid = await user.compareWalletPin(currentPin);
        if (!isCurrentPinValid) {
          throw new Error('Current PIN is incorrect');
        }
      }

      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(pin)) {
        throw new Error('PIN must be 4-6 digits');
      }

      user.walletPin = pin;
      await user.save();

      return {
        success: true,
        message: 'Wallet PIN set successfully'
      };

    } catch (error: any) {
      console.error('Set wallet PIN error:', error);
      throw error;
    }
  }

  /**
   * Rút tiền từ ví về tài khoản ngân hàng
   */
  async withdraw(data: WithdrawalData) {
    try {
      const { userId, amount, bankAccount, pin } = data;

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isWalletActive) {
        throw new Error('Wallet is not active');
      }

      // Kiểm tra số dư
      if (user.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Kiểm tra PIN
      if (!user.walletPin) {
        throw new Error('Please set wallet PIN first');
      }

      const isPinValid = await user.compareWalletPin(pin);
      if (!isPinValid) {
        throw new Error('Invalid wallet PIN');
      }

      // Kiểm tra giới hạn rút tiền
      const minWithdrawal = 50000; // 50k VND
      const maxWithdrawal = 10000000; // 10 triệu VND

      if (amount < minWithdrawal) {
        throw new Error(`Minimum withdrawal amount is ${minWithdrawal.toLocaleString('vi-VN')} VND`);
      }

      if (amount > maxWithdrawal) {
        throw new Error(`Maximum withdrawal amount is ${maxWithdrawal.toLocaleString('vi-VN')} VND`);
      }

      // Tạo withdrawal transaction
      const walletTransaction = new WalletTransaction({
        userId: userId,
        type: 'withdrawal',
        amount: amount,
        balanceAfter: user.walletBalance - amount,
        description: `Rút tiền về ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
        paymentMethod: 'bank_transfer',
        referenceId: `withdraw-${Date.now()}`,
        status: 'pending',
        metadata: {
          bankAccount: bankAccount
        }
      });

      await walletTransaction.save();

      // Tạm thời trừ tiền (sẽ hoàn lại nếu admin từ chối)
      user.updateWalletBalance(amount, 'subtract');
      await user.save();

      // Gửi email thông báo
      await this.sendWithdrawalRequestEmail(user, walletTransaction);

      return {
        success: true,
        transactionId: walletTransaction._id,
        message: 'Withdrawal request submitted successfully. Processing time: 1-3 business days.'
      };

    } catch (error: any) {
      console.error('Wallet withdrawal error:', error);
      throw error;
    }
  }

  /**
   * Gửi email xác nhận nạp tiền
   */
  async sendTopupConfirmationEmail(user: any, transaction: any) {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">💰 Nạp tiền thành công!</h1>
              <p style="color: #6c757d; margin: 10px 0 0 0;">Ví điện tử của bạn đã được cộng tiền</p>
            </div>

            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #155724; margin-top: 0;">✅ Thông tin giao dịch</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 5px 0; color: #155724;"><strong>Số tiền:</strong> ${transaction.amount.toLocaleString('vi-VN')} VND</p>
                  <p style="margin: 5px 0; color: #155724;"><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p style="margin: 5px 0; color: #155724;"><strong>Số dư hiện tại:</strong> ${user.walletBalance.toLocaleString('vi-VN')} VND</p>
                  <p style="margin: 5px 0; color: #155724;"><strong>Cấp độ ví:</strong> ${user.walletLevel}</p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Cảm ơn bạn đã sử dụng dịch vụ ví điện tử!
              </p>
            </div>
          </div>
        </div>
      `;

      await emailService.sendEmail(
        user.email,
        `💰 Nạp tiền thành công - ${transaction.amount.toLocaleString('vi-VN')} VND`,
        emailContent
      );

    } catch (error) {
      console.error('Send topup confirmation email error:', error);
    }
  }

  /**
   * Gửi email xác nhận thanh toán
   */
  async sendPaymentConfirmationEmail(user: any, transaction: any) {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #007bff; margin: 0;">💳 Thanh toán thành công!</h1>
              <p style="color: #6c757d; margin: 10px 0 0 0;">Đã thanh toán bằng ví điện tử</p>
            </div>

            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h3 style="color: #2c3e50; margin-top: 0;">✅ Chi tiết thanh toán</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 5px 0; color: #495057;"><strong>Số tiền:</strong> ${transaction.amount.toLocaleString('vi-VN')} VND</p>
                  <p style="margin: 5px 0; color: #495057;"><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p style="margin: 5px 0; color: #495057;"><strong>Số dư còn lại:</strong> ${user.walletBalance.toLocaleString('vi-VN')} VND</p>
                  <p style="margin: 5px 0; color: #495057;"><strong>Cấp độ ví:</strong> ${user.walletLevel}</p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Chúc bạn có một chuyến bay tuyệt vời!
              </p>
            </div>
          </div>
        </div>
      `;

      await emailService.sendEmail(
        user.email,
        `💳 Thanh toán thành công - ${transaction.amount.toLocaleString('vi-VN')} VND`,
        emailContent
      );

    } catch (error) {
      console.error('Send payment confirmation email error:', error);
    }
  }

  /**
   * Gửi email yêu cầu rút tiền
   */
  async sendWithdrawalRequestEmail(user: any, transaction: any) {
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6f42c1; margin: 0;">💰 Yêu cầu rút tiền</h1>
              <p style="color: #6c757d; margin: 10px 0 0 0;">Yêu cầu của bạn đang được xử lý</p>
            </div>

            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">⏳ Đang xử lý</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p style="margin: 5px 0; color: #856404;"><strong>Số tiền:</strong> ${transaction.amount.toLocaleString('vi-VN')} VND</p>
                  <p style="margin: 5px 0; color: #856404;"><strong>Ngân hàng:</strong> ${transaction.metadata?.bankAccount?.bankName}</p>
                </div>
                <div>
                  <p style="margin: 5px 0; color: #856404;"><strong>Số tài khoản:</strong> ${transaction.metadata?.bankAccount?.accountNumber}</p>
                  <p style="margin: 5px 0; color: #856404;"><strong>Thời gian xử lý:</strong> 1-3 ngày làm việc</p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Chúng tôi sẽ xử lý yêu cầu của bạn trong thời gian sớm nhất!
              </p>
            </div>
          </div>
        </div>
      `;

      await emailService.sendEmail(
        user.email,
        `💰 Yêu cầu rút tiền - ${transaction.amount.toLocaleString('vi-VN')} VND`,
        emailContent
      );

    } catch (error) {
      console.error('Send withdrawal request email error:', error);
    }
  }
}

export default new WalletService();
