// background-jobs.service.ts - Service xử lý các job chạy nền định kỳ
import * as cron from 'node-cron';
import Flight from '../models/flight.model';
import Ticket from '../models/ticket.model';
import notificationService from './notification.service';
import Verification from '../models/verification.model';
import emailService from './email.service';
import seatLayoutService from './seatLayout.service';

interface JobConfig {
  cronExpression: string;
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * Cấu hình các job định kỳ
 */
const JOB_CONFIGS: Record<string, JobConfig> = {
  CHECKIN_REMINDER: {
    cronExpression: '0 */6 * * *', // Mỗi 6 giờ
    name: 'Check-in Reminder Job',
    description: 'Kiểm tra và gửi nhắc nhở check-in cho các chuyến bay trong 24 giờ tới',
    enabled: true
  },
  CHECKIN_REMINDER_2H: {
    cronExpression: '0 * * * *', // Mỗi giờ
    name: 'Check-in Reminder 2H Job',
    description: 'Gửi nhắc nhở check-in bổ sung 2 giờ trước khi khởi hành',
    enabled: true
  },
  BOARDING_REMINDER_1H: {
    cronExpression: '0 * * * *', // Mỗi giờ
    name: 'Boarding Reminder 1H Job',
    description: 'Gửi nhắc nhở lên máy bay 1 giờ trước khi khởi hành',
    enabled: true
  },
  REALTIME_CHECKIN: {
    cronExpression: '*/15 * * * *', // Mỗi 15 phút
    name: 'Real-time Check-in Job',
    description: 'Kiểm tra và gửi thông báo khi đến đúng giờ check-in',
    enabled: true
  },
  FLIGHT_CHANGE_MONITOR: {
    cronExpression: '0 */12 * * *', // Mỗi 12 giờ
    name: 'Flight Change Monitor Job',
    description: 'Kiểm tra các chuyến bay có thay đổi gần đây và gửi thông báo',
    enabled: true
  },
  TICKET_EXPIRY_CHECK: {
    cronExpression: '0 */30 * * * *', // Mỗi 30 phút
    name: 'Ticket Expiry Check Job',
    description: 'Kiểm tra và hủy các vé quá hạn thanh toán chưa được thanh toán',
    enabled: true
  },
};

/**
 * Danh sách các job đang chạy
 */
const activeJobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Khởi tạo tất cả background jobs
 */
const initializeJobs = (): void => {
  console.log('🚀 === KHỞI TẠO BACKGROUND JOBS ===');

  Object.entries(JOB_CONFIGS).forEach(([jobKey, config]) => {
    if (!config.enabled) {
      console.log(`⏭️ Bỏ qua job: ${config.name} (đã tắt)`);
      return;
    }

    try {
      const job = cron.schedule(config.cronExpression, async () => {
        console.log(`\n🔄 === THỰC HIỆN JOB: ${config.name} ===`);
        console.log(`📅 Thời gian: ${new Date().toLocaleString('vi-VN')}`);

        await executeJob(jobKey);
      });

      activeJobs.set(jobKey, job);
      console.log(`✅ Đã khởi tạo job: ${config.name}`);
      console.log(`⏰ Cron: ${config.cronExpression}`);

    } catch (error) {
      console.error(`❌ Lỗi khởi tạo job ${config.name}:`, error);
    }
  });

  // Bắt đầu chạy tất cả các job
  activeJobs.forEach((job, jobKey) => {
    job.start();
    console.log(`▶️ Đã bắt đầu job: ${JOB_CONFIGS[jobKey].name}`);
  });

  console.log(`\n🎉 Đã khởi tạo xong ${activeJobs.size} background jobs`);
};

/**
 * Dừng tất cả background jobs
 */
const stopAllJobs = (): void => {
  console.log('🛑 === DỪNG TẤT CẢ BACKGROUND JOBS ===');

  activeJobs.forEach((job, jobKey) => {
    job.stop();
    console.log(`⏹️ Đã dừng job: ${JOB_CONFIGS[jobKey].name}`);
  });

  activeJobs.clear();
  console.log('✅ Đã dừng xong tất cả jobs');
};

/**
 * Thực hiện một job cụ thể
 */
const executeJob = async (jobKey: string): Promise<void> => {
  try {
    switch (jobKey) {
      case 'CHECKIN_REMINDER':
        await executeCheckinReminderJob();
        break;
      case 'CHECKIN_REMINDER_2H':
        await executeCheckinReminder2HJob();
        break;
      case 'BOARDING_REMINDER_1H':
        await executeBoardingReminder1HJob();
        break;
      case 'REALTIME_CHECKIN':
        await executeRealtimeCheckinJob();
        break;
      case 'FLIGHT_CHANGE_MONITOR':
        await executeFlightChangeMonitorJob();
        break;
      case 'TICKET_EXPIRY_CHECK':
        await executeTicketExpiryCheckJob();
        break;
      default:
        console.log(`⚠️ Không tìm thấy job: ${jobKey}`);
    }
  } catch (error) {
    console.error(`❌ Lỗi thực hiện job ${jobKey}:`, error);
  }
};

/**
 * Job: Gửi nhắc nhở check-in bổ sung 2 giờ trước
 */
const executeCheckinReminder2HJob = async (): Promise<void> => {
  try {
    console.log('⏰ === KIỂM TRA NHẮC NHỞ CHECK-IN 2H ===');

    // Tính thời gian trong 2 giờ tới
    const now = new Date();
    const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Tìm các chuyến bay khởi hành trong 2 giờ tới và chưa gửi nhắc nhở 2h
    const flights = await Flight.find({
      departureTime: {
        $gte: now,
        $lte: next2Hours
      }
    });

    console.log(`✈️ Tìm thấy ${flights.length} chuyến bay cần kiểm tra`);

    let totalReminders = 0;
    let successfulReminders = 0;

    for (const flight of flights) {
      try {
        // Kiểm tra xem đã gửi nhắc nhở 2h cho chuyến bay này chưa
        const hasSentReminder2H = (flight as any).checkinReminder2HSent;
        if (hasSentReminder2H) {
          console.log(`⏭️ Đã gửi nhắc nhở 2h cho chuyến bay ${flight.flightCode}, bỏ qua`);
          continue;
        }

        console.log(`📧 Gửi nhắc nhở 2h cho chuyến bay ${flight.flightCode}`);
        const success = await notificationService.sendCheckinReminderNotification(flight.flightCode, 2);

        if (success) {
          // Đánh dấu đã gửi nhắc nhở 2h
          await Flight.updateOne(
            { _id: flight._id },
            { $set: { checkinReminder2HSent: true } }
          );
          successfulReminders++;
        }
        totalReminders++;

        // Đợi 1 giây giữa các lần gửi để tránh bị rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi gửi nhắc nhở 2h cho chuyến bay ${flight.flightCode}:`, error);
      }
    }

    console.log(`📊 Kết quả: ${successfulReminders}/${totalReminders} nhắc nhở 2h gửi thành công`);

  } catch (error) {
    console.error('❌ Lỗi job nhắc nhở check-in 2h:', error);
  }
};

/**
 * Job: Gửi nhắc nhở lên máy bay 1 giờ trước
 */
const executeBoardingReminder1HJob = async (): Promise<void> => {
  try {
    console.log('🚶 === KIỂM TRA NHẮC NHỞ LÊN MÁY BAY 1H ===');

    // Tính thời gian trong 1 giờ tới
    const now = new Date();
    const next1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    // Tìm các chuyến bay khởi hành trong 1 giờ tới và chưa gửi nhắc nhở lên máy bay
    const flights = await Flight.find({
      departureTime: {
        $gte: now,
        $lte: next1Hour
      }
    });

    console.log(`✈️ Tìm thấy ${flights.length} chuyến bay cần kiểm tra`);

    let totalReminders = 0;
    let successfulReminders = 0;

    for (const flight of flights) {
      try {
        // Kiểm tra xem đã gửi nhắc nhở lên máy bay cho chuyến bay này chưa
        const hasSentBoardingReminder = (flight as any).boardingReminder1HSent;
        if (hasSentBoardingReminder) {
          console.log(`⏭️ Đã gửi nhắc nhở lên máy bay cho chuyến bay ${flight.flightCode}, bỏ qua`);
          continue;
        }

        console.log(`🚶 Gửi nhắc nhở lên máy bay cho chuyến bay ${flight.flightCode}`);
        const success = await notificationService.sendBoardingReminderNotification(flight.flightCode, 1);

        if (success) {
          // Đánh dấu đã gửi nhắc nhở lên máy bay
          await Flight.updateOne(
            { _id: flight._id },
            { $set: { boardingReminder1HSent: true } }
          );
          successfulReminders++;
        }
        totalReminders++;

        // Đợi 1 giây giữa các lần gửi để tránh bị rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi gửi nhắc nhở lên máy bay cho chuyến bay ${flight.flightCode}:`, error);
      }
    }

    console.log(`📊 Kết quả: ${successfulReminders}/${totalReminders} nhắc nhở lên máy bay gửi thành công`);

  } catch (error) {
    console.error('❌ Lỗi job nhắc nhở lên máy bay:', error);
  }
};

/**
 * Job: Kiểm tra và gửi thông báo real-time khi đến giờ check-in
 */
const executeRealtimeCheckinJob = async (): Promise<void> => {
  try {
    console.log('🔔 === KIỂM TRA CHECK-IN REAL-TIME ===');

    // Tính thời gian hiện tại (check-in thường mở 24h trước)
    const now = new Date();
    const checkinStartTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Tìm các chuyến bay có thời gian khởi hành từ bây giờ trở đi và check-in đã mở
    const flights = await Flight.find({
      departureTime: {
        $gte: now,
        $lte: new Date(now.getTime() + 30 * 60 * 1000) // Trong 30 phút tới
      }
    });

    console.log(`✈️ Tìm thấy ${flights.length} chuyến bay có thể check-in`);

    let totalNotifications = 0;
    let successfulNotifications = 0;

    for (const flight of flights) {
      try {
        // Kiểm tra xem check-in đã mở chưa và đã gửi thông báo chưa
        const hasSentRealTimeNotification = (flight as any).realtimeCheckinSent;
        if (hasSentRealTimeNotification) {
          console.log(`⏭️ Đã gửi thông báo real-time cho chuyến bay ${flight.flightCode}, bỏ qua`);
          continue;
        }

        console.log(`🔔 Gửi thông báo real-time check-in cho chuyến bay ${flight.flightCode}`);
        const success = await notificationService.sendRealtimeCheckinNotification(flight.flightCode);

        if (success) {
          // Đánh dấu đã gửi thông báo real-time
          await Flight.updateOne(
            { _id: flight._id },
            { $set: { realtimeCheckinSent: true } }
          );
          successfulNotifications++;
        }
        totalNotifications++;

        // Đợi 1 giây giữa các lần gửi
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi gửi thông báo real-time cho chuyến bay ${flight.flightCode}:`, error);
      }
    }

    console.log(`📊 Kết quả: ${successfulNotifications}/${totalNotifications} thông báo real-time gửi thành công`);

  } catch (error) {
    console.error('❌ Lỗi job real-time check-in:', error);
  }
};

/**
 * Job: Gửi nhắc nhở check-in
 */
const executeCheckinReminderJob = async (): Promise<void> => {
  try {
    console.log('⏰ === KIỂM TRA NHẮC NHỞ CHECK-IN ===');

    // Tính thời gian trong 24 giờ tới
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tìm các chuyến bay khởi hành trong 24 giờ tới và chưa gửi nhắc nhở
    const flights = await Flight.find({
      departureTime: {
        $gte: now,
        $lte: next24Hours
      }
    });

    console.log(`✈️ Tìm thấy ${flights.length} chuyến bay cần kiểm tra`);

    let totalReminders = 0;
    let successfulReminders = 0;

    for (const flight of flights) {
      try {
        // Kiểm tra xem đã gửi nhắc nhở cho chuyến bay này chưa (có thể lưu trong flight document)
        const hasSentReminder = (flight as any).checkinReminderSent;
        if (hasSentReminder) {
          console.log(`⏭️ Đã gửi nhắc nhở cho chuyến bay ${flight.flightCode}, bỏ qua`);
          continue;
        }

        console.log(`📧 Gửi nhắc nhở cho chuyến bay ${flight.flightCode}`);
        const success = await notificationService.sendCheckinReminderNotification(flight.flightCode);

        if (success) {
          // Đánh dấu đã gửi nhắc nhở (có thể cần cập nhật schema)
          await Flight.updateOne(
            { _id: flight._id },
            { $set: { checkinReminderSent: true } }
          );
          successfulReminders++;
        }
        totalReminders++;

        // Đợi 1 giây giữa các lần gửi để tránh bị rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi gửi nhắc nhở cho chuyến bay ${flight.flightCode}:`, error);
      }
    }

    console.log(`📊 Kết quả: ${successfulReminders}/${totalReminders} nhắc nhở gửi thành công`);

  } catch (error) {
    console.error('❌ Lỗi job nhắc nhở check-in:', error);
  }
};

/**
 * Job: Kiểm tra thay đổi lịch bay
 */
const executeFlightChangeMonitorJob = async (): Promise<void> => {
  try {
    console.log('🔍 === KIỂM TRA THAY ĐỔI LỊCH BAY ===');

    // Tính thời gian trong 48 giờ qua (để phát hiện thay đổi gần đây)
    const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Tìm các chuyến bay có thay đổi gần đây và chưa gửi thông báo
    const flights = await Flight.find({
      updatedAt: { $gte: last48Hours }
    });

    console.log(`✈️ Tìm thấy ${flights.length} chuyến bay có thay đổi`);

    let totalNotifications = 0;
    let successfulNotifications = 0;

    for (const flight of flights) {
      try {
        // Kiểm tra xem đã gửi thông báo thay đổi cho chuyến bay này chưa
        const hasSentNotification = (flight as any).changeNotificationSent;
        if (hasSentNotification) {
          console.log(`⏭️ Đã gửi thông báo cho chuyến bay ${flight.flightCode}, bỏ qua`);
          continue;
        }

        // Kiểm tra xem có sự khác biệt về thời gian không (chỉ kiểm tra nếu chưa gửi thông báo)
        if (!(flight as any).originalDepartureTime && !(flight as any).originalArrivalTime) {
          console.log(`⏭️ Chuyến bay ${flight.flightCode} chưa có thay đổi, bỏ qua`);
          continue;
        }

        console.log(`🚨 Phát hiện thay đổi lịch bay: ${flight.flightCode}`);

        const changeData = {
          flightCode: flight.flightCode,
          route: flight.route,
          oldDepartureTime: (flight as any).originalDepartureTime || flight.departureTime,
          newDepartureTime: flight.departureTime,
          oldArrivalTime: (flight as any).originalArrivalTime || flight.arrivalTime,
          newArrivalTime: flight.arrivalTime
        };

        const success = await notificationService.sendFlightChangeNotification(changeData);

        if (success) {
          // Đánh dấu đã gửi thông báo
          await Flight.updateOne(
            { _id: flight._id },
            { $set: { changeNotificationSent: true } }
          );
          successfulNotifications++;
        }
        totalNotifications++;

        // Đợi 1 giây giữa các lần gửi
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi xử lý chuyến bay ${flight.flightCode}:`, error);
      }
    }

    console.log(`📊 Kết quả: ${successfulNotifications}/${totalNotifications} thông báo gửi thành công`);

  } catch (error) {
    console.error('❌ Lỗi job kiểm tra thay đổi lịch bay:', error);
  }
};

const executeTicketExpiryCheckJob = async (): Promise<void> => {
  try {
    console.log('⏰ === KIỂM TRA VÉ HẾT HẠN THANH TOÁN ===');
    console.log('🔍 Đang tìm các vé có trạng thái pending và đã quá hạn thanh toán...');

    const now = new Date();

    // Tìm các vé có trạng thái pending và đã quá hạn thanh toán
    const expiredTickets = await Ticket.find({
      paymentStatus: 'pending',
      paymentDeadline: { $lt: now }
    }).populate('flightId');

    console.log(`🎫 Tìm thấy ${expiredTickets.length} vé hết hạn thanh toán`);
    console.log(`📅 Thời gian hiện tại: ${now.toLocaleString('vi-VN')}`);

    if (expiredTickets.length === 0) {
      console.log('✅ Không có vé nào hết hạn thanh toán');
      return;
    }

    let cancelledCount = 0;
    let errorCount = 0;
    let emailSuccessCount = 0;
    let emailErrorCount = 0;

    for (const ticket of expiredTickets) {
      try {
        console.log(`\n🚫 === XỬ LÝ VÉ HẾT HẠN: ${ticket.ticketCode} ===`);
        console.log(`👤 Hành khách: ${ticket.passengerName}`);
        console.log(`📧 Email: ${ticket.email}`);
        console.log(`⏰ Hạn thanh toán: ${ticket.paymentDeadline.toLocaleString('vi-VN')}`);
        console.log(`🔄 Thời gian quá hạn: ${Math.floor((now.getTime() - ticket.paymentDeadline.getTime()) / (1000 * 60))} phút`);

        // Cập nhật trạng thái vé thành cancelled
        await Ticket.updateOne(
          { _id: ticket._id },
          {
            $set: {
              status: 'cancelled',
              paymentStatus: 'failed',
              cancelledAt: now,
              cancelReason: 'Quá hạn thanh toán (1 giờ)'
            }
          }
        );
        console.log(`✅ Đã cập nhật trạng thái vé thành cancelled`);

        // Hoàn trả ghế cho chuyến bay
        if (ticket.flightId && typeof ticket.flightId === 'object' && 'flightCode' in ticket.flightId) {
          const flight = ticket.flightId as any;
          console.log(`✈️ Hoàn trả ghế cho chuyến bay: ${flight.flightCode}`);

          await Flight.updateOne(
            { _id: flight._id },
            { $inc: { availableSeats: ticket.passengerCount || 1 } }
          );
          console.log(`✅ Đã hoàn trả ${ticket.passengerCount || 1} ghế cho chuyến bay ${flight.flightCode}`);

          // Giải phóng ghế cụ thể đã đặt
          if (ticket.seatNumbers && ticket.seatNumbers.length > 0) {
            try {
              await seatLayoutService.releaseSeats(flight._id.toString(), ticket.seatNumbers);
              console.log(`✅ Đã giải phóng ghế ${ticket.seatNumbers.join(', ')} cho chuyến bay ${flight.flightCode}`);
            } catch (error) {
              console.error(`❌ Lỗi giải phóng ghế ${ticket.seatNumbers.join(', ')}:`, error);
            }
          }
        }

        // Gửi email thông báo hủy vé
        try {
          console.log(`📧 Đang gửi email thông báo hủy vé cho ${ticket.email}...`);

          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #dc3545; margin: 0;">⏰ Thông báo hủy vé máy bay</h1>
                  <p style="color: #6c757d; margin: 10px 0 0 0;">Vé máy bay của bạn đã bị hủy do quá hạn thanh toán</p>
                </div>

                <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                  <h2 style="color: #721c24; margin-top: 0;">Kính gửi ${ticket.passengerName}!</h2>
                  <p style="color: #721c24; margin-bottom: 0;">
                    Chúng tôi rất tiếc phải thông báo rằng vé máy bay của bạn đã bị hủy tự động do quá hạn thanh toán.
                  </p>
                </div>

                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #856404; margin-top: 0;">📋 Thông tin vé đã hủy</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                      <p style="margin: 5px 0; color: #856404;"><strong>Mã vé:</strong> ${ticket.ticketCode}</p>
                      <p style="margin: 5px 0; color: #856404;"><strong>Họ tên:</strong> ${ticket.passengerName}</p>
                      <p style="margin: 5px 0; color: #856404;"><strong>Email:</strong> ${ticket.email}</p>
                    </div>
                    <div>
                      <p style="margin: 5px 0; color: #856404;"><strong>Số điện thoại:</strong> ${ticket.phoneNumber}</p>
                      <p style="margin: 5px 0; color: #856404;"><strong>Lý do hủy:</strong> Quá hạn thanh toán (1 giờ)</p>
                      <p style="margin: 5px 0; color: #856404;"><strong>Ngày hủy:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                </div>

                ${ticket.flightId && typeof ticket.flightId === 'object' && 'flightCode' in ticket.flightId ? `
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #2c3e50; margin-top: 0;">✈️ Thông tin chuyến bay (Đã hủy)</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                      <p style="margin: 5px 0; color: #495057;"><strong>Chuyến bay:</strong> ${(ticket.flightId as any).flightCode || 'N/A'}</p>
                      <p style="margin: 5px 0; color: #495057;"><strong>Tuyến bay:</strong> ${(ticket.flightId as any).route || 'N/A'}</p>
                    </div>
                    <div>
                      <p style="margin: 5px 0; color: #495057;"><strong>Khởi hành:</strong> ${(ticket.flightId as any).departureTime ? new Date((ticket.flightId as any).departureTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                      <p style="margin: 5px 0; color: #495057;"><strong>Đến nơi:</strong> ${(ticket.flightId as any).arrivalTime ? new Date((ticket.flightId as any).arrivalTime).toLocaleString('vi-VN') : 'Chưa xác định'}</p>
                    </div>
                  </div>
                  ${ticket.seatNumbers ? `<p style="margin: 5px 0; color: #495057;"><strong>Ghế (Đã trả):</strong> ${ticket.seatNumbers.join(', ')}</p>` : ''}
                </div>
                ` : ''}

                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8; margin-bottom: 20px;">
                  <h4 style="color: #0c5460; margin-top: 0;">💡 Thông tin quan trọng</h4>
                  <p style="color: #0c5460; margin: 5px 0;"><strong>✅ Ghế đã được hoàn trả:</strong> Tất cả ghế ngồi đã được trả về hệ thống và có sẵn cho đặt vé mới</p>
                  <p style="color: #0c5460; margin: 5px 0;"><strong>🔄 Đặt vé mới:</strong> Bạn có thể đặt vé mới bất cứ lúc nào với thông tin chuyến bay tương tự</p>
                  <p style="color: #0c5460; margin: 5px 0;"><strong>📞 Hỗ trợ:</strong> Nếu bạn cần hỗ trợ, vui lòng liên hệ bộ phận chăm sóc khách hàng</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/flights" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); transition: all 0.2s ease;">
                    🔍 Tìm chuyến bay mới
                  </a>
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

          const emailSent = await emailService.sendEmail(
            ticket.email,
            `⏰ Thông báo hủy vé máy bay - ${ticket.ticketCode}`,
            emailContent
          );

          if (emailSent) {
            console.log(`✅ Đã gửi email thông báo hủy vé thành công cho ${ticket.email}`);
            emailSuccessCount++;
          } else {
            console.log(`❌ Gửi email thông báo hủy vé thất bại cho ${ticket.email}`);
            emailErrorCount++;
          }
        } catch (emailError) {
          console.error(`❌ Lỗi gửi email thông báo hủy vé cho ${ticket.email}:`, emailError);
          emailErrorCount++;
        }

        cancelledCount++;

        // Đợi 1 giây giữa các lần xử lý để tránh quá tải
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Lỗi xử lý vé hết hạn ${ticket.ticketCode}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 === KẾT QUẢ XỬ LÝ VÉ HẾT HẠN ===`);
    console.log(`✅ Tổng vé đã hủy: ${cancelledCount}`);
    console.log(`❌ Tổng lỗi xử lý: ${errorCount}`);
    console.log(`📧 Email gửi thành công: ${emailSuccessCount}`);
    console.log(`📧 Email gửi thất bại: ${emailErrorCount}`);

  } catch (error) {
    console.error('❌ Lỗi job kiểm tra vé hết hạn:', error);
  }
};

/**
 * Job: Dọn dẹp dữ liệu cũ
 */
const executeEmailCleanupJob = async (): Promise<void> => {
  try {
    console.log('🧹 === DỌN DẸP DỮ LIỆU CŨ ===');

    // Xóa các verification codes cũ (hơn 7 ngày)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Xóa các vé đã hủy và quá cũ (hơn 30 ngày)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log('📊 Thực hiện các tác vụ dọn dẹp...');

    // Thống kê trước khi xóa
    const oldVerifications = await Verification.countDocuments({
      createdAt: { $lt: sevenDaysAgo }
    });

    const oldTickets = await Ticket.countDocuments({
      status: 'cancelled',
      updatedAt: { $lt: thirtyDaysAgo }
    });

    console.log(`🗑️ Sẽ xóa: ${oldVerifications} verification codes cũ, ${oldTickets} vé đã hủy cũ`);

    // Thực hiện xóa (chỉ log, không thực sự xóa trong môi trường production)
    console.log('✅ Đã hoàn thành tác vụ dọn dẹp');

  } catch (error) {
    console.error('❌ Lỗi job dọn dẹp dữ liệu:', error);
  }
};

/**
 * Lấy thông tin về các job đang chạy
 */
const getJobStatus = (): Record<string, any> => {
  const status: Record<string, any> = {};

  activeJobs.forEach((job, jobKey) => {
    const config = JOB_CONFIGS[jobKey];
    status[jobKey] = {
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      running: true, // Cron jobs luôn chạy khi được khởi tạo
      cronExpression: config.cronExpression
    };
  });

  return status;
};

/**
 * Thực hiện một job thủ công (cho mục đích test)
 */
const executeJobManually = async (jobKey: string): Promise<void> => {
  console.log(`🔧 === THỰC HIỆN JOB THỦ CÔNG: ${jobKey} ===`);
  await executeJob(jobKey);
};

/**
 * Cập nhật cấu hình job
 */
const updateJobConfig = (jobKey: string, updates: Partial<JobConfig>): boolean => {
  if (!JOB_CONFIGS[jobKey]) {
    return false;
  }

  Object.assign(JOB_CONFIGS[jobKey], updates);

  // Nếu job đang chạy và bị tắt, dừng nó
  if (!updates.enabled && activeJobs.has(jobKey)) {
    activeJobs.get(jobKey)?.stop();
    activeJobs.delete(jobKey);
  }

  // Nếu job được bật và chưa chạy, khởi tạo lại
  if (updates.enabled && !activeJobs.has(jobKey)) {
    initializeJobs();
  }

  return true;
};

export default {
  initializeJobs,
  stopAllJobs,
  executeJob,
  executeCheckinReminderJob,
  executeCheckinReminder2HJob,
  executeBoardingReminder1HJob,
  executeRealtimeCheckinJob,
  executeFlightChangeMonitorJob,
  executeTicketExpiryCheckJob,
  executeEmailCleanupJob,
  getJobStatus,
  executeJobManually,
  updateJobConfig,
  JOB_CONFIGS
};
