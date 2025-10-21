import { Request, Response, NextFunction } from 'express';
import ticketsService from '../services/tickets.service';
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';
import Flight from '../models/flight.model';
import emailService from '../services/email.service';

/**
 * Controller:
 * - Nhận request từ route
{{ ... }}
 * - Trả dữ liệu response cho client
 * - Không nên viết logic nghiệp vụ ở controller
 */

// Get all tickets
const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tickets = await ticketsService.getAll(req.query);
        sendJsonSuccess(res, tickets, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Get ticket by id
const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ticket = await ticketsService.getById(id);
        sendJsonSuccess(res, ticket, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Send booking success email
const sendBookingSuccessEmail = async (ticket: any) => {
  try {
    // Lấy thông tin flight đầy đủ để hiển thị trong email
    const flight = await Flight.findById(ticket.flightId);

    if (!flight) {
      console.error('Không tìm thấy thông tin chuyến bay cho vé:', ticket._id);
      return;
    }

    const paymentDeadline = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #28a745; margin: 0;">🎉 Đặt vé thành công!</h1>
            <p style="color: #6c757d; margin: 10px 0 0 0;">Vé máy bay của bạn đã sẵn sàng thanh toán</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${ticket.passengerName}!</h2>
            <p style="color: #495057; margin-bottom: 0;">
              Chúc mừng! Bạn đã đặt vé máy bay thành công. Vui lòng hoàn tất thanh toán để xác nhận vé của bạn.
            </p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #155724; margin-top: 0;">✅ Thông tin vé đã đặt</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Mã vé:</strong> ${ticket.ticketCode}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Họ tên:</strong> ${ticket.passengerName}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Email:</strong> ${ticket.email}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #155724;"><strong>Số điện thoại:</strong> ${ticket.phoneNumber}</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Số lượng:</strong> ${ticket.passengerCount || 1} hành khách</p>
                <p style="margin: 5px 0; color: #155724;"><strong>Tổng tiền:</strong> ${ticket.price?.toLocaleString('vi-VN')} VND</p>
              </div>
            </div>
          </div>

          ${flight ? `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Chuyến bay:</strong> ${flight.flightCode}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Tuyến bay:</strong> ${flight.route}</p>
              </div>
              <div>
                <p style="margin: 5px 0; color: #495057;"><strong>Khởi hành:</strong> ${flight.departureTime ? new Date(flight.departureTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                <p style="margin: 5px 0; color: #495057;"><strong>Đến nơi:</strong> ${flight.arrivalTime ? new Date(flight.arrivalTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
              </div>
            </div>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/payment/${ticket._id}" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3); transition: all 0.2s ease;">
              💳 Thanh toán ngay - ${ticket.price?.toLocaleString('vi-VN')} VND
            </a>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⏰ Hạn thanh toán:</strong> ${paymentDeadline.toLocaleString('vi-VN')}<br>
              <strong>💡 Lưu ý:</strong> Vé sẽ bị hủy tự động nếu không thanh toán trong vòng 1 giờ
            </p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>💡 Thông tin quan trọng:</strong><br>
              • Vui lòng hoàn tất thanh toán trong thời hạn để giữ vé<br>
              • Sau khi thanh toán, bạn sẽ nhận được email xác nhận<br>
              • Liên hệ chúng tôi nếu có thắc mắc về thanh toán
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              Cảm ơn bạn đã tin dùng dịch vụ của chúng tôi!
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
      `🎉 Đặt vé thành công - ${ticket.ticketCode}`,
      emailContent
    );

    console.log(`✅ Đã gửi email đặt vé đẹp cho ${ticket.email}`);
  } catch (error) {
    console.error('Lỗi gửi email đặt vé đẹp:', error);
    // Không throw error để không làm gián đoạn quá trình đặt vé
  }
};

// Create ticket
const Create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flightCode, passengerCount } = req.body;

        // ✅ Kiểm tra số ghế còn lại của chuyến bay
        const flight = await Flight.findOne({ flightCode });
        if (!flight) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Flight not found'
            });
        }

        // ✅ Kiểm tra số ghế còn lại có đủ cho số lượng hành khách không
        if (flight.availableSeats < passengerCount) {
            return res.status(400).json({
                statusCode: 400,
                message: `Not enough seats available. Available: ${flight.availableSeats}, Requested: ${passengerCount}`
            });
        }

        const payload = req.body;
        const ticket = await ticketsService.create(payload);

        // Send booking success email
        await sendBookingSuccessEmail(ticket);

        sendJsonSuccess(res, ticket, httpStatus.CREATED.statusCode, httpStatus.CREATED.message);
    } catch (error) {
        next(error);
    }
};

// Update ticket
const Update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const ticket = await ticketsService.updateById(id, payload);
        sendJsonSuccess(res, ticket, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Delete ticket
const Delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ticket = await ticketsService.deleteById(id);
        res.status(204).json({
            ticket,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Check-in ticket
const checkin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ticket = await ticketsService.checkin(id);
    sendJsonSuccess(res, ticket, httpStatus.OK.statusCode, "Check-in successful");
  } catch (error) {
    next(error);
  }
};

// Get ticket information from QR code
const getFromQRCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        statusCode: 400,
        message: 'QR code data is required'
      });
    }

    const ticket = await ticketsService.getByQRCode(qrData);
    sendJsonSuccess(res, ticket, httpStatus.OK.statusCode, 'Ticket information retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
    getAll,
    getById,
    Create,
    Update,
    Delete,
    checkin,
    getFromQRCode
};
