#!/bin/bash
# Script cập nhật file .env cho Gmail configuration

echo "🔧 Cập nhật cấu hình Gmail cho hệ thống Flight Booking"
echo ""

# Kiểm tra file .env tồn tại
if [ ! -f ".env" ]; then
    echo "❌ File .env không tồn tại. Tạo file .env từ .env.example"
    cp .env.example .env
    echo "✅ Đã tạo file .env từ template"
fi

echo ""
echo "📧 Bạn cần cung cấp thông tin Gmail:"
echo ""

# Nhập thông tin từ người dùng
read -p "Nhập địa chỉ Gmail của bạn (ví dụ: nhanvai2003@gmail.com): " EMAIL_USER
read -p "Nhập App Password 16 ký tự (từ Google Account): " EMAIL_PASS

# Kiểm tra định dạng
if [ ${#EMAIL_PASS} -ne 16 ]; then
    echo "❌ App Password phải có đúng 16 ký tự"
    echo "💡 Hãy tạo lại App Password từ Google Account"
    exit 1
fi

# Backup file cũ
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Cập nhật file .env
sed -i.bak "s/EMAIL_USER=.*/EMAIL_USER=${EMAIL_USER}/" .env
sed -i.bak "s/EMAIL_PASS=.*/EMAIL_PASS=${EMAIL_PASS}/" .env

echo ""
echo "✅ Đã cập nhật file .env với thông tin Gmail của bạn:"
echo "   📧 EMAIL_USER: ${EMAIL_USER}"
echo "   🔑 EMAIL_PASS: ***configured***"
echo ""
echo "📋 File backup đã tạo: .env.backup.$(date +%Y%m%d_%H%M%S)"
echo ""
echo "🚀 Bây giờ hãy test hệ thống:"
echo "   1. Chạy: pnpm dev"
echo "   2. Test: curl -X POST http://localhost:8080/api/v1/test-email -H 'Content-Type: application/json' -d '{\"email\":\"${EMAIL_USER}\",\"userName\":\"Test\"}'"
echo ""
echo "🎯 Kiểm tra log trong terminal để xem kết quả!"
