import createError from "http-errors";
import emailService from './email.service';
import Ticket from "../models/ticket.model";
import Flight from "../models/flight.model";
import seatLayoutService from "./seatLayout.service";
import { Types } from "mongoose";

/**
 * Service :
 * - Nhận đầu vào từ controller
 * - Xử lý logic
 * - Lấy dữ liệu về cho Controller
 */

const getAll = async (query: any) => {
  const { page = 1, limit = 10 } = query;

  // Sắp xếp
  let sortObject: any = {};
  const sortType = query.sort_type || "desc";
  const sortBy = query.sort_by || "createdAt";
  sortObject = { ...sortObject, [sortBy]: sortType === "desc" ? -1 : 1 };

  // Điều kiện tìm kiếm
  let where: any = {};
  if (query.flightCode && query.flightCode.length > 0) {
    // Tìm kiếm theo flight.flightCode thông qua populate
    const flights = await Flight.find({ flightCode: { $regex: query.flightCode, $options: "i" } });
    const flightIds = flights.map(f => f._id);
    where = {
      ...where,
      flightId: { $in: flightIds }
    };
  }

  // Lọc theo userId nếu có
  if (query.userId && query.userId.length > 0) {
    where = {
      ...where,
      userId: query.userId
    };
  }

  const tickets = await Ticket.find(where)
    .populate('flightId', 'flightCode route departureTime arrivalTime firstClassPrice businessPrice economyPrice availableSeats')
    .populate('userId', 'fullName email')
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ ...sortObject });

  const count = await Ticket.countDocuments(where);

  return {
    tickets,
    pagination: {
      totalRecord: count,
      limit,
      page,
    },
  };
};

const getById = async (id: string) => {
  const ticket = await Ticket.findById(id)
    
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }
  return ticket;
};

const create = async (payload: any) => {
  // Tìm flight theo flightCode
  const flight: any = await Flight.findOne({ flightCode: payload.flightCode });
  if (!flight) {
    throw createError(400, "Flight not found with code: " + payload.flightCode);
  }

  // Kiểm tra số chỗ còn trống
  if (flight.availableSeats < payload.passengerCount) {
    throw createError(400, "Not enough available seats on this flight");
  }

  // Sinh ticketCode auto
  const ticketCode = `${payload.flightCode}-${Date.now().toString().slice(-6)}`;

  // Kiểm tra trùng ticketCode
  const codeExist = await Ticket.findOne({ ticketCode });
  if (codeExist) {
    throw createError(400, "Ticket code already exists");
  }

  // Tạo ticket trước để có _id
  const ticket = new Ticket({
    ticketCode, // auto generate
    passengerName: payload.passengerName,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    flightId: flight._id, // Lưu ObjectId để join
    seatNumber: payload.seatNumbers ? payload.seatNumbers[0] : payload.seatNumber, // Ghế đầu tiên làm seatNumber chính
    seatNumbers: payload.seatNumbers || [payload.seatNumber], // Mảng ghế
    seatClasses: payload.seatClasses || [payload.ticketClass || 'economy'], // Mảng loại vé tương ứng với từng ghế
    ticketClass: payload.ticketClass || 'economy',
    price: payload.price,
    passengerCount: payload.passengerCount || 1,
    status: payload.status || "booked",
    // paymentDeadline sẽ được tự động tính toán dựa trên bookingDate
    userId: payload.userId, // ✅ Thêm userId vào ticket
  });

  // Nếu có seatNumbers, đặt ghế sau khi tạo vé
  if (payload.seatNumbers && payload.seatNumbers.length > 0) {
    try {
      await seatLayoutService.bookSeats(flight._id.toString(), payload.seatNumbers, ticket._id.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw createError(400, "Failed to book selected seats: " + errorMessage);
    }
  }

  // Giảm số chỗ trống
  flight.availableSeats -= payload.passengerCount || 1;
  await flight.save();

  await ticket.save();
  return ticket;
};

const updateById = async (id: string, payload: any) => {
  const ticket = await getById(id);

  // Nếu payload có ticketCode thì check trùng
  if (payload.ticketCode) {
    const codeExist = await Ticket.findOne({
      ticketCode: payload.ticketCode,
      _id: { $ne: id },
    });
    if (codeExist) {
      throw createError(400, "Ticket code already exists");
    }
  }

  const cleanUpdates = Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );

  Object.assign(ticket, cleanUpdates);
  await ticket.save();
  return ticket;
};

const deleteById = async (id: string) => {
  const ticket = await getById(id);

  // Luôn hoàn trả số chỗ khi xóa vé, bất kể trạng thái check-in
  const flight: any = await Flight.findById(ticket.flightId);
  if (flight) {
    flight.availableSeats += ticket.passengerCount || 1;
    await flight.save();
  }

  // Giải phóng ghế đã đặt
  if (ticket.seatNumbers && ticket.seatNumbers.length > 0) {
    try {
      await seatLayoutService.releaseSeats(ticket.flightId.toString(), ticket.seatNumbers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error releasing seats:", errorMessage);
    }
  }

  await ticket.deleteOne({ _id: ticket.id });
  return ticket;
};

const getByPaymentIntentId = async (paymentIntentId: string) => {
  const ticket = await Ticket.findOne({ paymentIntentId: paymentIntentId });
  return ticket;
};

const getByFlightId = async (flightId: Types.ObjectId) => {
  const tickets = await Ticket.find({ flightId }).populate('flightId');
  return tickets;
};

const checkin = async (id: string) => {
  const ticket = await getById(id);

  // Kiểm tra vé có tồn tại không
  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  // Kiểm tra trạng thái thanh toán
  if (ticket.paymentStatus !== 'paid') {
    throw createError(400, "Cannot check-in: Payment not completed");
  }

  // Kiểm tra trạng thái vé hiện tại
  if (ticket.status === 'checked-in') {
    throw createError(400, "Ticket already checked-in");
  }

  if (ticket.status === 'cancelled') {
    throw createError(400, "Cannot check-in: Ticket is cancelled");
  }

  // Lấy thông tin flight đầy đủ để tạo QR code
  const flight = await Flight.findById(ticket.flightId);
  if (!flight) {
    throw createError(404, "Flight not found");
  }

  // Tạo QR code data
  const qrData = {
    ticketCode: ticket.ticketCode,
    passengerName: ticket.passengerName,
    flightCode: flight.flightCode || 'N/A',
    seatNumber: ticket.seatNumber,
    departureTime: flight.departureTime || new Date(),
    checkinTime: new Date()
  };

  // Tạo QR code string (có thể dùng JSON.stringify hoặc format tùy chỉnh)
  const qrCodeString = JSON.stringify(qrData);

  // Cập nhật trạng thái vé và lưu QR code
  ticket.status = 'checked-in';
  ticket.qrCode = qrCodeString; // Lưu dưới dạng string để hiển thị

  await ticket.save();

  // Gửi email chứa mã QR sau khi check-in thành công
  try {
    // Tạo mã QR dạng base64 để gửi qua email
    const QRCode = require('qrcode');
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeString, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Chuyển buffer thành base64
    const qrCodeBase64 = qrCodeBuffer.toString('base64');

    // Gửi email chứa mã QR
    await emailService.sendQRCodeEmail(
      ticket.email,
      ticket.passengerName,
      ticket.ticketCode,
      qrCodeBase64,
      {
        flightCode: flight.flightCode || 'N/A',
        route: flight.route || 'N/A',
        departureTime: flight.departureTime || new Date()
      }
    );

    console.log('✅ Đã gửi email mã QR cho:', ticket.email);
  } catch (emailError) {
    console.error('❌ Lỗi gửi email mã QR:', emailError);
    // Không throw error vì check-in đã thành công, chỉ log lỗi gửi email
  }

  return ticket;
};

const getByQRCode = async (qrData: any) => {
  try {
    // Parse QR code data nếu là string
    let qrInfo;
    if (typeof qrData === 'string') {
      qrInfo = JSON.parse(qrData);
    } else {
      qrInfo = qrData;
    }

    // Tìm vé dựa trên thông tin trong QR code
    const ticket = await Ticket.findOne({
      ticketCode: qrInfo.ticketCode,
      status: 'checked-in'
    }).populate('flightId', 'flightCode route departureTime arrivalTime');

    if (!ticket) {
      throw createError(404, "Ticket not found or not checked-in");
    }

    // Kiểm tra thông tin có khớp không
    if (ticket.passengerName !== qrInfo.passengerName ||
        ticket.seatNumber !== qrInfo.seatNumber) {
      throw createError(400, "QR code information does not match ticket");
    }

    return ticket;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createError(400, "Invalid QR code format");
    }
    throw error;
  }
};

export default {
  getAll,
  getById,
  create,
  updateById,
  deleteById,
  getByPaymentIntentId,
  getByFlightId,
  checkin,
  getByQRCode,
};
