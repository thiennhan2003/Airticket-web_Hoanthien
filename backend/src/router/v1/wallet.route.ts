import express from 'express';
import walletController from '../../controllers/wallet.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/wallet
 * @desc Lấy thông tin ví điện tử của user
 * @access Private
 */
router.get('/', walletController.getWalletInfo);

/**
 * @route GET /api/v1/wallet/transactions
 * @desc Lấy lịch sử giao dịch ví điện tử
 * @access Private
 */
router.get('/transactions', walletController.getWalletTransactions);

/**
 * @route POST /api/v1/wallet/topup
 * @desc Nạp tiền vào ví điện tử
 * @access Private
 */
router.post('/topup', walletController.topup);

/**
 * @route POST /api/v1/wallet/confirm-topup
 * @desc Xác nhận nạp tiền thành công
 * @access Private
 */
router.post('/confirm-topup', walletController.confirmTopup);

/**
 * @route POST /api/v1/wallet/set-pin
 * @desc Thiết lập hoặc thay đổi PIN ví
 * @access Private
 */
router.post('/set-pin', walletController.setWalletPin);

/**
 * @route POST /api/v1/wallet/withdraw
 * @desc Rút tiền từ ví về tài khoản ngân hàng
 * @access Private
 */
router.post('/withdraw', walletController.withdraw);

/**
 * @route GET /api/v1/wallet/balance
 * @desc Kiểm tra số dư ví
 * @access Private
 */
router.get('/balance', walletController.checkBalance);

export default router;
