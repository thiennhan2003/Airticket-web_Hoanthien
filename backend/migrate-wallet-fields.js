// Migration script để thêm wallet fields cho users hiện có
const mongoose = require('mongoose');
const User = require('./src/models/users.model');

async function migrateWalletFields() {
  try {
    await mongoose.connect('mongodb://localhost:27017/flight_booking');

    // Cập nhật tất cả users với wallet fields mặc định
    const result = await User.updateMany(
      {
        walletBalance: { $exists: false }
      },
      {
        $set: {
          walletBalance: 0,
          isWalletActive: true,
          walletDailyLimit: 10000000, // 10 triệu VND
          walletMonthlyLimit: 100000000, // 100 triệu VND
          totalSpentInWallet: 0,
          totalTopupInWallet: 0,
          walletLevel: 'bronze'
        }
      }
    );

    console.log(`✅ Đã cập nhật ${result.modifiedCount} users với wallet fields`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    process.exit(1);
  }
}

migrateWalletFields();
