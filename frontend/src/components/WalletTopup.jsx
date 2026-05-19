import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here');

// Topup Form Component
const TopupForm = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe chưa được khởi tạo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');

      // Tạo payment intent cho topup
      const response = await fetch('http://localhost:8080/api/v1/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount,
          paymentMethod: 'stripe'
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data.paymentIntentId) {
          // Xử lý với Stripe
          const cardElement = elements.getElement(CardElement);

          const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
            data.data.clientSecret,
            {
              payment_method: {
                card: cardElement,
              },
            }
          );

          if (stripeError) {
            setError(stripeError.message || 'Thanh toán thất bại');
          } else if (paymentIntent.status === 'succeeded') {
            // Xác nhận topup
            const confirmResponse = await fetch('http://localhost:8080/api/v1/wallet/confirm-topup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                paymentIntentId: paymentIntent.id
              }),
            });

            if (confirmResponse.ok) {
              onSuccess();
            } else {
              setError('Không thể xác nhận nạp tiền');
            }
          }
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Không thể nạp tiền');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server');
    }

    setLoading(false);
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' }
      },
      invalid: { color: '#fa755a', iconColor: '#fa755a' },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="topup-form">
      <div className="form-group">
        <label>Số tiền nạp</label>
        <div className="amount-display">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Thông tin thẻ</label>
        <div className="card-element-container">
          {stripe && elements ? (
            <CardElement options={cardStyle} />
          ) : (
            <div>Đang tải...</div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={!stripe || loading} className="btn-primary">
          {loading ? 'Đang xử lý...' : `Nạp ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}`}
        </button>
      </div>

      <div className="security-info">
        <p>🔒 Thanh toán được bảo mật bởi Stripe</p>
        <p>💰 Số tiền sẽ được cộng vào ví ngay sau khi xác nhận</p>
      </div>
    </form>
  );
};

// Main Wallet Topup Component
const WalletTopup = ({ onClose, onSuccess }) => {
  const [selectedAmount, setSelectedAmount] = useState(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState(1); // 1: chọn số tiền, 2: thanh toán

  const amountOptions = [
    { value: 100000, label: '100.000 VND' },
    { value: 200000, label: '200.000 VND' },
    { value: 500000, label: '500.000 VND' },
    { value: 1000000, label: '1.000.000 VND' },
    { value: 2000000, label: '2.000.000 VND' }
  ];

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(parseInt(value));
    }
  };

  const handleNext = () => {
    if (selectedAmount >= 10000) {
      setStep(2);
    } else {
      alert('Số tiền tối thiểu là 10,000 VND');
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wallet-topup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💰 Nạp tiền vào ví điện tử</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="amount-selection">
              <div className="step-indicator">
                <span className="step active">1</span>
                <span className="step-line"></span>
                <span className="step">2</span>
              </div>

              <h4>Chọn số tiền nạp</h4>

              <div className="amount-options">
                {amountOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`amount-option ${selectedAmount === option.value ? 'selected' : ''}`}
                    onClick={() => handleAmountSelect(option.value)}
                  >
                    <div className="option-amount">{option.label}</div>
                    <div className="option-popular">
                      {option.value >= 1000000 ? '🔥 Phổ biến' : ''}
                    </div>
                  </button>
                ))}
              </div>

              <div className="custom-amount">
                <label>Số tiền tùy chỉnh</label>
                <input
                  type="text"
                  placeholder="Nhập số tiền (VNĐ)"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="custom-amount-input"
                />
              </div>

              <div className="amount-info">
                <div className="info-item">
                  <span className="info-icon">💡</span>
                  <span>Số tiền tối thiểu: 10,000 VND</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">💰</span>
                  <span>Số tiền tối đa: 50,000,000 VND</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">⚡</span>
                  <span>Xử lý ngay lập tức</span>
                </div>
              </div>

              <div className="selected-amount">
                <span className="label">Số tiền đã chọn:</span>
                <span className="amount">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalAmount)}
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="payment-section">
              <div className="step-indicator">
                <span className="step completed">1</span>
                <span className="step-line"></span>
                <span className="step active">2</span>
              </div>

              <div className="payment-summary">
                <h4>📋 Xác nhận nạp tiền</h4>
                <div className="summary-item">
                  <span>Số tiền nạp:</span>
                  <span className="amount">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalAmount)}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Phương thức:</span>
                  <span>💳 Thẻ tín dụng/ghi nợ</span>
                </div>
                <div className="summary-item">
                  <span>Thời gian xử lý:</span>
                  <span>⚡ Ngay lập tức</span>
                </div>
              </div>

              <Elements stripe={stripePromise}>
                <TopupForm
                  amount={finalAmount}
                  onSuccess={onSuccess}
                  onCancel={handleBack}
                />
              </Elements>
            </div>
          )}
        </div>

        {step === 1 && (
          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button onClick={handleNext} className="btn-primary">
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletTopup;
