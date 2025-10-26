import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './Payment.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here');

// Payment Method Selection Component
const PaymentMethodSelector = ({ selectedMethod, onMethodChange, walletBalance, amount }) => {
  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Thẻ tín dụng',
      icon: '💳',
      description: 'Thanh toán bằng thẻ Visa, MasterCard',
      available: true
    },
    {
      id: 'wallet',
      name: 'Ví điện tử',
      icon: '👛',
      description: `Số dư: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(walletBalance)}`,
      available: walletBalance >= amount,
      disabled: walletBalance < amount
    }
  ];

  return (
    <div className="payment-methods">
      {paymentMethods.map((method) => (
        <div
          key={method.id}
          className={`payment-method-card ${selectedMethod === method.id ? 'selected' : ''} ${!method.available ? 'disabled' : ''}`}
          onClick={() => method.available && onMethodChange(method.id)}
        >
          <div className="method-header">
            <div className="method-icon">{method.icon}</div>
            <div className="method-info">
              <div className="method-name">{method.name}</div>
              <div className="method-description">{method.description}</div>
            </div>
            <div className="method-radio">
              <input
                type="radio"
                checked={selectedMethod === method.id}
                onChange={() => method.available && onMethodChange(method.id)}
                disabled={!method.available}
              />
            </div>
          </div>
          {!method.available && (
            <div className="method-error">
              {method.id === 'wallet' ? 'Số dư không đủ' : 'Phương thức không khả dụng'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Stripe Payment Form
const StripePaymentForm = ({ amount, currency, ticketId, onPaymentSuccess, onPaymentError }) => {
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
          body: JSON.stringify({ ticketId, amount, currency, paymentMethod: 'stripe' }),
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

// Wallet Payment Form
const WalletPaymentForm = ({ amount, ticketId, onPaymentSuccess, onPaymentError }) => {
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prevent multiple submissions
    if (loading || paymentCompleted) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:8080/api/v1/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId,
          amount,
          currency: 'vnd',
          paymentMethod: 'wallet',
          pin: pin
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentCompleted(true);
        setError('');
        onPaymentSuccess(data.data?.transactionId || 'wallet-payment');
      } else {
        const errorData = await response.json();
        if (errorData.statusCode === 400) {
          if (errorData.message.includes('PIN')) {
            setRequiresPin(true);
            setError(errorData.message);
          } else if (errorData.message.includes('already completed')) {
            // Payment đã hoàn thành trước đó
            setPaymentCompleted(true);
            setError('');
            onPaymentSuccess('already-paid');
          } else {
            setError(errorData.message || 'Thanh toán thất bại');
          }
        } else {
          setError(errorData.message || 'Thanh toán thất bại');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server');
    }

    setLoading(false);
  };

  return (
    <div className="payment-form wallet-payment">
      <h3>Tổng tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}</h3>

      {paymentCompleted ? (
        <div className="payment-success">
          <div className="success-icon">✅</div>
          <p className="success-message">Thanh toán đã hoàn thành thành công!</p>
          <p className="success-info">Không cần thực hiện thêm hành động nào.</p>
        </div>
      ) : (
        <>
          <p>💡 Thanh toán nhanh chóng bằng ví điện tử</p>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            {requiresPin && (
              <div className="form-group">
                <label>Nhập mã PIN ví điện tử</label>
                <input
                  type="password"
                  placeholder="1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <button type="submit" disabled={loading || paymentCompleted}>
              {loading ? 'Đang xử lý...' : `💰 Thanh toán ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}`}
            </button>
          </form>

          <p>⚡ Thanh toán ngay lập tức với ví điện tử của bạn</p>
        </>
      )}
    </div>
  );
};

// Main Payment Form Component
const PaymentForm = ({ amount, currency, ticketId, onPaymentSuccess, onPaymentError }) => {
  const [selectedMethod, setSelectedMethod] = useState('stripe');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    // Lấy thông tin ví điện tử
    const fetchWalletInfo = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('http://localhost:8080/api/v1/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setWalletBalance(data.data?.walletBalance || 0);

          // Tự động chọn ví nếu có đủ số dư
          if (data.data?.walletBalance >= amount) {
            setSelectedMethod('wallet');
          }
        }
      } catch (error) {
        console.error('Lỗi lấy thông tin ví:', error);
      }
    };

    fetchWalletInfo();
  }, [amount]);

  const renderPaymentForm = () => {
    switch (selectedMethod) {
      case 'wallet':
        return (
          <WalletPaymentForm
            amount={amount}
            ticketId={ticketId}
            onPaymentSuccess={onPaymentSuccess}
            onPaymentError={onPaymentError}
          />
        );
      case 'stripe':
      default:
        return (
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              amount={amount}
              currency={currency}
              ticketId={ticketId}
              onPaymentSuccess={onPaymentSuccess}
              onPaymentError={onPaymentError}
            />
          </Elements>
        );
    }
  };

  return (
    <div className="payment-form-container">
      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={setSelectedMethod}
        walletBalance={walletBalance}
        amount={amount}
      />

      <div className="payment-form-wrapper">
        {renderPaymentForm()}
      </div>
    </div>
  );
};

export default PaymentForm;
