// email.service.ts - Service gửi email với mã xác nhận
import nodemailer from 'nodemailer';
import Verification from '../models/verification.model';

/**
 * Email Service:
 * - Gửi mã xác nhận qua email thật với Gmail
 * - Cấu hình với App Password của Gmail
 */

// Cấu hình transporter với Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email Gmail của bạn
    pass: process.env.EMAIL_PASS  // App Password, không phải mật khẩu thật
  }
});

/**
 * Tạo mã xác nhận ngẫu nhiên 6 chữ số
 */
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Tạo temp token để bảo mật
 */
const generateTempToken = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

/**
 * Gửi mã xác nhận qua email
 */
const sendVerificationEmail = async (email: string, verificationCode: string, userName: string): Promise<boolean> => {
  try {
    console.log('🚀 === BẮT ĐẦU GỬI EMAIL THẬT ===');
    console.log('📧 Thông tin cấu hình Gmail:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET',
      targetEmail: email,
      verificationCode: verificationCode
    });

    // Kiểm tra biến môi trường
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Thiếu cấu hình Gmail trong .env');
      console.error('💡 Cần thiết lập EMAIL_USER và EMAIL_PASS');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Mã xác nhận đăng nhập - Flight Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">✈️ Flight Booking</h1>
              <p style="color: #7f8c8d; margin: 10px 0 0 0;">Xác nhận đăng nhập tài khoản</p>
            </div>

            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${userName}!</h2>
              <p style="color: #495057; margin-bottom: 0;">
                Bạn vừa đăng nhập vào tài khoản của mình. Để hoàn tất quá trình đăng nhập, vui lòng nhập mã xác nhận bên dưới:
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #007bff; color: white; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Lưu ý:</strong> Mã xác nhận này sẽ hết hạn sau 5 phút. Không chia sẻ mã này với bất kỳ ai.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Nếu bạn không thực hiện đăng nhập này, vui lòng bỏ qua email này.
              </p>
              <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
                © 2025 Flight Booking. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
      // Text version cho client email đơn giản
      text: `
        Xin chào ${userName}!

        Bạn vừa đăng nhập vào tài khoản Flight Booking.

        Mã xác nhận của bạn là: ${verificationCode}

        Mã này sẽ hết hạn sau 5 phút.

        Nếu bạn không thực hiện đăng nhập này, vui lòng bỏ qua email này.

        © 2025 Flight Booking. All rights reserved.
      `
    };

    console.log('📨 Đang gửi email qua Gmail thật...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL GỬI THÀNH CÔNG!');
    console.log('📬 Message ID:', result.messageId);
    console.log('🎯 Email đã gửi đến:', email);
    console.log('🔐 Mã xác nhận:', verificationCode);

    return true;
  } catch (error) {
    console.error('❌ LỖI GỬI EMAIL:', (error as Error).message);
    console.error('🔍 Chi tiết lỗi:', error);
    console.error('💡 Các nguyên nhân có thể:');
    console.error('   - EMAIL_USER hoặc EMAIL_PASS sai');
    console.error('   - Chưa bật 2FA trên Gmail');
    console.error('   - App Password không đúng định dạng');
    console.error('   - Gmail chặn kết nối từ ứng dụng');
    return false;
  }
};

/**
 * Tạo và lưu mã xác nhận vào database
 */
const createVerification = async (email: string, userName: string, type: string = 'login'): Promise<{ verificationCode: string; tempToken: string }> => {
  // Tạo mã xác nhận và temp token
  const verificationCode = generateVerificationCode();
  const tempToken = generateTempToken();

  // Xóa các bản ghi cũ của email này
  await Verification.deleteMany({ email });

  // Tạo bản ghi mới
  const verification = new Verification({
    email,
    verificationCode,
    tempToken,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 phút
  });

  await verification.save();

  // Gửi email (async, không chờ)
  sendVerificationEmail(email, verificationCode, userName).catch(error => {
    console.error('Lỗi gửi email xác nhận:', error);
  });

  return { verificationCode, tempToken };
};

/**
 * Xác minh mã xác nhận
 */
const verifyCode = async (email: string, verificationCode: string, tempToken: string): Promise<boolean> => {
  const verification = await Verification.findOne({
    email,
    tempToken,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!verification) {
    return false;
  }

  // Kiểm tra mã xác nhận
  if (verification.verificationCode !== verificationCode) {
    // Tăng số lần thử
    verification.attempts += 1;
    await verification.save();

    // Nếu thử quá 3 lần, đánh dấu là đã dùng
    if (verification.attempts >= 3) {
      verification.isUsed = true;
      await verification.save();
    }

    return false;
  }

  // Đánh dấu đã sử dụng
  verification.isUsed = true;
  await verification.save();

  return true;
};

/**
 * Gửi lại mã xác nhận
 */
const resendVerification = async (email: string, tempToken: string, userName: string): Promise<boolean> => {
  // Kiểm tra temp token còn hợp lệ không
  const existingVerification = await Verification.findOne({
    email,
    tempToken,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!existingVerification) {
    return false;
  }

  // Tạo mã mới
  const newCode = generateVerificationCode();

  // Cập nhật mã mới
  existingVerification.verificationCode = newCode;
  existingVerification.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  existingVerification.attempts = 0;
  await existingVerification.save();

  // Gửi email mới
  return await sendVerificationEmail(email, newCode, userName);
};

/**
 * Gửi email chứa mã QR check-in
 */
const sendQRCodeEmail = async (email: string, passengerName: string, ticketCode: string, qrCodeData: string, flightInfo: any): Promise<boolean> => {
  try {
    console.log('🚀 === GỬI EMAIL MÃ QR CHECK-IN ===');
    console.log('📧 Thông tin:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET',
      to: email,
      ticketCode
    });

    // Kiểm tra biến môi trường
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Thiếu cấu hình Gmail trong .env');
      return false;
    }

    // Tạo mã QR dạng base64 để nhúng vào email
    const qrCodeBase64 = `data:image/png;base64,${qrCodeData}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '✅ Check-in thành công - Mã QR vé máy bay',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">✅ Check-in thành công!</h1>
              <p style="color: #6c757d; margin: 10px 0 0 0;">Vé máy bay của bạn đã sẵn sàng</p>
            </div>

            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h2 style="color: #2c3e50; margin-top: 0;">Xin chào ${passengerName}!</h2>
              <p style="color: #495057; margin-bottom: 0;">
                Bạn đã check-in thành công cho chuyến bay <strong>${flightInfo.flightCode}</strong>.
                Vui lòng xuất trình mã QR bên dưới tại quầy check-in sân bay.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
              <h3 style="color: #2c3e50; margin-top: 0;">📱 Mã QR Vé máy bay</h3>
              <div style="display: inline-block; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <img src="cid:qr-code" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="color: #6c757d; margin: 15px 0 0 0; font-size: 14px;">
                <strong>Mã vé:</strong> ${ticketCode}
              </p>
            </div>

            <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin-bottom: 20px;">
              <h4 style="color: #155724; margin-top: 0;">Thông tin chuyến bay</h4>
              <p style="color: #155724; margin: 5px 0;"><strong>Tuyến bay:</strong> ${flightInfo.route}</p>
              <p style="color: #155724; margin: 5px 0;"><strong>Khởi hành:</strong> ${new Date(flightInfo.departureTime).toLocaleString('vi-VN')}</p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Lưu ý:</strong> Vui lòng đến sân bay trước 2 tiếng so với giờ khởi hành.
                Xuất trình mã QR này cùng với giấy tờ tùy thân tại quầy check-in.
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
      `,
      attachments: [
        {
          filename: 'qr-code.png',
          content: qrCodeData,
          encoding: 'base64',
          cid: 'qr-code'
        }
      ]
    };

    console.log('📨 Đang gửi email mã QR...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL MÃ QR GỬI THÀNH CÔNG!');
    console.log('📬 Message ID:', result.messageId);

    return true;
  } catch (error) {
    console.error('❌ LỖI GỬI EMAIL MÃ QR:', (error as Error).message);
    return false;
  }
};

/**
 * Gửi email tùy chỉnh (không phải mã xác nhận)
 */
const sendEmail = async (to: string, subject: string, htmlContent: string, textContent?: string): Promise<boolean> => {
  try {
    console.log('🚀 === GỬI EMAIL TÙY CHỈNH ===');
    console.log('📧 Thông tin:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET',
      to,
      subject
    });

    // Kiểm tra biến môi trường
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Thiếu cấu hình Gmail trong .env');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    console.log('📨 Đang gửi email tùy chỉnh...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL TÙY CHỈNH GỬI THÀNH CÔNG!');
    console.log('📬 Message ID:', result.messageId);

    return true;
  } catch (error) {
    console.error('❌ LỖI GỬI EMAIL TÙY CHỈNH:', (error as Error).message);
    return false;
  }
};

/**
 * Cleanup các bản ghi hết hạn
 */
const cleanupExpiredVerifications = async (): Promise<void> => {
  await Verification.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

export default {
  createVerification,
  verifyCode,
  resendVerification,
  cleanupExpiredVerifications,
  sendVerificationEmail,
  sendEmail,
  sendQRCodeEmail
};
