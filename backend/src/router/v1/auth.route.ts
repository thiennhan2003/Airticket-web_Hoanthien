import express from 'express';
import authController from '../../controllers/auth.controller';
import validateSchemaYup from '../../middlewares/validate.middleware';
import authValidation from '../../validations/auth.validation';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = express.Router();

// Đăng ký
router.post(
  '/register',
  // validateSchemaYup(authValidation.registerSchema),
  authController.register
);

// Đăng nhập
router.post(
  '/login',
  // validateSchemaYup(authValidation.loginSchema),
  authController.login
);

// Đăng nhập với 2FA (Bước 1: Xác thực mật khẩu)
router.post(
  '/login-with-2fa',
  // validateSchemaYup(authValidation.loginSchema),
  authController.loginWith2FA
);

// Xác minh mã 2FA (Bước 2: Nhận token thật)
router.post(
  '/verify-2fa',
  // validateSchemaYup(authValidation.verify2FASchema),
  authController.verify2FA
);

// Refresh token
router.post(
  '/refresh',
  authController.refreshToken
);

// Lấy profile
router.get('/get-profile', authenticateToken, authController.getProfile);

// Cập nhật profile - tạm thời comment vì chưa implement
// router.put('/update-profile', authenticateToken, authController.updateProfile);

export default router;
