import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here');

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

      // Gọi API tạo payment intent cho topup
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
        } else {
          // Thanh toán bằng ví (nếu có số dư)
          onSuccess();
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

      <p className="security-note">
        🔒 Thanh toán được bảo mật bởi Stripe. Thông tin thẻ được mã hóa và bảo vệ.
      </p>
    </form>
  );
};

const TopupModal = ({ onClose, onSuccess }) => {
  const [selectedAmount, setSelectedAmount] = useState(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState(1); // 1: chọn số tiền, 2: thanh toán

  const amountOptions = [100000, 200000, 500000, 1000000, 2000000];

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
      <div className="modal-content wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💰 Nạp tiền vào ví</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {step === 1 && (
          <div className="modal-body">
            <div className="amount-selection">
              <h4>Chọn số tiền</h4>

              <div className="amount-options">
                {amountOptions.map((amount) => (
                  <button
                    key={amount}
                    className={`amount-option ${selectedAmount === amount ? 'selected' : ''}`}
                    onClick={() => handleAmountSelect(amount)}
                  >
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                  </button>
                ))}
              </div>

              <div className="custom-amount">
                <label>Tùy chỉnh số tiền</label>
                <input
                  type="text"
                  placeholder="Nhập số tiền"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />
              </div>

              <div className="amount-info">
                <p>💡 Số tiền tối thiểu: 10,000 VND</p>
                <p>💡 Số tiền tối đa: 50,000,000 VND</p>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button onClick={handleNext} className="btn-primary">
                Tiếp tục
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="modal-body">
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
    </div>
  );
};

export default TopupModal;
