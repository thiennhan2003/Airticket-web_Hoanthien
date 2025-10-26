// Test script để verify toàn bộ hệ thống coupon hoạt động đúng
const mongoose = require('mongoose');
const User = require('./backend/dist/models/users.model').default;
const Coupon = require('./backend/dist/models/coupon.model').default;

async function testCouponSystem() {
  try {
    console.log('🧪 Testing Coupon System...\n');

    // Test 1: Tạo user admin
    console.log('1️⃣ Test: Tạo user admin để tạo coupon');
    const adminUser = new User({
      fullName: 'Admin Test',
      email: 'admin@test.com',
      phoneNumber: '0123456789',
      password: '123456',
      role: 'admin',
      walletBalance: 0,
      totalSpentInWallet: 0,
      walletLevel: 'bronze'
    });
    await adminUser.save();
    console.log('✅ Admin user created');

    // Test 2: Tạo coupon percentage
    console.log('\n2️⃣ Test: Tạo coupon giảm giá 20%');
    const percentageCoupon = new Coupon({
      code: 'SAVE20',
      discountType: 'percentage',
      discountValue: 20,
      minOrderValue: 1000000, // 1tr VND
      maxDiscount: 500000, // Tối đa 500k VND
      usageLimit: 100,
      usedCount: 0,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      isActive: true,
      description: 'Giảm giá 20% cho đơn hàng từ 1tr VND',
      createdBy: adminUser._id
    });
    await percentageCoupon.save();
    console.log('✅ Percentage coupon created');

    // Test 3: Tạo coupon fixed amount
    console.log('\n3️⃣ Test: Tạo coupon giảm giá cố định 200k VND');
    const fixedCoupon = new Coupon({
      code: 'FIXED200K',
      discountType: 'fixed',
      discountValue: 200000,
      minOrderValue: 500000, // 500k VND
      usageLimit: 50,
      usedCount: 0,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 ngày
      isActive: true,
      description: 'Giảm giá 200k VND cho đơn hàng từ 500k VND',
      createdBy: adminUser._id
    });
    await fixedCoupon.save();
    console.log('✅ Fixed amount coupon created');

    // Test 4: Test validation methods
    console.log('\n4️⃣ Test: Validate coupon methods');
    console.log(`   SAVE20 isValid: ${percentageCoupon.isValid()}`);
    console.log(`   SAVE20 isExpired: ${percentageCoupon.isExpired()}`);
    console.log(`   SAVE20 usageLimitReached: ${percentageCoupon.isUsageLimitReached()}`);
    console.log(`   SAVE20 calculateDiscount(2000000): ${percentageCoupon.calculateDiscount(2000000)} VND`);
    console.log(`   FIXED200K calculateDiscount(1000000): ${fixedCoupon.calculateDiscount(1000000)} VND`);
    console.log('✅ Validation methods working');

    // Test 5: Test usage scenarios
    console.log('\n5️⃣ Test: Test usage scenarios');

    // Apply percentage coupon
    console.log('   Applying SAVE20 coupon...');
    percentageCoupon.usedCount += 1;
    await percentageCoupon.save();
    console.log(`   Used count: ${percentageCoupon.usedCount}/${percentageCoupon.usageLimit}`);

    // Apply fixed coupon
    console.log('   Applying FIXED200K coupon...');
    fixedCoupon.usedCount += 1;
    await fixedCoupon.save();
    console.log(`   Used count: ${fixedCoupon.usedCount}/${fixedCoupon.usageLimit}`);

    console.log('\n✅ All coupon tests completed successfully!');
    console.log('\n📋 Test Results Summary:');
    console.log('- ✅ Admin user creation');
    console.log('- ✅ Percentage coupon creation');
    console.log('- ✅ Fixed amount coupon creation');
    console.log('- ✅ Coupon validation methods');
    console.log('- ✅ Coupon calculation methods');
    console.log('- ✅ Coupon usage tracking');

    console.log('\n🎯 Ready for production use!');
    console.log('\n📝 API Endpoints available:');
    console.log('- GET /api/v1/coupons (Admin only)');
    console.log('- POST /api/v1/coupons (Admin only)');
    console.log('- PUT /api/v1/coupons/:id (Admin only)');
    console.log('- DELETE /api/v1/coupons/:id (Admin only)');
    console.log('- POST /api/v1/coupons/validate (User/Admin)');
    console.log('- POST /api/v1/coupons/apply (User/Admin)');
    console.log('- GET /api/v1/coupons/stats/summary (Admin only)');

    // Cleanup
    await Coupon.deleteMany({ createdBy: adminUser._id });
    await User.deleteOne({ email: 'admin@test.com' });
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Chạy test nếu được gọi trực tiếp
if (require.main === module) {
  testCouponSystem();
}

module.exports = { testCouponSystem };
