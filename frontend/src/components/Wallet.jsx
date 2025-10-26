import React, { useState, useEffect } from 'react';
import './Wallet.css';
import WalletTopup from './WalletTopup';
import SetPinModal from './SetPinModal';
import WithdrawModal from './WithdrawModal';

const Wallet = ({ user }) => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    fetchWalletInfo();
  }, [user]);

  const fetchWalletInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletInfo(data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin ví:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWalletLevelColor = (level) => {
    switch (level) {
      case 'diamond': return '#E8E8E8';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      default: return '#CD7F32'; // bronze
    }
  };

  const getWalletLevelIcon = (level) => {
    switch (level) {
      case 'diamond': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading) {
    return (
      <div className="wallet-container">
        <div className="loading">Đang tải thông tin ví...</div>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h2>👛 Ví điện tử</h2>
        <div className="wallet-actions">
          <button
            className="btn-primary"
            onClick={() => setShowTopupModal(true)}
          >
            💰 Nạp tiền
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowWithdrawModal(true)}
          >
            💸 Rút tiền
          </button>
        </div>
      </div>

      {/* Wallet Overview Cards */}
      <div className="wallet-overview">
        <div className="wallet-balance-card">
          <div className="balance-header">
            <h3>Số dư ví</h3>
            <span className="wallet-status">
              {walletInfo?.isWalletActive ? '✅ Hoạt động' : '❌ Tạm khóa'}
            </span>
          </div>
          <div className="balance-amount">
            {formatCurrency(walletInfo?.walletBalance || 0)}
          </div>
          <div className="balance-footer">
            <span className="level-badge" style={{
              backgroundColor: getWalletLevelColor(walletInfo?.walletLevel)
            }}>
              {getWalletLevelIcon(walletInfo?.walletLevel)} {walletInfo?.walletLevel}
            </span>
          </div>
        </div>

        <div className="wallet-limits-card">
          <h4>📊 Giới hạn chi tiêu</h4>
          <div className="limits-grid">
            <div className="limit-item">
              <span className="limit-label">Hàng ngày:</span>
              <span className="limit-value">{formatCurrency(walletInfo?.walletDailyLimit || 0)}</span>
            </div>
            <div className="limit-item">
              <span className="limit-label">Hàng tháng:</span>
              <span className="limit-value">{formatCurrency(walletInfo?.walletMonthlyLimit || 0)}</span>
            </div>
          </div>
        </div>

        <div className="wallet-stats-card">
          <h4>📈 Thống kê</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Tổng nạp:</span>
              <span className="stat-value">{formatCurrency(walletInfo?.totalTopupInWallet || 0)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tổng chi:</span>
              <span className="stat-value">{formatCurrency(walletInfo?.totalSpentInWallet || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wallet-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Tổng quan
        </button>
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          📜 Lịch sử
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔐 Bảo mật
        </button>
      </div>

      {/* Tab Content */}
      <div className="wallet-tab-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="quick-actions">
              <div className="action-card" onClick={() => setShowTopupModal(true)}>
                <div className="action-icon">💰</div>
                <div className="action-title">Nạp tiền</div>
                <div className="action-desc">Nạp tiền vào ví để thanh toán</div>
              </div>

              <div className="action-card" onClick={() => setShowWithdrawModal(true)}>
                <div className="action-icon">💸</div>
                <div className="action-title">Rút tiền</div>
                <div className="action-desc">Rút tiền về tài khoản</div>
              </div>

              <div className="action-card" onClick={() => setShowSetPinModal(true)}>
                <div className="action-icon">🔐</div>
                <div className="action-title">PIN bảo mật</div>
                <div className="action-desc">Thiết lập mã PIN</div>
              </div>
            </div>

            <div className="wallet-benefits">
              <h4>🎁 Quyền lợi cấp độ {walletInfo?.walletLevel}</h4>
              <div className="benefits-list">
                {walletInfo?.walletLevel === 'diamond' && (
                  <>
                    <div className="benefit-item">✨ Hoàn tiền 5% cho mọi giao dịch</div>
                    <div className="benefit-item">🚀 Ưu tiên xử lý giao dịch</div>
                    <div className="benefit-item">🎯 Hỗ trợ 24/7 VIP</div>
                    <div className="benefit-item">💎 Tích điểm 3x</div>
                  </>
                )}
                {walletInfo?.walletLevel === 'gold' && (
                  <>
                    <div className="benefit-item">✨ Hoàn tiền 3% cho mọi giao dịch</div>
                    <div className="benefit-item">🚀 Ưu tiên xử lý giao dịch</div>
                    <div className="benefit-item">🎯 Hỗ trợ nhanh</div>
                    <div className="benefit-item">💰 Tích điểm 2x</div>
                  </>
                )}
                {walletInfo?.walletLevel === 'silver' && (
                  <>
                    <div className="benefit-item">✨ Hoàn tiền 1% cho mọi giao dịch</div>
                    <div className="benefit-item">🎯 Hỗ trợ tiêu chuẩn</div>
                    <div className="benefit-item">💰 Tích điểm 1.5x</div>
                  </>
                )}
                {walletInfo?.walletLevel === 'bronze' && (
                  <>
                    <div className="benefit-item">🎯 Hỗ trợ tiêu chuẩn</div>
                    <div className="benefit-item">💰 Tích điểm cơ bản</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-content">
            <div className="transactions-header">
              <h4>Lịch sử giao dịch gần đây</h4>
              <button className="view-all-btn">Xem tất cả</button>
            </div>

            {walletInfo?.recentTransactions?.length > 0 ? (
              <div className="transactions-list">
                {walletInfo.recentTransactions.map((transaction) => (
                  <div key={transaction._id} className="transaction-item">
                    <div className="transaction-icon">
                      {transaction.type === 'topup' && '💰'}
                      {transaction.type === 'payment' && '💳'}
                      {transaction.type === 'refund' && '↩️'}
                      {transaction.type === 'withdrawal' && '💸'}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-desc">{transaction.description}</div>
                      <div className="transaction-date">
                        {new Date(transaction.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span className={transaction.type === 'topup' ? 'positive' : 'negative'}>
                        {transaction.type === 'topup' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                      <div className="transaction-status">
                        {transaction.status === 'completed' && '✅ Hoàn thành'}
                        {transaction.status === 'pending' && '⏳ Đang xử lý'}
                        {transaction.status === 'failed' && '❌ Thất bại'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-transactions">
                <div className="empty-icon">📜</div>
                <h4>Chưa có giao dịch nào</h4>
                <p>Hãy nạp tiền hoặc thực hiện giao dịch để xem lịch sử</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-content">
            <div className="security-settings">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>Mã PIN bảo mật</h4>
                  <p>{user?.walletPin ? 'Đã thiết lập' : 'Chưa thiết lập'}</p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => setShowSetPinModal(true)}
                >
                  {user?.walletPin ? 'Thay đổi' : 'Thiết lập'}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Trạng thái ví</h4>
                  <p>{walletInfo?.isWalletActive ? 'Đang hoạt động' : 'Tạm khóa'}</p>
                </div>
                <button className="btn-secondary">
                  {walletInfo?.isWalletActive ? 'Khóa ví' : 'Mở khóa'}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Giới hạn chi tiêu</h4>
                  <p>Hàng ngày: {formatCurrency(walletInfo?.walletDailyLimit || 0)}</p>
                  <p>Hàng tháng: {formatCurrency(walletInfo?.walletMonthlyLimit || 0)}</p>
                </div>
                <button className="btn-secondary">
                  Điều chỉnh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <WalletTopup
          onClose={() => setShowTopupModal(false)}
          onSuccess={() => {
            setShowTopupModal(false);
            fetchWalletInfo();
          }}
        />
      )}

      {/* PIN Modal */}
      {showSetPinModal && (
        <SetPinModal
          user={user}
          onClose={() => setShowSetPinModal(false)}
          onSuccess={() => {
            setShowSetPinModal(false);
            fetchWalletInfo();
          }}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawModal
          user={user}
          walletInfo={walletInfo}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            fetchWalletInfo();
          }}
        />
      )}
    </div>
  );
};

export default Wallet;
