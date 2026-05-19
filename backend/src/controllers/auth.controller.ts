import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import { httpStatus } from '../helpers/response.helper';
import { sendJsonSuccess } from '../helpers/response.helper';
import jwt from 'jsonwebtoken';
import { env } from '../helpers/env.helper';
import User from '../models/users.model';

// Đăng ký user
const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password, phoneNumber } = req.body;
    const newUser = await authService.register({ fullName, email, password, phoneNumber });
    sendJsonSuccess(res, newUser, httpStatus.CREATED.statusCode, httpStatus.CREATED.message);
  } catch (error) {
    next(error);
  }
};

// Đăng nhập
const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Gọi service login
    const { user, accessToken, refreshToken, expiresIn } = await authService.login(req.body.email, req.body.password);
    
    // Gửi response với cấu trúc mong muốn
    res.status(200).json({
      statusCode: 200,
      message: 'Đăng nhập thành công',
      data: {
        user,
        token: {
          accessToken,
          refreshToken,
          expiresIn
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Lấy profile user đã đăng nhập
const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(res.locals.user);
    sendJsonSuccess(res, user, httpStatus.OK.statusCode, httpStatus.OK.message);
  } catch (error) {
    next(error);
  }
};

// Đăng nhập với 2FA - Bước 1: Xác thực mật khẩu và gửi mã xác nhận
const loginWith2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra thông tin đăng nhập
    const user = await authService.validateLogin(email, password);

    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Tạo mã xác nhận và gửi email
    const { verificationCode, tempToken } = await emailService.createVerification(
      user.email,
      user.fullName,
      'login'
    );

    console.log(`🔐 Mã xác nhận cho ${user.email}: ${verificationCode}`);

    // Trả về thông tin để chuyển sang trang xác nhận
    res.status(200).json({
      statusCode: 200,
      message: 'Vui lòng kiểm tra email để nhận mã xác nhận',
      data: {
        email: user.email,
        tempToken: tempToken,
        requiresVerification: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// Xác minh mã 2FA - Bước 2: Nhận token thật
const verify2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, verificationCode, tempToken } = req.body;

    // Xác minh mã xác nhận
    const isValid = await emailService.verifyCode(email, verificationCode, tempToken);

    if (!isValid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Mã xác nhận không đúng hoặc đã hết hạn'
      });
    }

    // Tìm user để tạo token thật
    const user = await authService.getUserByEmail(email);
    const { accessToken, refreshToken, expiresIn } = authService.generateTokens(user);

    // Trả về token thật
    res.status(200).json({
      statusCode: 200,
      message: 'Đăng nhập thành công',
      data: {
        user,
        token: {
          accessToken,
          refreshToken,
          expiresIn
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Gửi lại mã xác nhận 2FA
const resend2FA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, tempToken } = req.body;

    // Tìm user để lấy tên
    const user = await authService.getUserByEmail(email);

    // Gửi lại mã xác nhận
    const success = await emailService.resendVerification(email, tempToken, user.fullName);

    if (!success) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Không thể gửi lại mã xác nhận'
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Đã gửi lại mã xác nhận về email của bạn'
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: tokenToRefresh } = req.body;

    if (!tokenToRefresh) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Refresh token là bắt buộc'
      });
    }

    // Xác minh refresh token
    const decoded = jwt.verify(tokenToRefresh, env.JWT_SECRET as string) as any;

    // Tìm user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Refresh token không hợp lệ'
      });
    }

    // Tạo token mới
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = authService.generateTokens(user);

    res.status(200).json({
      statusCode: 200,
      message: 'Refresh token thành công',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn
      }
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        statusCode: 401,
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });
    }
    console.error('Refresh token error:', error);
    next(error);
  }
};

export default {
  register,
  login,
  loginWith2FA,
  verify2FA,
  resend2FA,
  refreshToken,
  getProfile
  // updateProfile - tạm thời comment vì chưa implement
};
