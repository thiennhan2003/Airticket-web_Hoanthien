import mongoose from 'mongoose';
import User from './src/models/users.model.js';
import bcrypt from 'bcryptjs';

// Thông tin admin mặc định
const adminData = {
  fullName: 'Administrator',
  email: 'admin2003@gmail.com',
  password: 'admin123',
  phoneNumber: '0123456789',
  role: 'admin',
  isActive: true
};

async function createAdmin() {
  try {
    // Kết nối MongoDB (thay đổi connection string nếu cần)
    await mongoose.connect('mongodb://127.0.0.1:27017/AirPlanes');
    console.log('✅ Kết nối MongoDB thành công');

    // Kiểm tra admin đã tồn tại chưa
    const existing = await User.findOne({ email: adminData.email });
    if (existing) {
      console.log('⚠️ Admin user đã tồn tại:', existing.email);
      return;
    }

    // Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);

    // Tạo admin user
    const admin = new User({
      ...adminData,
      password: hashedPassword
    });

    await admin.save();
    console.log('🎉 Admin user được tạo thành công!');
    console.log('📧 Email: admin2003@gmail.com');
    console.log('🔑 Mật khẩu: admin123');
    console.log('⚠️ Hãy đổi mật khẩu sau khi đăng nhập lần đầu!');

  } catch (error) {
    console.error('❌ Lỗi tạo admin:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔐 Kết nối database đã đóng');
  }
}

createAdmin();
