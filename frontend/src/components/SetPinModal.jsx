import React, { useState } from 'react';

const SetPinModal = ({ user, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: nhập PIN mới, 2: xác nhận, 3: nhập PIN hiện tại (nếu có)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (step === 1) {
      if (newPin.length < 4 || newPin.length > 6) {
        setError('PIN phải có 4-6 chữ số');
        return;
      }

      if (!/^\d+$/.test(newPin)) {
        setError('PIN chỉ được chứa chữ số');
        return;
      }

      setStep(2);
      setError('');
      return;
    }

    if (step === 2) {
      if (newPin !== confirmPin) {
        setError('PIN xác nhận không khớp');
        return;
      }

      // Nếu user đã có PIN, yêu cầu nhập PIN hiện tại
      if (user?.walletPin) {
        setStep(3);
        setError('');
        return;
      }

      // Nếu chưa có PIN, tiến hành thiết lập
      await submitPin();
      return;
    }

    if (step === 3) {
      await submitPin(currentPin);
      return;
    }
  };

  const submitPin = async (pinToVerify) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/wallet/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pin: newPin,
          currentPin: pinToVerify
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Không thể thiết lập PIN');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (value, setter) => {
    // Chỉ cho phép nhập số và giới hạn độ dài
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setter(numericValue);
  };

  const renderPinInput = (value, setter, placeholder) => (
    <input
      type="password"
      placeholder={placeholder}
      value={value}
      onChange={(e) => handlePinInput(e.target.value, setter)}
      maxLength={6}
      className="pin-input"
    />
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔐 Thiết lập PIN bảo mật</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="pin-setup-step">
              <div className="step-indicator">
                <span className="step active">1</span>
                <span className="step-line"></span>
                <span className="step">2</span>
                {user?.walletPin && <span className="step">3</span>}
              </div>

              <div className="pin-input-section">
                <label>Nhập mã PIN mới (4-6 chữ số)</label>
                {renderPinInput(newPin, setNewPin, '123456')}

                <div className="pin-requirements">
                  <p>📋 Yêu cầu:</p>
                  <ul>
                    <li>4-6 chữ số</li>
                    <li>Dễ nhớ nhưng khó đoán</li>
                    <li>Không dùng ngày sinh, số điện thoại</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pin-setup-step">
              <div className="step-indicator">
                <span className="step completed">1</span>
                <span className="step-line"></span>
                <span className="step active">2</span>
                {user?.walletPin && <span className="step">3</span>}
              </div>

              <div className="pin-input-section">
                <label>Xác nhận mã PIN</label>
                {renderPinInput(confirmPin, setConfirmPin, '123456')}

                {newPin && confirmPin && (
                  <div className={`pin-match ${newPin === confirmPin ? 'match' : 'no-match'}`}>
                    {newPin === confirmPin ? '✅ PIN khớp' : '❌ PIN không khớp'}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pin-setup-step">
              <div className="step-indicator">
                <span className="step completed">1</span>
                <span className="step-line"></span>
                <span className="step completed">2</span>
                <span className="step-line"></span>
                <span className="step active">3</span>
              </div>

              <div className="pin-input-section">
                <label>Nhập PIN hiện tại để xác nhận</label>
                {renderPinInput(currentPin, setCurrentPin, 'PIN hiện tại')}

                <div className="pin-warning">
                  <p>⚠️ Bạn đang thay đổi PIN bảo mật.</p>
                  <p>Vui lòng nhập PIN hiện tại để xác nhận.</p>
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>

          <div className="security-info">
            <p>🔒 PIN của bạn được mã hóa và bảo mật tuyệt đối.</p>
            <p>Không chia sẻ PIN với bất kỳ ai, kể cả nhân viên hỗ trợ.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPinModal;
