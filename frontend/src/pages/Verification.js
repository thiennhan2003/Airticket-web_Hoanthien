import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Verification.css';

const Verification = ({ setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút countdown

  // Lấy thông tin từ location state (sau khi đăng nhập)
  const userEmail = location.state?.email || '';
  const tempToken = location.state?.tempToken || '';

  useEffect(() => {
    if (!userEmail || !tempToken) {
      navigate('/login');
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userEmail, tempToken, navigate]);

  // Format thời gian còn lại
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Xử lý xác nhận mã
  const handleVerify = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setError('Vui lòng nhập mã xác nhận');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Mã xác nhận phải có 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          verificationCode: verificationCode.trim(),
          tempToken: tempToken
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Lưu token và thông tin user
        localStorage.setItem('accessToken', result.data.token.accessToken);
        
        // Lưu refreshToken nếu có
        if (result.data.token.refreshToken) {
          localStorage.setItem('refreshToken', result.data.token.refreshToken);
        }
        
        setUser(result.data.user);

        // Điều hướng đến trang chủ
        navigate('/');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Mã xác nhận không đúng');
      }
    } catch (error) {
      console.error('Lỗi xác nhận:', error);
      setError('Không thể xác nhận. Vui lòng thử lại sau!');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã xác nhận
  const handleResend = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/auth/resend-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          tempToken: tempToken
        })
      });

      if (response.ok) {
        setTimeLeft(300); // Reset countdown
        alert('Đã gửi lại mã xác nhận về email của bạn');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Không thể gửi lại mã xác nhận');
      }
    } catch (error) {
      console.error('Lỗi gửi lại mã:', error);
      setError('Không thể gửi lại mã xác nhận. Vui lòng thử lại sau!');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="verification-container">
      <div className="verification-card">
        <div className="verification-header">
          <h2>🔐 Xác nhận đăng nhập</h2>
          <p>Nhập mã xác nhận được gửi về email của bạn</p>
        </div>

        <div className="email-info">
          <div className="email-icon">📧</div>
          <div className="email-text">
            <p><strong>Email:</strong> {userEmail}</p>
            <p className="email-hint">Kiểm tra hộp thư đến và thư rác</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="verification-form">
          <div className="form-group">
            <label htmlFor="verificationCode">Mã xác nhận (6 chữ số):</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              disabled={loading}
              className="verification-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading || timeLeft === 0}
            className="verify-btn"
          >
            {loading ? 'Đang xác nhận...' : 'Xác nhận'}
          </button>
        </form>

        <div className="verification-footer">
          <div className="timer">
            {timeLeft > 0 ? (
              <p>⏰ Mã xác nhận hết hạn sau: <strong>{formatTime(timeLeft)}</strong></p>
            ) : (
              <p className="expired">⏰ Mã xác nhận đã hết hạn</p>
            )}
          </div>

          <button
            onClick={handleResend}
            disabled={resendLoading || timeLeft === 0}
            className="resend-btn"
          >
            {resendLoading ? 'Đang gửi...' : 'Gửi lại mã xác nhận'}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="back-btn"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default Verification;
