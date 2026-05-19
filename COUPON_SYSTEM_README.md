# 🎫 Hệ thống mã giảm giá (Coupon System)

Hệ thống mã giảm giá hoàn chỉnh cho ứng dụng đặt vé máy bay với đầy đủ tính năng quản lý và tích hợp.

## ✨ Tính năng

### 🎛️ Admin Panel
- ✅ **Quản lý coupon**: Tạo, sửa, xóa, kích hoạt/tạm dừng coupon
- ✅ **Thống kê**: Xem tổng quan về coupon usage
- ✅ **Validation**: Kiểm tra tính hợp lệ của coupon
- ✅ **Filtering & Search**: Tìm kiếm và lọc coupon theo nhiều tiêu chí

### 🛒 Frontend Integration
- ✅ **Apply coupon**: Nhập mã giảm giá trong quá trình thanh toán
- ✅ **Real-time validation**: Kiểm tra tính hợp lệ ngay lập tức
- ✅ **Discount calculation**: Tính toán giảm giá tự động
- ✅ **Visual feedback**: Hiển thị thông tin coupon và số tiền tiết kiệm

### 🔧 Backend Features
- ✅ **Multiple discount types**: Percentage và Fixed amount
- ✅ **Flexible conditions**: Minimum order value, max discount, expiry date
- ✅ **Usage tracking**: Theo dõi số lượt sử dụng
- ✅ **Security**: Middleware validation và admin authorization
- ✅ **Performance**: Indexed database queries

## 🚀 Cài đặt

### Backend Setup
Hệ thống coupon đã được tích hợp vào backend với các endpoints:

```bash
# Admin endpoints (yêu cầu admin authentication)
GET    /api/v1/coupons              # Lấy danh sách coupon
POST   /api/v1/coupons              # Tạo coupon mới
PUT    /api/v1/coupons/:id          # Cập nhật coupon
DELETE /api/v1/coupons/:id          # Xóa coupon
PATCH  /api/v1/coupons/:id/toggle-status  # Thay đổi trạng thái

# User endpoints (yêu cầu user authentication)
POST   /api/v1/coupons/validate     # Validate coupon
POST   /api/v1/coupons/apply        # Apply coupon

# Statistics (admin only)
GET    /api/v1/coupons/stats/summary  # Thống kê coupon
```

### Frontend Integration
Coupon đã được tích hợp vào trang Payment:

```javascript
import CouponInput from '../components/CouponInput';

// Trong Payment component
<CouponInput
  onCouponApplied={handleCouponApplied}
  onCouponRemoved={handleCouponRemoved}
  originalAmount={ticket.totalPrice}
/>
```

## 📋 Cách sử dụng

### 1. Tạo coupon (Admin)
1. Đăng nhập admin panel
2. Vào menu "Mã giảm giá"
3. Click "Tạo mã giảm giá"
4. Điền thông tin:
   - **Mã coupon**: WELCOME10, SAVE20...
   - **Loại**: Percentage (%) hoặc Fixed (VNĐ)
   - **Giá trị**: Số tiền hoặc %
   - **Điều kiện**: Đơn hàng tối thiểu
   - **Giới hạn**: Số lượt sử dụng
   - **Hạn sử dụng**: Ngày hết hạn

### 2. Áp dụng coupon (User)
1. Vào trang thanh toán
2. Nhập mã giảm giá vào ô "Mã giảm giá"
3. Click "Áp dụng"
4. Hệ thống sẽ validate và hiển thị giảm giá
5. Hoàn tất thanh toán với giá đã giảm

## 🎯 Cấu trúc dữ liệu

### Coupon Model
```typescript
interface ICoupon {
  code: string;              // Mã coupon (unique, uppercase)
  discountType: 'percentage' | 'fixed';  // Loại giảm giá
  discountValue: number;     // Giá trị giảm
  minOrderValue: number;     // Đơn hàng tối thiểu
  maxDiscount?: number;      // Giảm tối đa (cho percentage)
  usageLimit: number;        // Giới hạn sử dụng
  usedCount: number;         // Số lượt đã dùng
  expiryDate: Date;          // Ngày hết hạn
  isActive: boolean;         // Trạng thái hoạt động
  description?: string;      // Mô tả
  createdBy: ObjectId;       // Admin tạo
}
```

## 🧪 Testing

### Chạy test system
```bash
node test-coupon-system.js
```

### Tạo sample coupons
```bash
chmod +x create-sample-coupons.sh
./create-sample-coupons.sh
```

### Test scenarios
1. **Percentage discount**: SAVE20 (20% off, max 300k, min 1tr)
2. **Fixed discount**: SAVE50K (50k off, min 200k)
3. **Expiring soon**: FLIGHT20 (20% off, expires in 7 days)
4. **High value**: VIP15 (15% off, max 500k, min 2tr)

## 🔒 Security

- ✅ **Admin authentication**: Chỉ admin mới quản lý được coupon
- ✅ **Input validation**: Validate tất cả input fields
- ✅ **Rate limiting**: Middleware validation trước khi apply
- ✅ **Usage tracking**: Theo dõi chính xác số lượt sử dụng
- ✅ **Expiry checking**: Tự động disable khi hết hạn

## 📊 API Examples

### Validate coupon
```javascript
POST /api/v1/coupons/validate
{
  "code": "WELCOME10",
  "orderValue": 1000000,
  "userId": "user_id_here",
  "flightId": "flight_id_here"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "coupon": {
      "code": "WELCOME10",
      "discountType": "percentage",
      "discountValue": 10,
      "maxDiscount": 200000
    },
    "discountAmount": 100000,
    "finalAmount": 900000,
    "isValid": true
  }
}
```

### Create coupon (Admin)
```javascript
POST /api/v1/coupons
{
  "code": "NEWYEAR25",
  "discountType": "percentage",
  "discountValue": 25,
  "minOrderValue": 1500000,
  "maxDiscount": 500000,
  "usageLimit": 100,
  "expiryDate": "2025-02-28",
  "description": "Giảm 25% cho dịp năm mới"
}
```

## 🎨 UI/UX Features

- **Beautiful design**: Material-UI components với theme nhất quán
- **Responsive**: Hoạt động tốt trên mọi thiết bị
- **Real-time feedback**: Validation và calculation ngay lập tức
- **Visual indicators**: Icons, colors, và animations
- **User-friendly**: Clear error messages và success feedback

## 🛠️ Maintenance

### Monitoring
- Track coupon usage trong admin dashboard
- Monitor expiry dates và disable tự động
- Generate reports về hiệu quả các campaign

### Performance
- Database indexes cho fast queries
- Caching cho frequently used coupons
- Optimized validation logic

## 🚨 Troubleshooting

### Common Issues
1. **Coupon not applying**: Check expiry date và usage limit
2. **Validation errors**: Verify input format và requirements
3. **Permission denied**: Ensure admin authentication

### Debug Tips
- Check browser console for errors
- Verify API endpoints và authentication
- Test với sample data trước

## 📈 Future Enhancements

- [ ] **Bulk coupon creation**: Upload CSV để tạo nhiều coupon
- [ ] **Coupon categories**: Phân loại coupon theo loại vé/chuyến bay
- [ ] **Auto-apply**: Tự động áp dụng coupon tốt nhất
- [ ] **Analytics**: Detailed reports về coupon performance
- [ ] **A/B testing**: Test hiệu quả các discount strategies

---

**🎉 Hệ thống coupon đã sẵn sàng cho production!**
