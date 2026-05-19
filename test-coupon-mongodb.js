const mongoose = require('mongoose');
require('dotenv').config();

async function testCouponSystem() {
  try {
    console.log('🧪 TESTING COUPON SYSTEM WITH MONGODB...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MongoDB_URI);
    console.log('✅ Connected to MongoDB successfully');

    const db = mongoose.connection.db;

    // Check existing collections
    console.log('\n📋 Available collections:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Import coupon model
    const Coupon = require('./src/models/coupon.model').default;

    // Test 1: Create sample coupon
    console.log('\n🧪 Test 1: Creating sample coupon...');
    const sampleCoupon = new Coupon({
      code: 'TEST123',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 100000,
      maxDiscount: 50000,
      usageLimit: 100,
      usedCount: 0,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      description: 'Test coupon for MongoDB integration',
      createdBy: new mongoose.Types.ObjectId()
    });

    await sampleCoupon.save();
    console.log('✅ Sample coupon created successfully');

    // Test 2: Validate coupon logic
    console.log('\n🧪 Test 2: Testing validation methods...');
    console.log(`   isValid(): ${sampleCoupon.isValid()}`);
    console.log(`   isExpired(): ${sampleCoupon.isExpired()}`);
    console.log(`   isUsageLimitReached(): ${sampleCoupon.isUsageLimitReached()}`);
    console.log(`   calculateDiscount(1000000): ${sampleCoupon.calculateDiscount(1000000)} VND`);

    // Test 3: Update coupon usage
    console.log('\n🧪 Test 3: Testing usage tracking...');
    sampleCoupon.usedCount += 1;
    await sampleCoupon.save();
    console.log(`   Used count: ${sampleCoupon.usedCount}/${sampleCoupon.usageLimit}`);

    // Test 4: Check database indexes
    console.log('\n🧪 Test 4: Checking database indexes...');
    const indexes = await db.collection('coupons').indexes();
    console.log('   Indexes created:');
    indexes.forEach(index => {
      console.log(`   - ${Object.keys(index.key)[0]}: ${Object.values(index.key)[0]}`);
    });

    // Test 5: Clean up
    console.log('\n🧪 Test 5: Cleaning up...');
    await Coupon.deleteOne({ code: 'TEST123' });
    console.log('✅ Test coupon removed');

    // Final verification
    const finalCoupons = await Coupon.find({});
    console.log(`\n🎯 Final state: ${finalCoupons.length} coupons in database`);

    await mongoose.disconnect();
    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCouponSystem();
