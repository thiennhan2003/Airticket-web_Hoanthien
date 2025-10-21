# 📧 Hướng dẫn cập nhật file .env cho Gmail

## Cách 1: Dùng script tự động (Linux/Mac)
```bash
chmod +x setup-gmail.sh
./setup-gmail.sh
```

## Cách 2: Cập nhật thủ công (Windows)

### Bước 1: Mở file .env
- Vào thư mục `backend`
- Mở file `.env` bằng notepad hoặc editor

### Bước 2: Tìm và thay thế các dòng sau:

**Thay đổi từ:**
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd-efgh-ijkl-mnop
```

**Thành:**
```env
EMAIL_USER=nhanvai2003@gmail.com
EMAIL_PASS=paste-your-16-char-app-password-here
```

### Bước 3: Lấy App Password từ Google
1. Đăng nhập [Gmail](https://mail.google.com)
2. Google Account → Security → 2-Step Verification (bật nếu chưa)
3. App passwords → Select app: **Mail** → Select device: **Other**
4. Device name: `Flight Booking 2FA`
5. Click **Generate**
6. Copy **16-character password** (ví dụ: `abcdefghijklmnop`)
7. Paste vào file `.env` thay thế `EMAIL_PASS`

### Bước 4: Lưu file và test

## 🔍 Kiểm tra cấu hình

Chạy lệnh sau để kiểm tra kết nối Gmail:

```bash
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'nhanvai2003@gmail.com',
    pass: 'your-app-password-here'
  }
});
transporter.verify((error, success) => {
  if (error) console.log('❌ Lỗi:', error.message);
  else console.log('✅ Kết nối Gmail thành công!');
});
"
```

## 🚨 Lưu ý quan trọng

- **App Password phải đúng 16 ký tự** (không có khoảng trắng)
- **Bật 2FA trước** khi tạo App Password
- **Không dùng mật khẩu Gmail thường** - chỉ dùng App Password
- **Kiểm tra thư mục Spam** nếu không thấy email

Bạn cập nhật file `.env` xong thì chạy lại `pnpm dev` và test nhé! 🚀
