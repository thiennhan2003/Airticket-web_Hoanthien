# 📧 Hướng dẫn cấu hình Gmail cho tính năng 2FA

Để sử dụng tính năng xác thực 2 yếu tố với email thật từ Gmail, bạn cần:

## 🔑 Bước 1: Chuẩn bị tài khoản Gmail

1. **Đăng nhập Gmail** tại [mail.google.com](https://mail.google.com)
2. **Bật xác minh 2 bước**:
   - Vào **Google Account** → **Security** → **2-Step Verification**
   - Làm theo hướng dẫn để bật xác minh 2 bước

## 🔐 Bước 2: Tạo App Password

1. **Truy cập trang App Passwords**:
   - Vào **Google Account** → **Security** → **2-Step Verification**
   - Cuộn xuống **App passwords**
   - Click **"App passwords"**

2. **Tạo mật khẩu ứng dụng**:
   - Chọn ứng dụng: **Mail**
   - Chọn thiết bị: **Other (Tên tùy chỉnh)**
   - Nhập tên: `Flight Booking 2FA`
   - Click **Generate**

3. **Lưu mật khẩu**:
   - Google sẽ hiển thị mật khẩu 16 ký tự
   - **Lưu ngay** mật khẩu này (ví dụ: `abcd-efgh-ijkl-mnop`)

## ⚙️ Bước 3: Cấu hình biến môi trường

1. **Sao chép file cấu hình**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Chỉnh sửa file `.env`**:
   ```env
   # Thay đổi các giá trị sau:
   EMAIL_USER=your-actual-gmail@gmail.com
   EMAIL_PASS=abcd-efgh-ijkl-mnop  # Mật khẩu ứng dụng 16 ký tự
   ```

## 🚀 Bước 4: Khởi động hệ thống

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## ✅ Kiểm tra hoạt động

1. **Đăng ký tài khoản** tại `http://localhost:3000/register`
2. **Đăng nhập** tại `http://localhost:3000/login`
3. **Kiểm tra email** - mã xác nhận sẽ được gửi đến Gmail thật
4. **Nhập mã** - đăng nhập thành công

## 🔒 Bảo mật quan trọng

- ❌ **Không dùng mật khẩu Gmail thật** - chỉ dùng App Password
- ✅ **App Password chỉ có quyền gửi mail** - không thể đăng nhập Gmail
- 🔒 **Mã xác nhận hết hạn sau 5 phút**
- 🚫 **Tối đa 3 lần thử nhập mã sai**

## 🆘 Khắc phục sự cố

### Lỗi thường gặp:

#### **"Authentication failed"**
```bash
# Kiểm tra:
# 1. EMAIL_USER đúng chưa?
# 2. EMAIL_PASS đúng 16 ký tự chưa?
# 3. Có bật 2FA chưa?
# 4. Có tạo App Password chưa?
```

#### **"Cannot find module 'nodemailer'"**
```bash
cd backend
npm install nodemailer @types/nodemailer
```

#### **Email không nhận được**
- Kiểm tra thư mục **Spam/Junk**
- Đảm bảo địa chỉ email đúng
- Thử gửi email test từ Gmail thật

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra lại các bước cấu hình
2. Đảm bảo bật 2FA và tạo App Password đúng
3. Kiểm tra file `.env` có đúng định dạng không
4. Xem log lỗi trong terminal backend

**Bây giờ hệ thống đã sẵn sàng gửi email xác nhận thật từ Gmail!** 🎉
