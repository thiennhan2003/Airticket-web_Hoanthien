import React, { useState, useEffect } from 'react';
import './CouponInput.css';

const CouponInput = ({ onCouponApplied, onCouponRemoved, initialCoupon = null, originalAmount = 0 }) => {
  const [couponCode, setCouponCode] = useState(initialCoupon?.code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(initialCoupon);

  useEffect(() => {
    // Update originalAmount when prop changes
    if (originalAmount !== undefined) {
      // This will trigger re-validation if needed
    }
  }, [originalAmount]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Vui lòng nhập mã giảm giá');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderValue: originalAmount,
          userId: JSON.parse(localStorage.getItem('user') || '{}')._id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAppliedCoupon(data.data.coupon);
        onCouponApplied(data.data);
        setError('');
      } else {
        setError(data.message || 'Mã giảm giá không hợp lệ');
        setAppliedCoupon(null);
        onCouponRemoved();
      }
    } catch (err) {
      setError('Không thể kiểm tra mã giảm giá. Vui lòng thử lại.');
      console.error('Error validating coupon:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setError('');
    onCouponRemoved();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="coupon-input-container">
      {!appliedCoupon ? (
        <div className="coupon-input-form">
          <div className="coupon-input-field">
            <input
              type="text"
              placeholder="Nhập mã giảm giá (WELCOME10, SAVE20...)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className={error ? 'coupon-input error' : 'coupon-input'}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={loading || !couponCode.trim()}
              className="coupon-apply-btn"
            >
              {loading ? 'Đang kiểm tra...' : 'Áp dụng'}
            </button>
          </div>
          {error && <div className="coupon-error">{error}</div>}
        </div>
      ) : (
        <div className="coupon-applied">
          <div className="coupon-applied-header">
            <div className="coupon-applied-info">
              <div className="coupon-code">🎫 {appliedCoupon.code}</div>
              <div className="coupon-description">
                {appliedCoupon.description || `${appliedCoupon.discountType === 'percentage' ? 'Giảm ' + appliedCoupon.discountValue + '%' : 'Giảm ' + formatCurrency(appliedCoupon.discountValue)}`}
              </div>
              <div className="coupon-expiry">
                Hết hạn: {new Date(appliedCoupon.expiryDate).toLocaleDateString('vi-VN')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="coupon-remove-btn"
            >
              ✕
            </button>
          </div>
          <div className="coupon-discount-info">
            <div className="discount-badge">
              {appliedCoupon.discountType === 'percentage'
                ? `${appliedCoupon.discountValue}%`
                : formatCurrency(appliedCoupon.discountValue)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponInput;
