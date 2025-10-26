import { Request, Response, NextFunction } from 'express';
import paymentService from '../services/payment.service';
import walletService from '../services/wallet.service';
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';
import ticketsService from '../services/tickets.service';
import emailService from '../services/email.service';
import Flight from '../models/flight.model';
import WalletTransaction from '../models/walletTransaction.model';

/**
 * Payment Controller
 * Handles payment-related operations including creating payment intents,
 * confirming payments, and processing refunds
 */

// Create payment intent for ticket booking
const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId, amount, currency = 'usd', paymentMethod = 'stripe', pin } = req.body;

    // Validate ticket exists and belongs to user
    const ticket = await ticketsService.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Ticket not found'
      });
    }

    // Check if user owns the ticket
    const user = res.locals.user;

    if (!ticket.userId.equals(user._id)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'You do not have permission to pay for this ticket'
      });
    }

    let paymentResult;

    // Handle wallet payment
    if (paymentMethod === 'wallet') {
      try {
        // Kiểm tra số dư ví
        const walletInfo = await walletService.getWalletInfo(user._id.toString());

        if (walletInfo.walletBalance < amount) {
          return res.status(400).json({
            statusCode: 400,
            message: 'Insufficient wallet balance',
            requiredAmount: amount,
            currentBalance: walletInfo.walletBalance
          });
        }

        // Kiểm tra PIN nếu cần
        if (user.walletPin && !pin) {
          return res.status(400).json({
            statusCode: 400,
            message: 'Wallet PIN is required',
            requiresPin: true
          });
        }

        // Thực hiện thanh toán bằng ví
        paymentResult = await walletService.payWithWallet({
          userId: user._id.toString(),
          ticketId: ticketId,
          amount: amount,
          pin: pin
        });

        // Cập nhật ticket status
        await ticketsService.updateById(ticketId, {
          paymentStatus: 'paid',
          paymentMethod: 'wallet',
          paidAt: new Date()
        });

        // Lấy thông tin flight để gửi email
        const flight = await Flight.findById(ticket.flightId);

        // Gửi email xác nhận
        if (flight) {
          await sendWalletPaymentConfirmationEmail(user, ticket, flight, paymentResult.newBalance);
        }

        return sendJsonSuccess(res, {
          success: true,
          paymentMethod: 'wallet',
          amount: amount,
          newBalance: paymentResult.newBalance,
          message: 'Payment completed successfully with wallet'
        }, httpStatus.OK.statusCode, 'Payment completed successfully');

      } catch (walletError: any) {
        return res.status(400).json({
          statusCode: 400,
          message: walletError.message,
          paymentMethod: 'wallet'
        });
      }
    }

    // Handle traditional payment methods (Stripe, VNPay, MoMo)
    const paymentIntentData = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      ticketId: ticketId,
      customerEmail: user.email,
      description: `Flight ticket payment - ${ticketId} - ${ticket.passengerName}`
    };

    paymentResult = await paymentService.createPaymentIntent(paymentIntentData);

    // Update ticket with payment intent ID
    await ticketsService.updateById(ticketId, {
      paymentIntentId: paymentResult.paymentIntentId,
      paymentStatus: 'pending',
      paymentMethod: paymentMethod
    });

    sendJsonSuccess(res, paymentResult, httpStatus.CREATED.statusCode, 'Payment intent created successfully');
  } catch (error: any) {
    next(error);
  }
};

// Confirm payment after successful Stripe payment
const confirmPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId } = req.body;

    // Confirm payment with Stripe
    const paymentResult = await paymentService.confirmPayment(paymentIntentId);

    if (paymentResult.success) {
      // Get ticket by payment intent ID from metadata
      const paymentIntent = await paymentService.getPaymentDetails(paymentIntentId);

      // Update ticket status
      await ticketsService.updateById(paymentIntent.metadata.ticketId, {
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentMethod: 'stripe'
      });

      // Get updated ticket for email
      const ticket = await ticketsService.getById(paymentIntent.metadata.ticketId);

      // Send confirmation email
      if (ticket) {
        await sendPaymentConfirmationEmail(ticket, paymentIntent);
      }

      // Send success response
      res.status(200).json({
        statusCode: 200,
        message: 'Payment confirmed successfully',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          originalAmount: paymentIntent.metadata?.originalAmount,
          originalCurrency: paymentIntent.metadata?.originalCurrency,
          status: paymentIntent.status,
          ticketId: paymentIntent.metadata.ticketId
        }
      });
    } else {
      res.status(400).json({
        statusCode: 400,
        message: paymentResult.message,
        data: { status: paymentResult.status }
      });
    }
  } catch (error: any) {
    next(error);
  }
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (ticket: any, paymentIntent: any) => {
  try {
    const flight = await Flight.findById(ticket.flightId);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #28a745; margin: 0;">💳 Thanh toán thành công!</h1>
            <p style="color: #6c757d; margin: 10px 0 0 0;">Vé máy bay của bạn đã được xác nhận</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${ticket.passengerName}!</h2>
            <p style="color: #495057; margin-bottom: 0;">
              Chúng tôi rất vui thông báo rằng thanh toán của bạn đã được xử lý thành công!
              Vé máy bay của bạn hiện đã sẵn sàng để sử dụng.
            </p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Thông tin thanh toán</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã vé:</strong> ${ticket.ticketCode}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã thanh toán:</strong> ${paymentIntent.id}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Ngày thanh toán:</strong> ${new Date().toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Số tiền:</strong> ${parseFloat(paymentIntent.metadata?.originalAmount || '0').toLocaleString('vi-VN')} ${paymentIntent.metadata?.originalCurrency?.toUpperCase() || 'VND'}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Quy đổi:</strong> $${(paymentIntent.amount / 100 / 0.000043).toFixed(2)} USD</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Phương thức:</strong> ${ticket.paymentMethod || 'Thẻ tín dụng'}</p>
              </div>
            </div>
          </div>

          ${flight ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Chuyến bay:</strong> ${flight.flightCode || 'N/A'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Tuyến bay:</strong> ${flight.route || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Khởi hành:</strong> ${flight.departureTime ? new Date(flight.departureTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Đến nơi:</strong> ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
              </div>
            </div>
          </div>
          ` : ''}

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0;">📋 Thông tin hành khách</h4>
            <p style="color: #856404; margin: 5px 0;"><strong>Họ tên:</strong> ${ticket.passengerName}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${ticket.email}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Số điện thoại:</strong> ${ticket.phoneNumber}</p>
            ${ticket.seatNumbers ? `<p style="color: #856404; margin: 5px 0;"><strong>Ghế:</strong> ${ticket.seatNumbers.join(', ')}</p>` : ''}
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>💡 Lưu ý quan trọng:</strong><br>
              • Vui lòng đến sân bay trước 2 tiếng so với giờ khởi hành<br>
              • Mang theo giấy tờ tùy thân và vé điện tử<br>
              • Kiểm tra kỹ thông tin chuyến bay trước khi đi<br>
              • Liên hệ chúng tôi nếu có thay đổi
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              Chúc bạn có một chuyến bay an toàn và vui vẻ!
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
              © 2025 Flight Booking. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    await emailService.sendEmail(
      ticket.email,
      `✅ Thanh toán thành công - Vé máy bay ${ticket.ticketCode}`,
      emailContent
    );

    console.log(`✅ Đã gửi email xác nhận thanh toán đẹp cho ${ticket.email}`);
  } catch (error) {
    console.error('Lỗi gửi email xác nhận thanh toán đẹp:', error);
    // Không throw error để không làm gián đoạn thanh toán
  }
};

// Process refund for cancelled ticket
const processRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId, reason = 'Customer requested cancellation' } = req.body;
    console.log('🔄 Starting refund process for ticket:', ticketId);

    // Validate ticket exists and belongs to user
    const ticket = await ticketsService.getById(ticketId);
    if (!ticket) {
      console.error('❌ Ticket not found:', ticketId);
      return res.status(404).json({
        statusCode: 404,
        message: 'Ticket not found'
      });
    }
    console.log('✅ Ticket found:', ticket.ticketCode, 'Payment Status:', ticket.paymentStatus, 'Payment Method:', ticket.paymentMethod);

    // Check if user owns the ticket
    const user = res.locals.user;
    if (!ticket.userId.equals(user._id)) {
      console.error('❌ User does not own ticket:', { userId: user._id, ticketUserId: ticket.userId });
      return res.status(403).json({
        statusCode: 403,
        message: 'You do not have permission to refund this ticket'
      });
    }

    // Check if ticket is paid and refundable
    if (ticket.paymentStatus !== 'paid') {
      console.error('❌ Ticket not paid:', ticket.paymentStatus);
      return res.status(400).json({
        statusCode: 400,
        message: 'Only paid tickets can be refunded'
      });
    }

    let refundResult;

    // Handle wallet payment refund
    if (ticket.paymentMethod === 'wallet') {
      console.log('💰 Processing wallet refund...');

      // Tạo wallet transaction cho việc hoàn tiền
      const walletTransaction = new WalletTransaction({
        userId: user._id,
        type: 'refund',
        amount: ticket.price,
        balanceAfter: 0, // Sẽ cập nhật sau khi cộng tiền vào ví
        description: `Hoàn tiền vé máy bay ${ticket.ticketCode} - ${reason}`,
        paymentMethod: 'wallet',
        referenceId: ticketId,
        status: 'completed'
      });

      await walletTransaction.save();

      // Cộng tiền vào ví người dùng
      user.updateWalletBalance(ticket.price, 'add');
      await user.save();

      // Cập nhật balance trong transaction
      walletTransaction.balanceAfter = user.walletBalance;
      await walletTransaction.save();

      refundResult = {
        success: true,
        refundId: walletTransaction._id,
        amount: ticket.price,
        currency: 'vnd',
        status: 'completed',
        metadata: {
          originalAmount: ticket.price,
          originalCurrency: 'vnd'
        }
      };

      console.log('✅ Wallet refund processed successfully:', refundResult.refundId);
    } else {
      // Handle traditional payment methods (Stripe)
      if (!ticket.paymentIntentId) {
        console.error('❌ No payment intent ID found for ticket:', ticketId);
        return res.status(400).json({
          statusCode: 400,
          message: 'No payment information found for this ticket'
        });
      }
      console.log('✅ Payment intent ID found:', ticket.paymentIntentId);

      // Process refund with Stripe
      const refundData = {
        paymentIntentId: ticket.paymentIntentId,
        reason: reason
      };

      console.log('💳 Calling payment service refund...');
      refundResult = await paymentService.processRefund(refundData);
      console.log('✅ Refund processed successfully:', refundResult.refundId);
    }

    // Update ticket status
    await ticketsService.updateById(ticketId, {
      paymentStatus: 'refunded',
      status: 'cancelled',
      refundId: refundResult.refundId,
      refundedAt: new Date(),
      refundReason: reason
    });

    // ✅ TRẢ GHẾ NGỒI KHI HỦY VÉ
    try {
      // Hoàn trả ghế cho chuyến bay
      const flight: any = await Flight.findById(ticket.flightId);
      if (flight) {
        flight.availableSeats += ticket.passengerCount || 1;
        await flight.save();
        console.log(`✅ Đã hoàn trả ${ticket.passengerCount || 1} ghế cho chuyến bay ${flight.flightCode} khi hủy vé`);
      }

      // Giải phóng ghế đã đặt
      if (ticket.seatNumbers && ticket.seatNumbers.length > 0) {
        const seatLayoutService = await import('../services/seatLayout.service');
        await seatLayoutService.default.releaseSeats(ticket.flightId.toString(), ticket.seatNumbers);
        console.log(`✅ Đã giải phóng ${ticket.seatNumbers.length} ghế đã đặt cho vé ${ticket.ticketCode}`);
      }
    } catch (seatError) {
      console.error('❌ Lỗi khi trả ghế:', seatError);
      // Không throw error để không làm gián đoạn quá trình hoàn tiền
    }

    // Send refund confirmation email
    await sendRefundConfirmationEmail(ticket, refundResult);

    sendJsonSuccess(res, {
      refundId: refundResult.refundId,
      amount: refundResult.amount,
      currency: refundResult.currency,
      status: refundResult.status,
      ticketId: ticketId,
      paymentMethod: ticket.paymentMethod
    }, httpStatus.OK.statusCode, 'Refund processed successfully');
  } catch (error: any) {
    next(error);
  }
};

// Send refund confirmation email
const sendRefundConfirmationEmail = async (ticket: any, refundResult: any) => {
  try {
    const flight = await Flight.findById(ticket.flightId);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6f42c1; margin: 0;">💰 Hoàn tiền thành công!</h1>
            <p style="color: #6c757d; margin: 10px 0 0 0;">Yêu cầu hoàn tiền của bạn đã được xử lý</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${ticket.passengerName}!</h2>
            <p style="color: #495057; margin-bottom: 0;">
              Chúng tôi đã xử lý yêu cầu hoàn tiền của bạn thành công.
              Số tiền sẽ được hoàn lại vào tài khoản của bạn trong 5-10 ngày làm việc.
            </p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Thông tin hoàn tiền</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã vé:</strong> ${ticket.ticketCode}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã hoàn tiền:</strong> ${refundResult.refundId}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Ngày hoàn tiền:</strong> ${new Date().toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Số tiền hoàn lại:</strong> ${parseFloat(refundResult.metadata?.originalAmount || '0').toLocaleString('vi-VN')} ${refundResult.metadata?.originalCurrency?.toUpperCase() || 'VND'}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Quy đổi:</strong> $${(refundResult.amount / 100 / 0.000043).toFixed(2)} USD</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Lý do:</strong> ${ticket.refundReason || 'Không xác định'}</p>
              </div>
            </div>
          </div>

          ${flight ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay (Đã hủy)</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Chuyến bay:</strong> ${flight.flightCode || 'N/A'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Tuyến bay:</strong> ${flight.route || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Khởi hành:</strong> ${flight.departureTime ? new Date(flight.departureTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Đến nơi:</strong> ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
              </div>
            </div>
          </div>
          ` : ''}

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0;">📋 Thông tin hành khách</h4>
            <p style="color: #856404; margin: 5px 0;"><strong>Họ tên:</strong> ${ticket.passengerName}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${ticket.email}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Số điện thoại:</strong> ${ticket.phoneNumber}</p>
            ${ticket.seatNumbers ? `<p style="color: #856404; margin: 5px 0;"><strong>Ghế (Đã trả):</strong> ${ticket.seatNumbers.join(', ')}</p>` : ''}
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>💡 Thông tin quan trọng:</strong><br>
              • Số tiền sẽ được hoàn lại vào tài khoản gốc trong 5-10 ngày làm việc<br>
              • Vui lòng giữ lại mã hoàn tiền để theo dõi<br>
              • Nếu có thắc mắc, vui lòng liên hệ bộ phận chăm sóc khách hàng<br>
              • Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              Chúng tôi rất tiếc về sự bất tiện này và hy vọng được phục vụ bạn trong tương lai!
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
              © 2025 Flight Booking. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    await emailService.sendEmail(
      ticket.email,
      `💰 Hoàn tiền thành công - Vé máy bay ${ticket.ticketCode}`,
      emailContent
    );

    console.log(`✅ Đã gửi email xác nhận hoàn tiền đẹp cho ${ticket.email}`);
  } catch (error) {
    console.error('Lỗi gửi email xác nhận hoàn tiền đẹp:', error);
    // Không throw error để không làm gián đoạn quá trình hoàn tiền
  }
};

// Get payment status for a ticket
const getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId } = req.params;

    // Validate ticket exists and belongs to user
    const ticket = await ticketsService.getById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Ticket not found'
      });
    }

    // Check if user owns the ticket
    const user = res.locals.user;
    if (!ticket.userId.equals(user._id)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'You do not have permission to view this payment'
      });
    }

    let paymentDetails = null;
    if (ticket.paymentIntentId && ticket.paymentMethod !== 'wallet') {
      paymentDetails = await paymentService.getPaymentDetails(ticket.paymentIntentId);
    }

    sendJsonSuccess(res, {
      ticketId: ticket._id,
      paymentStatus: ticket.paymentStatus,
      paymentMethod: ticket.paymentMethod,
      paymentIntentId: ticket.paymentIntentId,
      refundId: ticket.refundId,
      paymentDetails: paymentDetails
    }, httpStatus.OK.statusCode, 'Payment status retrieved successfully');
  } catch (error: any) {
    next(error);
  }
};

// Send wallet payment confirmation email
const sendWalletPaymentConfirmationEmail = async (user: any, ticket: any, flight: any, newBalance: number) => {
  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0;">💳 Thanh toán thành công!</h1>
            <p style="color: #6c757d; margin: 10px 0 0 0;">Đã thanh toán bằng ví điện tử</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${ticket.passengerName}!</h2>
            <p style="color: #495057; margin-bottom: 0;">
              Thanh toán vé máy bay của bạn đã được xử lý thành công qua ví điện tử!
            </p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Thông tin thanh toán</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã vé:</strong> ${ticket.ticketCode}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Số tiền:</strong> ${ticket.price.toLocaleString('vi-VN')} VND</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Phương thức:</strong> Ví điện tử</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Số dư còn lại:</strong> ${newBalance.toLocaleString('vi-VN')} VND</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Ngày thanh toán:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Trạng thái:</strong> Hoàn thành</p>
              </div>
            </div>
          </div>

          ${flight ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Chuyến bay:</strong> ${flight.flightCode || 'N/A'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Tuyến bay:</strong> ${flight.route || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Khởi hành:</strong> ${flight.departureTime ? new Date(flight.departureTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Đến nơi:</strong> ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
              </div>
            </div>
          </div>
          ` : ''}

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0;">📋 Thông tin hành khách</h4>
            <p style="color: #856404; margin: 5px 0;"><strong>Họ tên:</strong> ${ticket.passengerName}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${ticket.email}</p>
            <p style="color: #856404; margin: 5px 0;"><strong>Số điện thoại:</strong> ${ticket.phoneNumber}</p>
            ${ticket.seatNumbers ? `<p style="color: #856404; margin: 5px 0;"><strong>Ghế:</strong> ${ticket.seatNumbers.join(', ')}</p>` : ''}
          </div>

          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8; margin-bottom: 20px;">
            <h4 style="color: #0c5460; margin-top: 0;">💡 Lưu ý</h4>
            <p style="color: #0c5460; margin: 5px 0; font-size: 14px;">
              • Vé của bạn đã sẵn sàng để sử dụng<br>
              • Vui lòng đến sân bay trước 2 tiếng<br>
              • Mang theo giấy tờ tùy thân<br>
              • Số dư ví còn lại: ${newBalance.toLocaleString('vi-VN')} VND
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              Chúc bạn có một chuyến bay an toàn và vui vẻ!
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
              © 2025 Flight Booking. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    await emailService.sendEmail(
      ticket.email,
      `💳 Thanh toán thành công - Vé máy bay ${ticket.ticketCode}`,
      emailContent
    );

    console.log(`✅ Đã gửi email xác nhận thanh toán ví cho ${ticket.email}`);
  } catch (error) {
    console.error('Lỗi gửi email xác nhận thanh toán ví:', error);
    // Không throw error để không làm gián đoạn thanh toán
  }
};

export default {
  createPaymentIntent,
  confirmPayment,
  processRefund,
  getPaymentStatus,
  sendWalletPaymentConfirmationEmail
};
