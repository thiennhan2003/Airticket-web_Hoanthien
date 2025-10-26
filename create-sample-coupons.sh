#!/bin/bash

# Script để tạo sample coupons cho testing
echo "🧪 Creating sample coupons for testing..."

# Sample coupons data
cat > sample-coupons.json << EOF
[
  {
    "code": "WELCOME10",
    "discountType": "percentage",
    "discountValue": 10,
    "minOrderValue": 500000,
    "maxDiscount": 200000,
    "usageLimit": 1000,
    "expiryDate": "$(date -d '+30 days' -I)",
    "description": "Giảm 10% cho đơn hàng từ 500k VND (tối đa 200k VND)"
  },
  {
    "code": "SAVE50K",
    "discountType": "fixed",
    "discountValue": 50000,
    "minOrderValue": 200000,
    "usageLimit": 500,
    "expiryDate": "$(date -d '+15 days' -I)",
    "description": "Giảm 50k VND cho đơn hàng từ 200k VND"
  },
  {
    "code": "FLIGHT20",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderValue": 1000000,
    "maxDiscount": 300000,
    "usageLimit": 200,
    "expiryDate": "$(date -d '+7 days' -I)",
    "description": "Giảm 20% cho đơn hàng từ 1tr VND (tối đa 300k VND)"
  },
  {
    "code": "NEWUSER",
    "discountType": "fixed",
    "discountValue": 100000,
    "minOrderValue": 300000,
    "usageLimit": 100,
    "expiryDate": "$(date -d '+60 days' -I)",
    "description": "Giảm 100k VND cho khách hàng mới"
  },
  {
    "code": "VIP15",
    "discountType": "percentage",
    "discountValue": 15,
    "minOrderValue": 2000000,
    "maxDiscount": 500000,
    "usageLimit": 50,
    "expiryDate": "$(date -d '+20 days' -I)",
    "description": "Giảm 15% cho VIP (tối đa 500k VND)"
  }
]
EOF

echo "✅ Sample coupons data created in sample-coupons.json"
echo ""
echo "📋 To create these coupons in database:"
echo "1. Login to admin panel"
echo "2. Go to 'Mã giảm giá' section"
echo "3. Click 'Tạo mã giảm giá'"
echo "4. Fill in the details from sample-coupons.json"
echo ""
echo "🎯 Sample coupons ready for testing!"
echo ""
echo "📝 Testing scenarios:"
echo "- Test percentage discounts with different order values"
echo "- Test fixed amount discounts"
echo "- Test minimum order value validation"
echo "- Test expiry date validation"
echo "- Test usage limit tracking"
echo "- Test admin statistics"
