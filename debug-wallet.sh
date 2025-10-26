#!/bin/bash

# Script để debug lỗi 400 Bad Request với wallet payment

echo "🔧 WALLET PAYMENT DEBUGGING SCRIPT"
echo "=================================="

# 1. Kiểm tra backend server
echo "1. Kiểm tra backend server..."
curl -s http://localhost:8080/api/v1/health || echo "❌ Backend server không chạy"

# 2. Kiểm tra user authentication
echo "2. Kiểm tra authentication..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Authentication thành công"
else
  echo "❌ Authentication thất bại"
fi

# 3. Kiểm tra wallet balance
echo "3. Kiểm tra wallet balance..."
curl -s http://localhost:8080/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 4. Tạo test ticket (nếu cần)
echo "4. Tạo test ticket..."
curl -s -X POST http://localhost:8080/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": "507f1f77bcf86cd799439011",
    "passengerName": "Test User",
    "email": "test@example.com",
    "phoneNumber": "0123456789",
    "seatNumbers": ["A1"],
    "passengerCount": 1,
    "price": 1500000
  }'

# 5. Test wallet payment với ticket giả
echo "5. Test wallet payment..."
curl -X POST http://localhost:8080/api/v1/payments/create-payment-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "507f1f77bcf86cd799439011",
    "amount": 1500000,
    "paymentMethod": "wallet",
    "pin": "1234"
  }'

echo "=================================="
echo "Nếu vẫn gặp lỗi, hãy kiểm tra:"
echo "1. Backend server có chạy không (http://localhost:8080)"
echo "2. User có tồn tại và có wallet không"
echo "3. JWT token có hợp lệ không"
echo "4. Database có kết nối không"
