import mongoose from 'mongoose';

export const fixFlightIndexes = async () => {
  try {
    // Kiểm tra kết nối MongoDB
    if (!mongoose.connection.db) {
      throw new Error('MongoDB chưa được kết nối');
    }

    const db = mongoose.connection.db;
    const flightsCollection = db.collection('flights');

    console.log('🔧 Đang khắc phục indexes cho flights collection...');

    // Lấy tất cả indexes hiện tại
    const indexes = await flightsCollection.indexes();
    console.log('📋 Các index hiện tại:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${JSON.stringify(index, null, 2)}`);
    });

    // Xóa tất cả indexes liên quan đến flightCode và flightNumber
    for (const index of indexes) {
      if (index.name && (index.name.includes('flightCode') || index.name.includes('flightNumber'))) {
        console.log(`🗑️  Xóa index: ${index.name}`);
        await flightsCollection.dropIndex(index.name);
      }
    }

    // Tạo lại unique index trên flightNumber
    await flightsCollection.createIndex(
      { flightNumber: 1 },
      {
        unique: true,
        name: 'flightNumber_1',
        background: true
      }
    );

    console.log('✅ Đã tạo unique index mới trên flightNumber');

    // Xóa dữ liệu có flightNumber null
    const nullResult = await flightsCollection.deleteMany({
      $or: [
        { flightNumber: null },
        { flightNumber: { $exists: false } }
      ]
    });

    console.log(`🧹 Đã xóa ${nullResult.deletedCount} bản ghi có flightNumber null hoặc không tồn tại`);

    console.log('✅ Hoàn thành khắc phục indexes!');

    return {
      success: true,
      message: 'Đã khắc phục indexes thành công'
    };

  } catch (error) {
    console.error('❌ Lỗi khi khắc phục indexes:', error);
    throw error;
  }
};
