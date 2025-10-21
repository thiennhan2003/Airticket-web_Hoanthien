import { NextFunction, Request, Response } from 'express';
import flightsService from "../services/flights.service";
import notificationService from "../services/notification.service";
import ticketsService from "../services/tickets.service";
import { sendJsonSuccess, httpStatus } from '../helpers/response.helper';
import Ticket from "../models/ticket.model";

/**
 * Controller Flight:
 * - Nhận request từ route
 * - Gọi service xử lý
 * - Trả dữ liệu response cho client
 * - Không viết logic nghiệp vụ ở controller
 */

// Get all flights
const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flights = await flightsService.getAll(req.query);
        sendJsonSuccess(res, flights, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Get flight by id
const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const flight = await flightsService.getById(id);
        sendJsonSuccess(res, flight, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Create flight
const Create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = req.body;
        const flight = await flightsService.create(payload);
        sendJsonSuccess(res, flight, httpStatus.CREATED.statusCode, httpStatus.CREATED.message);
    } catch (error) {
        next(error);
    }
};

// Update flight
const Update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const flight = await flightsService.updateById(id, payload);
        sendJsonSuccess(res, flight, httpStatus.OK.statusCode, httpStatus.OK.message);
    } catch (error) {
        next(error);
    }
};

// Delete flight
const Delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const flight = await flightsService.deleteById(id);
        res.status(204).json({
            flight,
            message: 'Flight deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Reset notification status để gửi lại thông báo
const resetNotificationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const flight = await flightsService.getById(id);

    await flightsService.resetNotificationStatus(id);
    sendJsonSuccess(res, { message: 'Đã reset trạng thái thông báo' }, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Test gửi email thông báo
const testEmailNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightCode } = req.params;

    // Tạo dữ liệu test thay đổi lịch bay
    const testChangeData = {
      flightCode: flightCode,
      route: "Test Route",
      oldDepartureTime: new Date(),
      newDepartureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Ngày mai
      oldArrivalTime: new Date(),
      newArrivalTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Ngày mai +1h
    };

    console.log('🧪 === TEST GỬI EMAIL THÔNG BÁO ===');
    console.log('📧 Test data:', testChangeData);

    const success = await notificationService.sendFlightChangeNotification(testChangeData);

    if (success) {
      sendJsonSuccess(res, {
        message: 'Test email gửi thành công!',
        testData: testChangeData
      }, httpStatus.OK.statusCode, 'Test email sent successfully');
    } else {
      sendJsonSuccess(res, {
        message: 'Test email gửi thất bại - kiểm tra log để xem lỗi',
        testData: testChangeData
      }, httpStatus.OK.statusCode, 'Test email failed');
    }
  } catch (error) {
    console.error('❌ Lỗi test email:', error);
    next(error);
  }
};

// Get flight by id with detailed info
const getByIdWithDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const flight = await flightsService.getById(id);

    // Lấy thêm thông tin về trạng thái thông báo
    const notificationStatus = {
      changeNotificationSent: (flight as any).changeNotificationSent || false,
      checkinReminderSent: (flight as any).checkinReminderSent || false,
      checkinReminder2HSent: (flight as any).checkinReminder2HSent || false,
      boardingReminder1HSent: (flight as any).boardingReminder1HSent || false,
      realtimeCheckinSent: (flight as any).realtimeCheckinSent || false
    };

    sendJsonSuccess(res, {
      flight,
      notificationStatus,
      hasTimeChange: flight.departureTime !== (flight as any).originalDepartureTime || flight.arrivalTime !== (flight as any).originalArrivalTime
    }, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Kiểm tra vé của chuyến bay
const checkFlightTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flightCode } = req.params;

    // Tìm flight ID từ flight code
    const flight = await flightsService.getByFlightCode(flightCode);
    if (!flight) {
      return sendJsonSuccess(res, {
        message: `Không tìm thấy chuyến bay với mã: ${flightCode}`,
        flightCode,
        tickets: [],
        ticketCount: 0
      }, httpStatus.OK.statusCode, 'Flight not found');
    }

    // Tìm tất cả vé của chuyến bay này
    const tickets = await ticketsService.getByFlightId(flight._id);

    console.log(`🎫 Kiểm tra vé cho chuyến bay ${flightCode}:`);
    console.log(`📊 Tổng số vé tìm thấy: ${tickets.length}`);

    if (tickets.length > 0) {
      tickets.forEach((ticket: any, index: number) => {
        console.log(`🎫 Vé ${index + 1}:`, {
          ticketCode: ticket.ticketCode,
          passengerName: ticket.passengerName,
          email: ticket.email,
          status: ticket.status,
          flightId: ticket.flightId
        });
      });
    }

    sendJsonSuccess(res, {
      message: tickets.length > 0 ? `Tìm thấy ${tickets.length} vé cho chuyến bay ${flightCode}` : `Không có vé nào cho chuyến bay ${flightCode}`,
      flightCode,
      flightId: flight._id,
      tickets: tickets.map(ticket => ({
        ticketCode: ticket.ticketCode,
        passengerName: ticket.passengerName,
        email: ticket.email,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus
      })),
      ticketCount: tickets.length
    }, httpStatus.OK.statusCode, 'Tickets checked successfully');
  } catch (error) {
    console.error('❌ Lỗi kiểm tra vé:', error);
    next(error);
  }
};

export default {
  getAll,
  getById,
  Create,
  Update,
  Delete,
  resetNotificationStatus,
  testEmailNotification,
  getByIdWithDetails,
  checkFlightTickets
};
