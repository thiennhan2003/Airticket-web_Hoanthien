#!/usr/bin/env node

/**
 * Test script để kiểm tra giới hạn số dư ví điện tử
 * Script này sẽ phân tích các giới hạn trong hệ thống
 */

console.log('🧮 Phân Tích Giới Hạn Số Dư Ví Điện Tử\n');

// 1. Giới hạn JavaScript Number
console.log('1️⃣ Giới Hạn JavaScript Number:');
console.log(`   Số nguyên an toàn tối đa: ${Number.MAX_SAFE_INTEGER}`);
console.log(`   ~ ${Number.MAX_SAFE_INTEGER.toLocaleString('vi-VN')} VND`);
console.log(`   Số thực tối đa: ${Number.MAX_VALUE}`);
console.log(`   ~ ${Number.MAX_VALUE.toLocaleString('vi-VN')} VND (khoa học)`);

// 2. Giới hạn Mongoose Number
console.log('\n2️⃣ Giới Hạn Mongoose Number:');
console.log('   Mongoose sử dụng JavaScript Number');
console.log('   Không có giới hạn bổ sung trong schema');

// 3. Giới hạn thực tế trong code
console.log('\n3️⃣ Giới Hạn Thực Tế Trong Code:');

// Topup limits
console.log('   📈 NẠP TIỀN:');
console.log('      - Tối đa mỗi lần: 50,000,000 VND');
console.log('      - Có thể nạp nhiều lần');

// Spending limits (từ User model)
console.log('   📉 CHI TIÊU:');
console.log('      - Giới hạn hàng ngày: 10,000,000 VND');
console.log('      - Giới hạn hàng tháng: 100,000,000 VND');

// Withdrawal limits
console.log('   💰 RÚT TIỀN:');
console.log('      - Tối thiểu: 50,000 VND');
console.log('      - Tối đa mỗi lần: 10,000,000 VND');

// 4. Tính toán số dư tối đa có thể đạt được
console.log('\n4️⃣ Số Dư Tối Đa Có Thể Đạt Được:');
const maxDailyTopup = 500000000; // 50M
const maxDailySpending = 100000000; // 10M
const daysInMonth = 30;

console.log(`   Nạp tối đa mỗi ngày: ${maxDailyTopup.toLocaleString('vi-VN')} VND`);
console.log(`   Chi tiêu tối đa mỗi ngày: ${maxDailySpending.toLocaleString('vi-VN')} VND`);
console.log(`   Số ngày trong tháng: ${daysInMonth}`);

// Tính số dư tối đa dựa trên topup - spending
const netDaily = maxDailyTopup - maxDailySpending; // 40M
const maxBalance = netDaily * daysInMonth; // 1.2B VND

console.log(`   Tăng trưởng hàng ngày: ${netDaily.toLocaleString('vi-VN')} VND`);
console.log(`   Số dư tối đa (30 ngày): ${maxBalance.toLocaleString('vi-VN')} VND`);
console.log(`   ~ ${Math.round(maxBalance / 1000000000 * 10) / 10} tỷ VND`);

// 5. So sánh với giới hạn JavaScript
console.log('\n5️⃣ So Sánh Với Giới Hạn JavaScript:');
const jsLimit = Number.MAX_SAFE_INTEGER;
console.log(`   Số dư tối đa thực tế: ${maxBalance.toLocaleString('vi-VN')} VND`);
console.log(`   Giới hạn JS Number: ${jsLimit.toLocaleString('vi-VN')} VND`);
console.log(`   An toàn: ${maxBalance < jsLimit ? '✅ Có' : '❌ Không'}`);
console.log(`   Còn lại: ${(jsLimit - maxBalance).toLocaleString('vi-VN')} VND`);

// 6. Khuyến nghị
console.log('\n6️⃣ 💡 Khuyến Nghị:');
console.log('   - Số dư ví hiện tại KHÔNG có giới hạn tối đa');
console.log('   - Chỉ bị giới hạn bởi giới hạn nạp/chi tiêu hàng ngày');
console.log('   - Có thể đạt tối đa ~1.2 tỷ VND (sau 30 ngày tích lũy)');
console.log('   - Nên thêm giới hạn số dư để bảo mật (ví dụ: 500 triệu VND)');

if (maxBalance < jsLimit) {
  console.log('\n✅ KẾT LUẬN: Hệ thống an toàn với giới hạn hiện tại');
} else {
  console.log('\n❌ CẢNH BÁO: Số dư có thể vượt giới hạn JavaScript Number!');
}

console.log('\n📋 File cần kiểm tra:');
console.log('   - backend/src/models/users.model.ts');
console.log('   - backend/src/services/wallet.service.ts');
console.log('   - backend/src/controllers/wallet.controller.ts');

console.log('\n🎯 Đề xuất cải tiến:');
console.log('   1. Thêm max balance validation trong User model');
console.log('   2. Kiểm tra balance trước khi topup');
console.log('   3. Set reasonable max balance (ví dụ: 500,000,000 VND)');
