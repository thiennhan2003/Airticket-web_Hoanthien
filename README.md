# ✈️ Flight Booking System

Hệ thống đặt vé máy bay trực tuyến với tính năng xác thực 2 yếu tố (2FA) bảo mật cao.

## 🚀 Tính năng nổi bật

### ✅ **Xác thực bảo mật**
- 🔐 **2FA với Gmail** - Xác thực 2 yếu tố qua email thật
- ⏰ **Mã xác nhận hết hạn** - Bảo mật thời gian thực
- 🔄 **Gửi lại mã** - Tiện lợi cho người dùng
- 🚫 **Giới hạn thử** - Tối đa 3 lần nhập sai

### ✅ **Đặt vé dễ dàng**
- 🔍 **Tìm kiếm thông minh** - Tìm chuyến bay nhanh chóng
- 💺 **Nhiều hạng vé** - Economy, Business, First Class
- 📱 **Responsive** - Tối ưu mọi thiết bị
- 🎨 **Giao diện đẹp** - UX/UI chuyên nghiệp

## 🛠️ Công nghệ sử dụng

### **Backend**
- **Node.js** + **Express.js** - Framework mạnh mẽ
- **TypeScript** - Type-safe development
- **MongoDB** + **Mongoose** - Cơ sở dữ liệu linh hoạt
- **JWT** - Xác thực token bảo mật
- **Nodemailer** - Gửi email Gmail thật

### **Frontend**
- **React.js** - Library UI phổ biến
- **React Router** - Điều hướng SPA
- **CSS3** - Styling responsive
- **JavaScript ES6+** - Code hiện đại

## 📋 Yêu cầu hệ thống

### **Phần cứng tối thiểu**
- RAM: 2GB
- Storage: 5GB free space
- Network: Internet connection

### **Phần mềm cần thiết**
- **Node.js** v16+
- **MongoDB** v4.4+
- **Git** (để clone project)
- **Gmail account** (để dùng 2FA thật)

## 🚀 Cài đặt và chạy

### **1. Clone project**
```bash
git clone <repository-url>
cd flight-booking
```

### **2. Cấu hình Backend**
```bash
cd backend

# Cài đặt dependencies
npm install

# Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa .env với thông tin thật của bạn
```

### **3. Cấu hình Gmail cho 2FA**
```bash
# Đọc hướng dẫn chi tiết
cat GMAIL_SETUP.md

# Hoặc xem hướng dẫn trong file GMAIL_SETUP.md
```

### **4. Chuẩn bị cơ sở dữ liệu**
```bash
# Khởi động MongoDB (nếu chưa chạy)
mongod

# Hoặc dùng MongoDB Atlas (cloud)
# Cập nhật MONGODB_URI trong .env
```

### **5. Khởi động hệ thống**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **6. Truy cập ứng dụng**
- **Trang chủ**: `http://localhost:3000`
- **API Backend**: `http://localhost:8080`
- **Admin Panel**: `http://localhost:8080/admin`

## 📧 Cấu hình Gmail 2FA

### **Bước 1: Chuẩn bị Gmail**
1. Đăng nhập [Gmail](https://mail.google.com)
2. Bật **2-Step Verification**
3. Tạo **App Password** cho ứng dụng Mail

### **Bước 2: Cập nhật .env**
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### **Bước 3: Test tính năng**
- Đăng ký tài khoản mới
- Đăng nhập → Nhận mã xác nhận qua Gmail thật
- Nhập mã → Đăng nhập thành công

## 🔧 Cấu trúc Project

```
flight-booking/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── controllers/     # Xử lý request
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middlewares/    # Middleware functions
│   │   └── helpers/        # Utility functions
│   ├── .env.example        # Template biến môi trường
│   └── package.json
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app
│   └── package.json
├── GMAIL_SETUP.md         # Hướng dẫn Gmail chi tiết
└── README.md             # Tài liệu này
```

## 🔐 API Endpoints

### **Authentication (2FA)**
```javascript
POST /api/v1/auth/login-with-2fa    // Đăng nhập bước 1
POST /api/v1/auth/verify-2fa       // Xác minh mã bước 2
POST /api/v1/auth/resend-2fa       // Gửi lại mã xác nhận
```

### **Flights**
```javascript
GET    /api/v1/flights             // Tìm kiếm chuyến bay
GET    /api/v1/flights/:id         // Chi tiết chuyến bay
POST   /api/v1/flights             // Tạo chuyến bay (admin)
PUT    /api/v1/flights/:id         // Cập nhật chuyến bay
DELETE /api/v1/flights/:id         // Xóa chuyến bay
```

### **Bookings**
```javascript
GET    /api/v1/bookings            // Danh sách đặt vé
POST   /api/v1/bookings            // Tạo đặt vé tạm thời
GET    /api/v1/bookings/:id        // Chi tiết đặt vé
PUT    /api/v1/bookings/:id        // Cập nhật trạng thái
```

## 🎯 Quy trình đăng nhập 2FA

```
1. Nhập email + mật khẩu
   ↓
2. Hệ thống xác thực thông tin
   ↓
3. Tạo mã xác nhận 6 chữ số
   ↓
4. Gửi mã qua Gmail thật
   ↓
5. Người dùng nhập mã
   ↓
6. Xác minh mã đúng
   ↓
7. Đăng nhập thành công
```

## 🛡️ Tính năng bảo mật

### **Xác thực 2FA**
- ✅ Mã xác nhận 6 chữ số ngẫu nhiên
- ✅ Hết hạn sau 5 phút
- ✅ Giới hạn 3 lần thử sai
- ✅ Không thể dùng lại mã cũ

### **Email bảo mật**
- ✅ Chỉ gửi qua Gmail đã xác thực
- ✅ Template HTML đẹp và chuyên nghiệp
- ✅ Fallback text cho client cũ
- ✅ Không lộ thông tin nhạy cảm

### **Token bảo mật**
- ✅ JWT access token (24h)
- ✅ Refresh token (365 ngày)
- ✅ Bảo vệ routes với middleware
- ✅ Tự động làm mới token

## 📊 Cơ sở dữ liệu

### **Collections chính**
- **users** - Thông tin người dùng
- **flights** - Danh sách chuyến bay
- **bookings** - Đặt vé tạm thời
- **verifications** - Mã xác nhận 2FA

### **Indexes tối ưu**
```javascript
// Users
{ email: 1 }           // Tìm user nhanh
{ createdAt: -1 }      // Sắp xếp thời gian

// Flights
{ route: 1 }           // Tìm kiếm tuyến bay
{ departureTime: 1 }   // Lọc theo thời gian
{ availableSeats: 1 }  // Kiểm tra ghế trống

// Verifications
{ email: 1, tempToken: 1 }     // Tìm nhanh
{ expiresAt: 1 }              // Tự động xóa hết hạn
```

## 🔧 Development

### **Scripts hữu ích**
```bash
# Backend
npm run dev        # Chạy development server
npm run build      # Build production
npm run test       # Chạy tests

# Frontend
npm run dev        # Chạy development
npm run build      # Build production
npm run lint       # Kiểm tra code style
```

### **Debug 2FA**
```bash
# Kiểm tra email trong console
console.log('📧 Email sent to:', email);

# Test gửi email thủ công
POST http://localhost:8080/api/v1/auth/test-email
{
  "email": "test@example.com",
  "userName": "Test User"
}
```

## 🚨 Troubleshooting

### **Lỗi thường gặp**

#### **1. "Cannot find module 'nodemailer'"**
```bash
cd backend
npm install nodemailer @types/nodemailer
```

#### **2. "Authentication failed" (Gmail)**
- Kiểm tra EMAIL_USER và EMAIL_PASS
- Đảm bảo bật 2FA và tạo App Password đúng
- Thử gửi email test từ Gmail thật

#### **3. "MongoDB connection failed"**
- Đảm bảo MongoDB đang chạy
- Kiểm tra MONGODB_URI trong .env
- Port 27017 có bị firewall chặn không

#### **4. "CORS error"**
- Kiểm tra FRONTEND_URL trong .env
- Đảm bảo frontend và backend cùng domain

## 📈 Monitoring & Logs

### **Log quan trọng**
```javascript
// Authentication logs
console.log('Login attempt for:', email);
console.log('2FA code generated:', code);
console.log('Email sent successfully');

// Error logs
console.error('Email send failed:', error);
console.error('Invalid verification code');
```

### **Database monitoring**
```javascript
// Kiểm tra verifications hết hạn
db.verifications.find({expiresAt: {$lt: new Date()}})

// Xóa thủ công nếu cần
db.verifications.deleteMany({expiresAt: {$lt: new Date()}})
```

## 🎉 Thành công!

Khi mọi thứ hoạt động:

1. ✅ **Backend chạy** trên port 8080
2. ✅ **Frontend chạy** trên port 3000
3. ✅ **MongoDB kết nối** thành công
4. ✅ **Gmail gửi email** xác nhận thật
5. ✅ **2FA hoạt động** bảo mật cao

**Chúc bạn sử dụng hệ thống thành công!** 🎊

---

**📧 Liên hệ hỗ trợ**: Nếu gặp vấn đề, hãy kiểm tra file `GMAIL_SETUP.md` để biết cách cấu hình Gmail chi tiết.
