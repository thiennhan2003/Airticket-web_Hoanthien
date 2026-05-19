# Hướng dẫn chạy và test hệ thống sau khi triển khai ví điện tử

## 1. Chuẩn bị Environment

### Backend Setup:
1. Tạo file .env trong thư mục backend:
```bash
cd d:\Airticket\backend
# Tạo file .env với nội dung sau:
```

2. Nội dung file .env:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/flight_booking

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=8080

# Email (tùy chọn cho notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe (bắt buộc cho payment)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

3. Cài đặt dependencies:
```bash
npm install
```

4. Khởi động backend:
```bash
npm run dev
```
Server sẽ chạy tại: http://localhost:8080

### Frontend Setup:
1. Cài đặt dependencies:
```bash
cd d:\Airticket\frontend
npm install
```

2. Khởi động frontend:
```bash
npm start
```
App sẽ chạy tại: http://localhost:3000

## 2. Test API Endpoints

### Sử dụng file test đã tạo: d:\Airticket\WALLET_API_TEST.http

1. **Lấy thông tin ví:**
```http
GET http://localhost:8080/api/v1/wallet
Authorization: Bearer YOUR_JWT_TOKEN
```

2. **Nạp tiền vào ví:**
```http
POST http://localhost:8080/api/v1/wallet/topup
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 1000000,
  "paymentMethod": "stripe",
  "description": "Nạp tiền vào ví"
}
```

3. **Thanh toán bằng ví:**
```http
POST http://localhost:8080/api/v1/payments/create-payment-intent
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "ticketId": "TICKET_ID",
  "amount": 1500000,
  "paymentMethod": "wallet",
  "pin": "1234"
}
```

## 3. Test Frontend Features

### 1. Profile Page - Tab Ví điện tử:
- URL: http://localhost:3000/profile
- Chuyển sang tab "👛 Ví điện tử"
- Kiểm tra hiển thị số dư, lịch sử giao dịch
- Test các nút: Nạp tiền, Rút tiền, Thiết lập PIN

### 2. Payment Page - Wallet Payment:
- URL: http://localhost:3000/payment/TICKET_ID
- Kiểm tra tùy chọn "Ví điện tử" trong payment methods
- Test thanh toán bằng ví (cần có số dư)
- Kiểm tra email xác nhận

### 3. Wallet Management:
- Test nạp tiền với các số tiền khác nhau
- Test thiết lập PIN bảo mật
- Test xem lịch sử giao dịch

## 4. Database Migration

Nếu cần, chạy migration để thêm wallet fields vào users collection:

```javascript
// File: d:\Airticket\backend\migrate-wallet-fields.js
const mongoose = require('mongoose');
const User = require('./src/models/users.model');

async function migrateWalletFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Cập nhật tất cả users với wallet fields mặc định
    await User.updateMany(
      {
        walletBalance: { $exists: false }
      },
      {
        $set: {
          walletBalance: 0,
          isWalletActive: true,
          walletDailyLimit: 10000000,
          walletMonthlyLimit: 100000000,
          totalSpentInWallet: 0,
          totalTopupInWallet: 0,
          walletLevel: 'bronze'
        }
      }
    );

    console.log('✅ Wallet migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateWalletFields();
```

Chạy migration:
```bash
node migrate-wallet-fields.js
```

## 5. Troubleshooting

### Backend Issues:
1. **MongoDB connection failed:**
   - Đảm bảo MongoDB đang chạy
   - Kiểm tra MONGODB_URI trong .env

2. **JWT Token issues:**
   - Kiểm tra JWT_SECRET trong .env
   - Đảm bảo token được lưu trong localStorage

3. **Stripe payment failed:**
   - Kiểm tra STRIPE_SECRET_KEY
   - Đảm bảo webhook endpoint được cấu hình

### Frontend Issues:
1. **CSS không load:**
   - Kiểm tra file Wallet.css syntax
   - Xóa node_modules và npm install lại

2. **API calls failed:**
   - Kiểm tra backend đang chạy
   - Kiểm tra CORS settings

3. **Wallet component không hiển thị:**
   - Kiểm tra import trong Profile.js
   - Kiểm tra Wallet component export

## 6. Production Deployment

### Environment Variables (Production):
```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
```

### Build Commands:
```bash
# Backend
npm run build
npm start

# Frontend
npm run build
serve -s build
```

## 7. Monitoring & Analytics

### Logs cần theo dõi:
- Wallet transactions
- Payment success/failure rates
- User engagement với ví điện tử
- Revenue từ wallet payments

### Metrics quan trọng:
- Wallet adoption rate
- Average wallet balance
- Topup frequency
- Payment conversion rate

## 8. Security Checklist

✅ [ ] Mã hóa wallet PIN với bcrypt
✅ [ ] Rate limiting cho API endpoints  
✅ [ ] Input validation đầy đủ
✅ [ ] JWT token expiration
✅ [ ] CORS configuration đúng
✅ [ ] Database indexes tối ưu
✅ [ ] Error handling comprehensive
✅ [ ] Email notifications bảo mật

## 9. Next Steps

Sau khi test thành công:

1. **User Training:** Tạo hướng dẫn cho người dùng
2. **Marketing:** Khuyến mãi để tăng adoption
3. **Analytics:** Theo dõi usage patterns
4. **Optimization:** Tối ưu performance dựa trên data
5. **Expansion:** Thêm tính năng mới (auto topup, referrals, etc.)

---

**🎯 Hệ thống ví điện tử đã sẵn sàng để production!**
