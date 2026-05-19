/**
 * VALIDATION FLOW: Khi nào coupon được coi là VALID
 *
 * API: POST /api/v1/coupons/validate
 * Body: { code: "WELCOME10", orderValue: 1000000, userId: "...", flightId: "..." }
 */

async function validateCoupon(code, orderValue, userId, flightId) {
  // 1️⃣ Tìm coupon trong database
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true  // ✅ Phải active
  });

  if (!coupon) {
    return { valid: false, message: "Coupon not found or inactive" };
  }

  // 2️⃣ Kiểm tra hết hạn
  if (coupon.isExpired()) {
    return { valid: false, message: "Coupon has expired" };
  }

  // 3️⃣ Kiểm tra giới hạn sử dụng
  if (coupon.isUsageLimitReached()) {
    return { valid: false, message: "Coupon usage limit reached" };
  }

  // 4️⃣ Kiểm tra đơn hàng tối thiểu
  if (orderValue < coupon.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value of ${coupon.minOrderValue.toLocaleString('vi-VN')} VND required`
    };
  }

  // 5️⃣ Kiểm tra áp dụng cho flight cụ thể (nếu có)
  if (coupon.applicableFlights?.length > 0) {
    if (!flightId || !coupon.applicableFlights.includes(flightId)) {
      return { valid: false, message: "Coupon not applicable to this flight" };
    }
  }

  // 6️⃣ Kiểm tra áp dụng cho user cụ thể (nếu có)
  if (coupon.applicableUsers?.length > 0) {
    if (!userId || !coupon.applicableUsers.includes(userId)) {
      return { valid: false, message: "Coupon not applicable to this user" };
    }
  }

  // ✅ TẤT CẢ ĐIỀU KIỆN ĐỀU THỎA MÃN
  return {
    valid: true,
    coupon,
    discountAmount: coupon.calculateDiscount(orderValue),
    finalAmount: orderValue - coupon.calculateDiscount(orderValue),
    message: "Coupon is valid"
  };
}
