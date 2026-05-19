import React, { useState } from 'react';

const WithdrawModal = ({ user, walletInfo, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handleSubmit = async () => {
    if (step === 1) {
      const numAmount = parseInt(amount);

      if (!amount || numAmount < 50000) {
        setError('Số tiền tối thiểu là 50,000 VND');
        return;
      }

      if (numAmount > walletInfo?.walletBalance) {
        setError('Số tiền vượt quá số dư ví');
        return;
      }

      if (numAmount > 10000000) {
        setError('Số tiền tối đa là 10,000,000 VND');
        return;
      }

      setStep(2);
      setError('');
      return;
    }

    if (step === 2) {
      if (!bankAccount.bankName || !bankAccount.accountNumber || !bankAccount.accountHolder) {
        setError('Vui lòng điền đầy đủ thông tin tài khoản');
        return;
      }

      setStep(3);
      setError('');
      return;
    }

    if (step === 3) {
      await submitWithdrawal();
      return;
    }
  };

  const submitWithdrawal = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseInt(amount),
          bankAccount: bankAccount,
          pin: pin
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Không thể rút tiền');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content withdraw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💸 Rút tiền từ ví</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="withdraw-step">
              <div className="step-indicator">
                <span className="step active">1</span>
                <span className="step-line"></span>
                <span className="step">2</span>
                <span className="step">3</span>
              </div>

              <div className="amount-input-section">
                <label>Số tiền cần rút</label>
                <input
                  type="text"
                  placeholder="50000"
                  value={amount}
                  onChange={handleAmountChange}
                  className="amount-input"
                />

                <div className="balance-info">
                  <span>Số dư hiện tại: {formatCurrency(walletInfo?.walletBalance || 0)}</span>
                </div>

                <div className="amount-limits">
                  <p>💡 Giới hạn:</p>
                  <ul>
                    <li>Tối thiểu: 50,000 VND</li>
                    <li>Tối đa: 10,000,000 VND</li>
                    <li>Thời gian xử lý: 1-3 ngày làm việc</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="withdraw-step">
              <div className="step-indicator">
                <span className="step completed">1</span>
                <span className="step-line"></span>
                <span className="step active">2</span>
                <span className="step">3</span>
              </div>

              <div className="bank-account-section">
                <label>Thông tin tài khoản nhận tiền</label>

                <div className="form-group">
                  <label>Ngân hàng</label>
                  <select
                    value={bankAccount.bankName}
                    onChange={(e) => setBankAccount({...bankAccount, bankName: e.target.value})}
                    className="bank-select"
                  >
                    <option value="">Chọn ngân hàng</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="VietinBank">VietinBank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="Agribank">Agribank</option>
                    <option value="Sacombank">Sacombank</option>
                    <option value="Techcombank">Techcombank</option>
                    <option value="VPBank">VPBank</option>
                    <option value="TPBank">TPBank</option>
                    <option value="MBBank">MBBank</option>
                    <option value="ACB">ACB</option>
                    <option value="SHB">SHB</option>
                    <option value="VIB">VIB</option>
                    <option value="MSB">MSB</option>
                    <option value="OCB">OCB</option>
                    <option value="IVB">IVB</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Số tài khoản</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    value={bankAccount.accountNumber}
                    onChange={(e) => setBankAccount({...bankAccount, accountNumber: e.target.value})}
                    className="account-input"
                  />
                </div>

                <div className="form-group">
                  <label>Tên chủ tài khoản</label>
                  <input
                    type="text"
                    placeholder="NGUYEN VAN A"
                    value={bankAccount.accountHolder}
                    onChange={(e) => setBankAccount({...bankAccount, accountHolder: e.target.value.toUpperCase()})}
                    className="holder-input"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="withdraw-step">
              <div className="step-indicator">
                <span className="step completed">1</span>
                <span className="step-line"></span>
                <span className="step completed">2</span>
                <span className="step-line"></span>
                <span className="step active">3</span>
              </div>

              <div className="confirmation-section">
                <div className="withdrawal-summary">
                  <h4>📋 Xác nhận rút tiền</h4>
                  <div className="summary-item">
                    <span>Số tiền:</span>
                    <span>{formatCurrency(parseInt(amount))}</span>
                  </div>
                  <div className="summary-item">
                    <span>Ngân hàng:</span>
                    <span>{bankAccount.bankName}</span>
                  </div>
                  <div className="summary-item">
                    <span>Số tài khoản:</span>
                    <span>{bankAccount.accountNumber}</span>
                  </div>
                  <div className="summary-item">
                    <span>Chủ tài khoản:</span>
                    <span>{bankAccount.accountHolder}</span>
                  </div>
                  <div className="summary-item">
                    <span>Số dư sau rút:</span>
                    <span>{formatCurrency((walletInfo?.walletBalance || 0) - parseInt(amount))}</span>
                  </div>
                </div>

                <div className="pin-section">
                  <label>Nhập mã PIN để xác nhận</label>
                  <input
                    type="password"
                    placeholder="1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    maxLength={6}
                    className="pin-input"
                  />
                </div>

                <div className="warning-section">
                  <p>⚠️ Lưu ý quan trọng:</p>
                  <ul>
                    <li>Kiểm tra kỹ thông tin tài khoản</li>
                    <li>Thời gian xử lý: 1-3 ngày làm việc</li>
                    <li>Phí rút tiền: Miễn phí</li>
                    <li>Không thể hủy sau khi xác nhận</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            {step > 1 && (
              <button onClick={handleBack} className="btn-secondary">
                Quay lại
              </button>
            )}
            <button onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : step === 3 ? 'Xác nhận rút tiền' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;
