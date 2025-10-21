import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './Payment.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here');

const CheckoutForm = ({ amount, currency, ticketId, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');

  // Các state cho form fake
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Không tìm thấy token xác thực');
          return;
        }

        const response = await fetch('http://localhost:8080/api/v1/payments/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ticketId, amount, currency }),
        });

        if (response.ok) {
          const data = await response.json();
          setClientSecret(data.data?.clientSecret || '');
          if (!data.data?.clientSecret) setError('Không nhận được client secret từ server');
        } else {
          const err = await response.json();
          setError(err.message || 'Không thể tạo payment intent');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi kết nối server');
      }
    };

    if (ticketId && amount > 0) createPaymentIntent();
    else setError('Thiếu thông tin vé hoặc số tiền không hợp lệ');
  }, [ticketId, amount, currency]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return setError('Stripe chưa được khởi tạo');
    if (!clientSecret) return setError('Chưa nhận được client secret');

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return setError('Không tìm thấy form thẻ');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: name || 'Khách hàng' },
        },
      });

      if (stripeError) setError(stripeError.message || 'Thanh toán thất bại');
      else if (paymentIntent.status === 'succeeded') {
        const token = localStorage.getItem('accessToken');
        const confirmResponse = await fetch('http://localhost:8080/api/v1/payments/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        if (confirmResponse.ok) onPaymentSuccess(paymentIntent.id);
        else {
          const errData = await confirmResponse.json();
          setError(errData.message || 'Không thể xác nhận thanh toán');
        }
      } else setError('Thanh toán không thành công');
    } catch (err) {
      console.error(err);
      setError('Lỗi xử lý thanh toán');
    }
    setLoading(false);
  };

  const cardStyle = {
    style: {
      base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
      invalid: { color: '#fa755a', iconColor: '#fa755a' },
    },
  };

  return (
    <div className="payment-form">
      <h3>Tổng tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount)}</h3>
      <p>Thanh toán an toàn với Stripe</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Tên chủ thẻ */}
        <div className="form-group">
          <label>Tên chủ thẻ</label>
          <input
            type="text"
            placeholder="NGUYEN VAN A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Fake card inputs */}
        <div className="form-group-inline">
          <input
            type="text"
            placeholder="Số thẻ 1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Stripe CardElement thực tế */}
        <div className="form-group">
          <label>Thông tin thẻ</label>
          <div className="card-element-container">
            {stripe && elements ? <CardElement options={cardStyle} /> : <div>Đang tải...</div>}
          </div>
        </div>

        <button type="submit" disabled={!stripe || !clientSecret || loading}>
          {loading ? 'Đang xử lý...' : `Thanh toán ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount)}`}
        </button>
      </form>

      <p>🔒 Thanh toán được bảo mật bởi Stripe. Thông tin thẻ được mã hóa và bảo vệ.</p>
    </div>
  );
};

const PaymentForm = (props) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm {...props} />
  </Elements>
);

export default PaymentForm;
