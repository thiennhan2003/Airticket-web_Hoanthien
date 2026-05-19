const mongoose = require('mongoose');
require('dotenv').config();

async function setupCouponCollection() {
  try {
    console.log('🗄️ SETTING UP COUPON COLLECTION IN MONGODB...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MongoDB_URI);
    console.log('✅ Connected to MongoDB successfully');

    // Get database instance
    const db = mongoose.connection.db;

    // List all collections
    console.log('\n📋 Current collections in database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check if coupons collection exists
    const couponExists = collections.some(col => col.name === 'coupons');

    if (couponExists) {
      console.log('\n✅ Coupons collection already exists!');

      // Show sample document structure
      const Coupon = require('./src/models/coupon.model').default;
      const sampleCoupons = await Coupon.find({}).limit(3);

      if (sampleCoupons.length > 0) {
        console.log('\n📄 Sample coupon document:');
        console.log(JSON.stringify(sampleCoupons[0], null, 2));
      } else {
        console.log('\n📄 No coupons found in database yet');
        console.log('   💡 You can create coupons through admin panel');
      }

    } else {
      console.log('\n❌ Coupons collection does not exist yet');
      console.log('   💡 Collection will be created automatically when first coupon is saved');

      // Create sample coupon to trigger collection creation
      const Coupon = require('./src/models/coupon.model').default;

      const sampleCoupon = new Coupon({
        code: 'TEST123',
        discountType: 'percentage',
        discountValue: 10,
        minOrderValue: 100000,
        maxDiscount: 50000,
        usageLimit: 100,
        usedCount: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        description: 'Test coupon for database setup',
        createdBy: new mongoose.Types.ObjectId()
      });

      await sampleCoupon.save();
      console.log('\n✅ Test coupon created - collection should now exist');

      // Clean up test coupon
      await Coupon.deleteOne({ code: 'TEST123' });
      console.log('✅ Test coupon cleaned up');
    }

    // Show database info
    console.log('\n📊 Database Information:');
    const dbStats = await db.stats();
    console.log(`   Database: ${dbStats.db}`);
    console.log(`   Collections: ${collections.length}`);
    console.log(`   Storage: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);

    await mongoose.disconnect();
    console.log('\n🎯 Database setup check completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupCouponCollection();
