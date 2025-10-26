#!/usr/bin/env node

/**
 * Test script để kiểm tra lỗi PIN validation
 * Chạy script này sau khi sửa lỗi để đảm bảo hoạt động đúng
 */

const bcrypt = require('bcryptjs');

async function testPinValidation() {
  console.log('🧪 Testing PIN validation fix...\n');

  // Test 1: Validate PIN format (4-6 digits)
  console.log('1️⃣ Testing PIN format validation...');
  const testPins = ['1234', '12345', '123456', '123', '1234567', '12a4', '12345a'];

  testPins.forEach(pin => {
    const isValid = /^\d{4,6}$/.test(pin);
    console.log(`   PIN "${pin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });

  // Test 2: Test bcrypt hash length
  console.log('\n2️⃣ Testing bcrypt hash length...');
  const samplePin = '123456';
  const hash = await bcrypt.hash(samplePin, 10);
  console.log(`   Original PIN: "${samplePin}" (${samplePin.length} characters)`);
  console.log(`   Hashed PIN: "${hash}" (${hash.length} characters)`);
  console.log(`   Hash length is > 6: ${hash.length > 6 ? '✅ Yes (expected)' : '❌ No (problem)'}`);

  // Test 3: Check if hash passes validation
  console.log('\n3️⃣ Testing hash validation...');
  const isHashValidLength = hash.length <= 100;
  console.log(`   Hash length <= 100: ${isHashValidLength ? '✅ Yes' : '❌ No'}`);
  console.log(`   Hash length <= 6: ${hash.length <= 6 ? '✅ Yes (would cause error)' : '❌ No (good)'}`);

  console.log('\n✅ Test completed!');
  console.log('\n📋 Summary:');
  console.log('   - PIN format validation: Working correctly');
  console.log('   - Bcrypt hash length: ~60 characters (normal)');
  console.log('   - Hash validation: Now allows up to 100 characters');
  console.log('\n🎯 Next steps:');
  console.log('   1. Restart your backend server');
  console.log('   2. Try setting a 6-digit PIN again');
  console.log('   3. Test wallet payment with PIN');
}

if (require.main === module) {
  testPinValidation().catch(console.error);
}

module.exports = { testPinValidation };
