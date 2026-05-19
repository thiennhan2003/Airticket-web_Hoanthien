import createError from "http-errors";
import Flight from "../models/flight.model";
import ticketRoutes from "../router/v1/ticket.route";
import notificationService from "./notification.service";

/**
 * Service Flight:
 * - Nhận đầu vào từ controller
 * - Xử lý logic nghiệp vụ
 * - Trả dữ liệu về cho controller
 */

const getAll = async (query: any) => {
  const { page = 1, limit = 10 } = query;

  // Sắp xếp
  let sortObject: any = {};
  const sortType = query.sort_type || "desc";
  const sortBy = query.sort_by || "createdAt";
  sortObject = { ...sortObject, [sortBy]: sortType === "desc" ? -1 : 1 };

  // Điều kiện tìm kiếm nâng cao
  let where: any = {};

  if (query.route && query.route.length > 0) {
    const routeQuery = query.route;

    // Nếu route chứa dấu gạch ngang (VD: "Hà Nội - TP.HCM")
    if (routeQuery.includes('-')) {
      const [from, to] = routeQuery.split('-').map((s: string) => s.trim());
      where = {
        $or: [
          { route: { $regex: from, $options: "i" } },
          { route: { $regex: to, $options: "i" } }
        ]
      };
    }
    // Nếu route chứa dấu pipe (VD: "Hà Nội|TP.HCM") - tìm kiếm gần đúng
    else if (routeQuery.includes('|')) {
      const parts = routeQuery.split('|').map((s: string) => s.trim());
      where = {
        $and: parts.map((part: string) => ({
          route: { $regex: part, $options: "i" }
        }))
      };
    }
    // Tìm kiếm thông thường
    else {
      where = { route: { $regex: routeQuery, $options: "i" } };
    }
  }

  const flights = await Flight.find(where)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ ...sortObject });

  const count = await Flight.countDocuments(where);

  return {
    flights,
    pagination: {
      totalRecord: count,
      limit,
      page,
    },
  };
};

const getById = async (id: string) => {
  const flight = await Flight.findById(id);
  if (!flight) {
    throw createError(404, "Flight not found");
  }
  return flight;
};

const create = async (payload: any) => {
  // Kiểm tra trùng tuyến + giờ bay
  const exist = await Flight.findOne({
    route: payload.route,
    departureTime: payload.departureTime,
  });
  if (exist) {
    throw createError(400, "Flight with same route and departure time already exists");
  }

  // Kiểm tra flightCode đã tồn tại
  const existCode = await Flight.findOne({
    flightCode: payload.flightCode,
  });
  if (existCode) {
    throw createError(400, "Flight code already exists");
  }

  const flight = new Flight({
    flightCode: payload.flightCode,
    route: payload.route,
    departureTime: payload.departureTime,
    arrivalTime: payload.arrivalTime,
    totalSeats: payload.totalSeats,
    availableSeats: payload.availableSeats ?? payload.totalSeats,
    firstClassPrice: payload.firstClassPrice,
    businessPrice: payload.businessPrice,
    economyPrice: payload.economyPrice,
    // Lưu thời gian gốc để phát hiện thay đổi sau này
    originalDepartureTime: payload.departureTime,
    originalArrivalTime: payload.arrivalTime,
  });

  await flight.save();
  return flight;
};

const updateById = async (id: string, payload: any) => {
  const flight = await getById(id);
  if (!flight) throw createError(404, "Flight not found");

  // Ngăn tạo trùng chuyến
  const exist = await Flight.findOne({
    route: payload.route,
    departureTime: payload.departureTime,
    _id: { $ne: id },
  });
  if (exist) {
    throw createError(400, "Flight with same route and departure time already exists");
  }

  // Lọc field không rỗng
  const cleanUpdates = Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );

  // Lưu giờ cũ để so sánh
  const oldDepartureTime = flight.departureTime;
  const oldArrivalTime = flight.arrivalTime;

  // Cập nhật các field mới
  Object.assign(flight, cleanUpdates);
  await flight.save();

  // Kiểm tra xem có thay đổi thời gian không
  const hasTimeChange = cleanUpdates.departureTime || cleanUpdates.arrivalTime;

  if (hasTimeChange) {
    const isDifferent =
      new Date(oldDepartureTime).getTime() !== new Date(flight.departureTime).getTime() ||
      new Date(oldArrivalTime).getTime() !== new Date(flight.arrivalTime).getTime();

    if (isDifferent) {
      console.log(`🚨 Phát hiện thay đổi lịch bay: ${flight.flightCode}`);

      const changeData = {
        flightCode: flight.flightCode,
        route: flight.route,
        oldDepartureTime: oldDepartureTime,
        newDepartureTime: flight.departureTime,
        oldArrivalTime: oldArrivalTime,
        newArrivalTime: flight.arrivalTime,
        delayReason: flight.delayReason, // Thêm lý do delay
      };

      try {
        const success = await notificationService.sendFlightChangeNotification(changeData);
        if (success) {
          // Lưu lại giờ cũ làm mốc cho lần sau
          flight.originalDepartureTime = oldDepartureTime;
          flight.originalArrivalTime = oldArrivalTime;

          // Đánh dấu đã gửi thông báo
          flight.changeNotificationSent = true;

          // Reset reminder
          flight.checkinReminderSent = false;
          flight.checkinReminder2HSent = false;
          flight.realtimeCheckinSent = false;
          flight.boardingReminder1HSent = false;

          await flight.save();

          console.log(`✅ Đã gửi thông báo thay đổi lịch bay cho ${flight.flightCode}`);
          console.log(
            `🕒 Giờ cũ: ${oldDepartureTime.toISOString()} → Giờ mới: ${flight.departureTime.toISOString()}`
          );
        }
      } catch (error) {
        console.error(`❌ Lỗi gửi thông báo thay đổi lịch bay:`, error);
      }
    } else {
      console.log(`ℹ️ Thời gian bay không thay đổi thực tế, không gửi thông báo.`);
    }
  }

  return flight;
};


const getByFlightCode = async (flightCode: string) => {
  const flight = await Flight.findOne({ flightCode });
  if (!flight) {
    throw createError(404, "Flight not found");
  }
  return flight;
};

const deleteById = async (id: string) => {
  const flight = await getById(id);
  await flight.deleteOne({ _id: flight.id });
  return flight;
};

const resetNotificationStatus = async (id: string) => {
  const flight = await getById(id);

  // Reset các trạng thái thông báo
  await Flight.updateOne(
    { _id: flight._id },
    {
      $set: {
        changeNotificationSent: false,
        checkinReminderSent: false,
        checkinReminder2HSent: false,
        boardingReminder1HSent: false,
        realtimeCheckinSent: false
      }
    }
  );

  return { message: 'Notification status reset successfully' };
};

export default {
  getAll,
  getById,
  getByFlightCode,
  create,
  updateById,
  deleteById,
  resetNotificationStatus,
};
