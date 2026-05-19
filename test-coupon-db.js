const mongoose = require('mongoose');
require('dotenv').config();

async function testCouponSystem() {
  try {
    console.log('🧪 Testing Coupon System Connection...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MongoDB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Get database instance
    const db = mongoose.connection.db;

    // List all collections
    console.log('\n📋 Available collections:');
    const collections = await db.listCollections().toArray();

    let couponCollectionExists = false;
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
      if (col.name === 'coupons') {
        couponCollectionExists = true;
      }
    });

    console.log(`\n🎫 Coupon collection exists: ${couponCollectionExists ? '✅ YES' : '❌ NO'}`);

    // Test coupon model registration
    try {
      const Coupon = require('./src/models/coupon.model').default;

      // Try to create a test coupon
      const testCoupon = new Coupon({
        code: 'TEST123',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 100000,
        maxDiscount: 50000,
        usageLimit: 10,
        usedCount: 0,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        description: 'Test coupon for system verification',
        createdBy: new mongoose.Types.ObjectId()
      });

      console.log('\n🧪 Testing coupon creation...');
      await testCoupon.save();
      console.log('✅ Test coupon created successfully');

      // Clean up test coupon
      await Coupon.deleteOne({ code: 'TEST123' });
      console.log('✅ Test coupon cleaned up');

    } catch (error) {
      console.log('❌ Error testing coupon model:', error.message);
    }

    await mongoose.disconnect();
    console.log('\n🎯 Connection test completed!');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testCouponSystem();
