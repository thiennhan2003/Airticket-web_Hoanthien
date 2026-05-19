// notification.service.ts - Service xử lý thông báo về thay đổi lịch bay và nhắc nhở check-in
import Ticket from '../models/ticket.model';
import Flight from '../models/flight.model';
import emailService from './email.service';

/**
 * Notification Service:
 * - Gửi thông báo khi có thay đổi lịch bay
 * - Gửi nhắc nhở check-in trước giờ bay
 * - Tích hợp với email service hiện có
 */

interface FlightChangeData {
  flightCode: string;
  oldDepartureTime: Date;
  newDepartureTime: Date;
  oldArrivalTime: Date;
  newArrivalTime: Date;
  route: string;
  delayReason?: string; // Lý do delay khi thay đổi lịch bay
}

/**
 * Gửi thông báo thay đổi lịch bay đến tất cả hành khách
 */
const sendFlightChangeNotification = async (flightChangeData: FlightChangeData): Promise<boolean> => {
  try {
    console.log('🚨 === THÔNG BÁO THAY ĐỔI LỊCH BAY ===');
    console.log('✈️ Flight Code:', flightChangeData.flightCode);
    console.log('🛤️ Route:', flightChangeData.route);

    // Tìm tất cả vé của chuyến bay này
    const flightId = await getFlightIdByCode(flightChangeData.flightCode);
    if (!flightId) {
      console.log('❌ Không tìm thấy flight ID cho flight code:', flightChangeData.flightCode);
      return false;
    }

    console.log('🔍 Đã tìm thấy flight ID:', flightId);

    // Tìm tất cả vé còn hiệu lực của chuyến bay này (chưa hủy và đã thanh toán)
    const tickets = await Ticket.find({
      flightId: flightId,
      status: { $in: ['booked', 'checked-in'] }, // Chỉ vé còn hoạt động
      paymentStatus: 'paid' // Chỉ vé đã thanh toán
    }).populate('flightId');

    if (tickets.length === 0) {
      console.log('ℹ️ Không có vé nào còn hiệu lực (chưa hủy và đã thanh toán) cho chuyến bay này');
      return true;
    }

    console.log(`📧 Sẽ gửi thông báo đến ${tickets.length} hành khách`);

    // Kiểm tra thông tin vé đầu tiên để debug
    const firstTicket = tickets[0];
    console.log('🎫 Thông tin vé đầu tiên:', {
      ticketCode: firstTicket.ticketCode,
      passengerName: firstTicket.passengerName,
      email: firstTicket.email,
      flightId: firstTicket.flightId
    });

    // Gửi email cho từng hành khách
    const emailPromises = tickets.map(async (ticket, index) => {
      const flight = ticket.flightId as any;
      if (!flight) {
        console.log(`⚠️ Vé ${index + 1} không có thông tin flight`);
        return false;
      }

      console.log(`📨 Đang chuẩn bị gửi email cho hành khách ${index + 1}/${tickets.length}: ${ticket.passengerName} (${ticket.email})`);

      const emailContent = generateFlightChangeEmailContent({
        passengerName: ticket.passengerName,
        flightCode: flightChangeData.flightCode,
        route: flightChangeData.route,
        oldDepartureTime: flightChangeData.oldDepartureTime,
        newDepartureTime: flightChangeData.newDepartureTime,
        oldArrivalTime: flightChangeData.oldArrivalTime,
        newArrivalTime: flightChangeData.newArrivalTime,
        ticketCode: ticket.ticketCode,
        delayReason: flightChangeData.delayReason
      });

      console.log(`📨 Gọi emailService.sendEmail cho ${ticket.email}...`);
      const result = await emailService.sendEmail(
        ticket.email,
        '🚨 Thông báo thay đổi lịch bay - Flight Booking',
        emailContent.html,
        emailContent.text
      );

      if (result) {
        console.log(`✅ Đã gửi thành công cho ${ticket.passengerName} (${ticket.email})`);
      } else {
        console.log(`❌ Gửi thất bại cho ${ticket.passengerName} (${ticket.email})`);
      }

      return result;
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failCount = results.length - successCount;

    console.log(`📊 Tổng kết gửi email:`);
    console.log(`✅ Gửi thành công: ${successCount} email`);
    if (failCount > 0) {
      console.log(`❌ Gửi thất bại: ${failCount} email`);

      // Log chi tiết các email thất bại
      results.forEach((result, index) => {
        if (result.status === 'rejected' || result.value === false) {
          const ticket = tickets[index];
          console.log(`❌ Thất bại ${index + 1}: ${ticket.passengerName} (${ticket.email}) - ${result.status === 'rejected' ? (result as any).reason?.message || 'Unknown error' : 'Send failed'}`);
        }
      });
    }

    return failCount === 0; // Trả về true nếu tất cả đều thành công
  } catch (error) {
    console.error('❌ Lỗi gửi thông báo thay đổi lịch bay:', error);
    console.error('💡 Chi tiết lỗi:', (error as Error).message);
    return false;
  }
};

/**
 * Gửi nhắc nhở check-in đến hành khách
 */
const sendCheckinReminderNotification = async (flightCode: string, hoursBefore: number = 24): Promise<boolean> => {
  try {
    console.log('⏰ === NHẮC NHỞ CHECK-IN ===');
    console.log('✈️ Flight Code:', flightCode);
    console.log(`⏳ Nhắc nhở trước: ${hoursBefore} giờ`);

    // Tìm tất cả vé chưa check-in của chuyến bay này
    const tickets = await Ticket.find({
      flightId: await getFlightIdByCode(flightCode),
      status: { $ne: 'checked-in' }
    }).populate('flightId');

    if (tickets.length === 0) {
      console.log('ℹ️ Không có vé nào cần nhắc nhở check-in');
      return true;
    }

    console.log(`📧 Gửi nhắc nhở đến ${tickets.length} hành khách`);

    // Gửi email cho từng hành khách
    const emailPromises = tickets.map(async (ticket) => {
      const flight = ticket.flightId as any;
      if (!flight) return false;

      const emailContent = generateCheckinReminderEmailContent({
        passengerName: ticket.passengerName,
        flightCode: flightCode,
        route: flight.route,
        departureTime: flight.departureTime,
        hoursBefore,
        ticketCode: ticket.ticketCode,
        seatNumber: ticket.seatNumber
      });

      return await emailService.sendEmail(
        ticket.email,
        '⏰ Nhắc nhở Check-in - Flight Booking',
        emailContent.html,
        emailContent.text
      );
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failCount = results.length - successCount;

    console.log(`✅ Gửi thành công: ${successCount} email`);
    if (failCount > 0) {
      console.log(`❌ Gửi thất bại: ${failCount} email`);
    }

    return failCount === 0;
  } catch (error) {
    console.error('❌ Lỗi gửi nhắc nhở check-in:', error);
    return false;
  }
};

/**
 * Lấy flight ID từ flight code
 */
const getFlightIdByCode = async (flightCode: string) => {
  try {
    console.log('🔍 Đang tìm flight ID cho flight code:', flightCode);
    const flight = await Flight.findOne({ flightCode });
    if (flight) {
      console.log('✅ Tìm thấy flight:', flight._id, flight.flightCode);
      return flight._id;
    } else {
      console.log('❌ Không tìm thấy flight với flight code:', flightCode);
      return null;
    }
  } catch (error) {
    console.error('❌ Lỗi khi tìm flight ID:', error);
    return null;
  }
};

/**
 * Tạo nội dung email thông báo thay đổi lịch bay
 */
const generateFlightChangeEmailContent = (data: {
  passengerName: string;
  flightCode: string;
  route: string;
  oldDepartureTime: Date;
  newDepartureTime: Date;
  oldArrivalTime: Date;
  newArrivalTime: Date;
  ticketCode: string;
  delayReason?: string;
}) => {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🚨 Thông báo thay đổi lịch bay</h1>
          <p style="color: #7f8c8d; margin: 10px 0 0 0;">Flight Booking</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">Xin chào ${data.passengerName}!</h2>
          <p style="color: #856404; margin-bottom: 0;">
            Chúng tôi xin thông báo về việc thay đổi lịch trình chuyến bay của bạn. Vui lòng kiểm tra thông tin chi tiết bên dưới:
          </p>
          ${data.delayReason ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">📋 Lý do thay đổi:</h3>
            <p style="color: #856404; margin-bottom: 0; font-style: italic;">"${data.delayReason}"</p>
          </div>
          ` : ''}
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-top: 0;">📋 Thông tin chuyến bay</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã chuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.flightCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Tuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.route}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã vé:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.ticketCode}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-top: 0;">🔄 Thay đổi lịch trình</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6;"><strong>Giờ khởi hành (cũ):</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #e74c3c;">${formatDateTime(data.oldDepartureTime)}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6;"><strong>Giờ khởi hành (mới):</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #27ae60;">${formatDateTime(data.newDepartureTime)}</td>
            </tr>
            <tr style="background-color: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6;"><strong>Giờ đến (cũ):</strong></td>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #e74c3c;">${formatDateTime(data.oldArrivalTime)}</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 12px;"><strong>Giờ đến (mới):</strong></td>
              <td style="padding: 12px; color: #27ae60;">${formatDateTime(data.newArrivalTime)}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; margin-bottom: 20px;">
          <p style="color: #004085; margin: 0; font-size: 14px;">
            <strong>Lưu ý:</strong> Nếu bạn có bất kỳ câu hỏi nào về việc thay đổi lịch trình này, vui lòng liên hệ với chúng tôi qua hotline hoặc email hỗ trợ.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            Cảm ơn bạn đã chọn Flight Booking!
          </p>
          <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
            © 2025 Flight Booking. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    THÔNG BÁO THAY ĐỔI LỊCH BAY

    Xin chào ${data.passengerName}!

    Chúng tôi xin thông báo về việc thay đổi lịch trình chuyến bay của bạn:

    Thông tin chuyến bay:
    - Mã chuyến bay: ${data.flightCode}
    - Tuyến bay: ${data.route}
    - Mã vé: ${data.ticketCode}

    ${data.delayReason ? `Lý do thay đổi: "${data.delayReason}"\n` : ''}

    Thay đổi lịch trình:
    - Giờ khởi hành (cũ): ${formatDateTime(data.oldDepartureTime)}
    - Giờ khởi hành (mới): ${formatDateTime(data.newDepartureTime)}
    - Giờ đến (cũ): ${formatDateTime(data.oldArrivalTime)}
    - Giờ đến (mới): ${formatDateTime(data.newArrivalTime)}

    Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.

    Cảm ơn bạn đã chọn Flight Booking!
  `;

  return { html, text };
};

/**
 * Tạo nội dung email nhắc nhở check-in
 */
const generateCheckinReminderEmailContent = (data: {
  passengerName: string;
  flightCode: string;
  route: string;
  departureTime: Date;
  hoursBefore: number;
  ticketCode: string;
  seatNumber: string;
}) => {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #17a2b8; margin: 0;">⏰ Nhắc nhở Check-in</h1>
          <p style="color: #7f8c8d; margin: 10px 0 0 0;">Flight Booking</p>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          <h2 style="color: #155724; margin-top: 0;">Xin chào ${data.passengerName}!</h2>
          <p style="color: #155724; margin-bottom: 0;">
            Đây là lời nhắc nhở thân thiện để bạn hoàn tất thủ tục check-in cho chuyến bay sắp tới của mình.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-top: 0;">🎫 Thông tin chuyến bay</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã chuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.flightCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Tuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.route}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Giờ khởi hành:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${formatDateTime(data.departureTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã vé:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.ticketCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Số ghế:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.seatNumber}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; margin-bottom: 20px;">
          <p style="color: #004085; margin: 0; font-size: 14px;">
            <strong>⏰ Check-in ngay bây giờ!</strong><br>
            Quầy check-in sẽ mở trước giờ khởi hành ${data.hoursBefore} tiếng. Vui lòng có mặt tại sân bay và hoàn tất thủ tục check-in để đảm bảo chỗ ngồi của bạn.
          </p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Lưu ý:</strong> Mang theo giấy tờ tùy thân hợp lệ và mã vé khi đến quầy check-in.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            Chúc bạn có chuyến bay vui vẻ và an toàn!
          </p>
          <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
            © 2025 Flight Booking. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    NHẮC NHỞ CHECK-IN

    Xin chào ${data.passengerName}!

    Đây là lời nhắc nhở để bạn hoàn tất thủ tục check-in cho chuyến bay sắp tới:

    Thông tin chuyến bay:
    - Mã chuyến bay: ${data.flightCode}
    - Tuyến bay: ${data.route}
    - Giờ khởi hành: ${formatDateTime(data.departureTime)}
    - Mã vé: ${data.ticketCode}
    - Số ghế: ${data.seatNumber}

    Check-in ngay bây giờ! Quầy check-in sẽ mở trước giờ khởi hành ${data.hoursBefore} tiếng.

    Lưu ý: Mang theo giấy tờ tùy thân hợp lệ và mã vé khi đến quầy check-in.

    Chúc bạn có chuyến bay vui vẻ và an toàn!
  `;

  return { html, text };
};

/**
 * Tạo nội dung email thông báo real-time check-in
 */
const generateRealtimeCheckinEmailContent = (data: {
  passengerName: string;
  flightCode: string;
  route: string;
  departureTime: Date;
  ticketCode: string;
  seatNumber: string;
}) => {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin: 0;">🔔 Đã đến giờ Check-in!</h1>
          <p style="color: #7f8c8d; margin: 10px 0 0 0;">Flight Booking</p>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
          <h2 style="color: #155724; margin-top: 0;">Xin chào ${data.passengerName}!</h2>
          <p style="color: #155724; margin-bottom: 0;">
            <strong>🎉 Tuyệt vời!</strong> Quầy check-in cho chuyến bay của bạn đã mở cửa. Bạn có thể tiến hành thủ tục check-in ngay bây giờ.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã chuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.flightCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Tuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.route}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Giờ khởi hành:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${formatDateTime(data.departureTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã vé:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.ticketCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Số ghế:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.seatNumber}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; margin-bottom: 20px;">
          <p style="color: #004085; margin: 0; font-size: 14px;">
            <strong>⏰ Check-in ngay bây giờ!</strong><br>
            Quầy check-in đã mở cửa. Vui lòng có mặt tại sân bay và hoàn tất thủ tục check-in để đảm bảo chỗ ngồi của bạn.
          </p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Lưu ý:</strong> Mang theo giấy tờ tùy thân hợp lệ và mã vé khi đến quầy check-in.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            Chúc bạn có chuyến bay vui vẻ và an toàn!
          </p>
          <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
            Flight Booking
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    ĐÃ ĐẾN GIỜ CHECK-IN!

    Xin chào ${data.passengerName}!

    🎉 Tuyệt vời! Quầy check-in cho chuyến bay của bạn đã mở cửa.

    Thông tin chuyến bay:
    - Mã chuyến bay: ${data.flightCode}
    - Tuyến bay: ${data.route}
    - Giờ khởi hành: ${formatDateTime(data.departureTime)}
    - Mã vé: ${data.ticketCode}
    - Số ghế: ${data.seatNumber}

    ⏰ Check-in ngay bây giờ! Quầy check-in đã mở cửa.

    Lưu ý: Mang theo giấy tờ tùy thân hợp lệ và mã vé khi đến quầy check-in.

    Chúc bạn có chuyến bay vui vẻ và an toàn!
  `;

  return { html, text };
};

/**
 * Tạo nội dung email nhắc nhở lên máy bay
 */
const generateBoardingReminderEmailContent = (data: {
  passengerName: string;
  flightCode: string;
  route: string;
  departureTime: Date;
  hoursBefore: number;
  ticketCode: string;
  seatNumber: string;
}) => {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fd7e14; margin: 0;">🚶 Nhắc nhở lên máy bay</h1>
          <p style="color: #7f8c8d; margin: 10px 0 0 0;">Flight Booking</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">Xin chào ${data.passengerName}!</h2>
          <p style="color: #856404; margin-bottom: 0;">
            <strong>⏰ Chỉ còn ${data.hoursBefore} giờ nữa là chuyến bay cất cánh!</strong> Đây là lời nhắc nhở cuối cùng để bạn chuẩn bị lên máy bay.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã chuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.flightCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Tuyến bay:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.route}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Giờ khởi hành:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${formatDateTime(data.departureTime)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Mã vé:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.ticketCode}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #495057;"><strong>Số ghế:</strong></td>
              <td style="padding: 8px 0; color: #007bff;">${data.seatNumber}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8; margin-bottom: 20px;">
          <p style="color: #0c5460; margin: 0; font-size: 14px;">
            <strong>🚪 Cổng lên máy bay:</strong><br>
            Vui lòng có mặt tại cổng lên máy bay ít nhất 30 phút trước giờ khởi hành. Đừng quên mang theo vé máy bay và giấy tờ tùy thân hợp lệ.
          </p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin-bottom: 20px;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>✅ Những việc cần làm:</strong><br>
            • Kiểm tra thông tin chuyến bay<br>
            • Chuẩn bị giấy tờ tùy thân<br>
            • Đến sân bay đúng giờ<br>
            • Lên máy bay trước giờ khởi hành
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            Chúc bạn có chuyến bay vui vẻ và an toàn!
          </p>
          <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
            © 2025 Flight Booking. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
    NHẮC NHỞ LÊN MÁY BAY

    Xin chào ${data.passengerName}!

    ⏰ Chỉ còn ${data.hoursBefore} giờ nữa là chuyến bay cất cánh!

    Thông tin chuyến bay:
    - Mã chuyến bay: ${data.flightCode}
    - Tuyến bay: ${data.route}
    - Giờ khởi hành: ${formatDateTime(data.departureTime)}
    - Mã vé: ${data.ticketCode}
    - Số ghế: ${data.seatNumber}

    🚪 Cổng lên máy bay:
    Vui lòng có mặt tại cổng lên máy bay ít nhất 30 phút trước giờ khởi hành.
    Đừng quên mang theo vé máy bay và giấy tờ tùy thân hợp lệ.

    ✅ Những việc cần làm:
    • Kiểm tra thông tin chuyến bay
    • Chuẩn bị giấy tờ tùy thân
    • Đến sân bay đúng giờ
    • Lên máy bay trước giờ khởi hành

    Chúc bạn có chuyến bay vui vẻ và an toàn!
  `;

  return { html, text };
};

/**
 * Gửi nhắc nhở lên máy bay trước giờ khởi hành
 */
const sendBoardingReminderNotification = async (flightCode: string, hoursBefore: number = 1): Promise<boolean> => {
  try {
    console.log('🚶 === NHẮC NHỞ LÊN MÁY BAY ===');
    console.log('✈️ Flight Code:', flightCode);
    console.log(`⏳ Nhắc nhở trước: ${hoursBefore} giờ`);

    // Tìm tất cả vé chưa check-in của chuyến bay này
    const tickets = await Ticket.find({
      flightId: await getFlightIdByCode(flightCode),
      status: { $ne: 'checked-in' }
    }).populate('flightId');

    if (tickets.length === 0) {
      console.log('ℹ️ Không có vé nào cần nhắc nhở lên máy bay');
      return true;
    }

    console.log(`🚶 Gửi nhắc nhở lên máy bay đến ${tickets.length} hành khách`);

    // Gửi email cho từng hành khách
    const emailPromises = tickets.map(async (ticket) => {
      const flight = ticket.flightId as any;
      if (!flight) return false;

      const emailContent = generateBoardingReminderEmailContent({
        passengerName: ticket.passengerName,
        flightCode: flightCode,
        route: flight.route,
        departureTime: flight.departureTime,
        hoursBefore,
        ticketCode: ticket.ticketCode,
        seatNumber: ticket.seatNumber
      });

      return await emailService.sendEmail(
        ticket.email,
        '🚶 Nhắc nhở lên máy bay - Flight Booking',
        emailContent.html,
        emailContent.text
      );
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failCount = results.length - successCount;

    console.log(`✅ Gửi thành công: ${successCount} email`);
    if (failCount > 0) {
      console.log(`❌ Gửi thất bại: ${failCount} email`);
    }

    return failCount === 0;
  } catch (error) {
    console.error('❌ Lỗi gửi nhắc nhở lên máy bay:', error);
    return false;
  }
};

/**
 * Gửi thông báo real-time khi đến giờ check-in
 */
const sendRealtimeCheckinNotification = async (flightCode: string): Promise<boolean> => {
  try {
    console.log('🔔 === THÔNG BÁO CHECK-IN REAL-TIME ===');
    console.log('✈️ Flight Code:', flightCode);

    // Tìm tất cả vé chưa check-in của chuyến bay này
    const tickets = await Ticket.find({
      flightId: await getFlightIdByCode(flightCode),
      status: { $ne: 'checked-in' }
    }).populate('flightId');

    if (tickets.length === 0) {
      console.log('ℹ️ Không có vé nào cần thông báo check-in real-time');
      return true;
    }

    console.log(`🔔 Gửi thông báo real-time đến ${tickets.length} hành khách`);

    // Gửi email cho từng hành khách
    const emailPromises = tickets.map(async (ticket) => {
      const flight = ticket.flightId as any;
      if (!flight) return false;

      const emailContent = generateRealtimeCheckinEmailContent({
        passengerName: ticket.passengerName,
        flightCode: flightCode,
        route: flight.route,
        departureTime: flight.departureTime,
        ticketCode: ticket.ticketCode,
        seatNumber: ticket.seatNumber
      });

      return await emailService.sendEmail(
        ticket.email,
        '🔔 Đã đến giờ Check-in - Flight Booking',
        emailContent.html,
        emailContent.text
      );
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failCount = results.length - successCount;

    console.log(`✅ Gửi thành công: ${successCount} thông báo real-time`);
    if (failCount > 0) {
      console.log(`❌ Gửi thất bại: ${failCount} thông báo real-time`);
    }

    return failCount === 0;
  } catch (error) {
    console.error('❌ Lỗi gửi thông báo check-in real-time:', error);
    return false;
  }
};

/**
 * Gửi thông báo chung cho tất cả hành khách của một chuyến bay
 */
const sendBulkNotificationToFlightPassengers = async (
  flightCode: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> => {
  try {
    console.log('📢 === GỬI THÔNG BÁO HÀNG LOẠT ===');
    console.log('✈️ Flight Code:', flightCode);
    console.log('📧 Subject:', subject);

    // Tìm tất cả vé còn hiệu lực của chuyến bay này (chưa hủy và đã thanh toán)
    const tickets = await Ticket.find({
      flightId: await getFlightIdByCode(flightCode),
      status: { $in: ['booked', 'checked-in'] }, // Chỉ vé còn hoạt động
      paymentStatus: 'paid' // Chỉ vé đã thanh toán
    });

    if (tickets.length === 0) {
      console.log('ℹ️ Không có vé nào còn hiệu lực (chưa hủy và đã thanh toán) cho chuyến bay này');
      return true;
    }

    console.log(`📧 Gửi thông báo đến ${tickets.length} hành khách`);

    // Gửi email cho từng hành khách
    const emailPromises = tickets.map(ticket =>
      emailService.sendEmail(ticket.email, subject, htmlContent, textContent)
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value === true).length;
    const failCount = results.length - successCount;

    console.log(`✅ Gửi thành công: ${successCount} email`);
    if (failCount > 0) {
      console.log(`❌ Gửi thất bại: ${failCount} email`);
    }

    return failCount === 0;
  } catch (error) {
    console.error('❌ Lỗi gửi thông báo hàng loạt:', error);
    return false;
  }
};

export default {
  sendFlightChangeNotification,
  sendCheckinReminderNotification,
  sendBoardingReminderNotification,
  sendRealtimeCheckinNotification,
  sendBulkNotificationToFlightPassengers,
  getFlightIdByCode
};
