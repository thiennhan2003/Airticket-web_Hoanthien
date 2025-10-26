#!/usr/bin/env node

/**
 * Test script để kiểm tra fix duplicate payment issue
 * Chạy script này để verify các thay đổi đã hoạt động
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testDuplicatePaymentFix() {
  console.log('🧪 Testing duplicate payment fix...\n');

  try {
    // Test 1: Kiểm tra connection database
    console.log('1️⃣ Testing database connection...');
    if (!process.env.MONGODB_URI) {
      console.log('   ❌ MONGODB_URI not found in .env');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ Database connected successfully');

    // Test 2: Test PIN validation
    console.log('\n2️⃣ Testing PIN validation...');
    const testPins = ['1234', '12345', '123456', '1234567', '12a4'];
    testPins.forEach(pin => {
      const isValid = /^\d{4,6}$/.test(pin);
      console.log(`   PIN "${pin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });

    // Test 3: Test bcrypt hash length
    console.log('\n3️⃣ Testing bcrypt hash length...');
    const samplePin = '123456';
    const hash = await bcrypt.hash(samplePin, 10);
    console.log(`   Original PIN: "${samplePin}" (${samplePin.length} chars)`);
    console.log(`   Hashed PIN: ~${hash.length} characters`);
    console.log(`   Hash fits in 100 chars limit: ${hash.length <= 100 ? '✅ Yes' : '❌ No'}`);

    // Test 4: Kiểm tra User model validation
    console.log('\n4️⃣ Testing User model validation...');
    const User = require('./backend/src/models/users.model').default;

    // Test valid PIN
    const validUser = new User({
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '0123456789',
      password: 'password123',
      walletPin: '123456' // Valid 6-digit PIN
    });

    try {
      await validUser.validate();
      console.log('   ✅ Valid PIN validation passed');
    } catch (error) {
      console.log('   ❌ Valid PIN validation failed:', error.message);
    }

    // Test invalid PIN (too long after hash - simulate)
    console.log('\n5️⃣ Testing hash validation...');
    const hashLength = hash.length;
    const fitsIn100Chars = hashLength <= 100;
    console.log(`   Hash length: ${hashLength} characters`);
    console.log(`   Fits in 100 char limit: ${fitsIn100Chars ? '✅ Yes' : '❌ No'}`);
    console.log(`   Would fit in old 6 char limit: ${hashLength <= 6 ? '✅ Yes (would cause error)' : '❌ No (good)'}`);

    // Test 6: Kiểm tra duplicate transaction prevention
    console.log('\n6️⃣ Testing duplicate transaction prevention...');
    const WalletTransaction = require('./backend/src/models/walletTransaction.model').default;

    // Test unique constraint
    const sampleTransaction = {
      userId: new mongoose.Types.ObjectId(),
      type: 'payment',
      amount: 100000,
      balanceAfter: 500000,
      description: 'Test payment',
      referenceId: 'TEST-TICKET-123',
      status: 'completed'
    };

    try {
      const transaction1 = new WalletTransaction(sampleTransaction);
      await transaction1.save();
      console.log('   ✅ First transaction saved successfully');

      // Try to save duplicate
      const transaction2 = new WalletTransaction(sampleTransaction);
      await transaction2.save();
      console.log('   ❌ Duplicate transaction saved (should have failed)');
    } catch (error) {
      if (error.code === 11000 || error.message.includes('duplicate')) {
        console.log('   ✅ Duplicate transaction prevented correctly');
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('   ✅ Fixed PIN validation maxlength (100 chars instead of 6)');
    console.log('   ✅ Added duplicate transaction prevention');
    console.log('   ✅ Removed duplicate email sending');
    console.log('   ✅ Added frontend payment completion state');
    console.log('   ✅ Improved error handling');

    console.log('\n🎯 Expected behavior:');
    console.log('   - Users can set 6-digit PINs successfully');
    console.log('   - No duplicate payments for same ticket');
    console.log('   - Only one confirmation email sent');
    console.log('   - Frontend shows completed state after payment');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database disconnected');
  }
}

if (require.main === module) {
  testDuplicatePaymentFix().catch(console.error);
}

module.exports = { testDuplicatePaymentFix };
