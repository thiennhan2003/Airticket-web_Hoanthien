import express from 'express';
import emailService from '../../services/email.service';

const router = express.Router();

/**
 * TEST EMAIL FUNCTIONALITY
 * Route này chỉ để test việc gửi email Gmail
 * Trong production, hãy xóa route này đi
 */

router.post('/test-email', async (req: any, res: any) => {
  try {
    const { email, userName } = req.body;

    if (!email || !userName) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email và userName là bắt buộc'
      });
    }

    // Tạo mã xác nhận test
    const verificationCode = '123456';

    // Gửi email test
    const emailSent = await emailService.sendVerificationEmail(
      email,
      verificationCode,
      userName
    );

    if (emailSent) {
      res.status(200).json({
        statusCode: 200,
        message: 'Email test đã được gửi thành công!',
        data: {
          email,
          verificationCode,
          note: 'Kiểm tra hộp thư đến của bạn'
        }
      });
    } else {
      res.status(500).json({
        statusCode: 500,
        message: 'Không thể gửi email test'
      });
    }
  } catch (error) {
    console.error('Lỗi gửi email test:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Lỗi server khi gửi email test'
    });
  }
});

export default router;
