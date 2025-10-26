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

  // Hàm tính toán progress bar cho loyalty points
  const calculateLoyaltyProgress = (walletInfo) => {
    if (!walletInfo || !walletInfo.totalSpentInWallet) {
      return {
        currentLevel: 'Bronze',
        nextLevel: 'Silver',
        progress: 0,
        currentSpent: 0,
        nextLevelAmount: 10000000,
        remainingAmount: 10000000
      };
    }

    const totalSpent = walletInfo.totalSpentInWallet;

    // Định nghĩa các mốc cấp độ
    const levels = [
      { name: 'Bronze', min: 0, max: 10000000, multiplier: 1 },
      { name: 'Silver', min: 10000000, max: 50000000, multiplier: 1.5 },
      { name: 'Gold', min: 50000000, max: 100000000, multiplier: 2 },
      { name: 'Diamond', min: 100000000, max: Infinity, multiplier: 3 }
    ];

    // Tìm cấp độ hiện tại
    let currentLevelIndex = 0;
    for (let i = 0; i < levels.length; i++) {
      if (totalSpent >= levels[i].min && totalSpent < levels[i].max) {
        currentLevelIndex = i;
        break;
      }
    }

    const currentLevel = levels[currentLevelIndex];
    const currentLevelName = currentLevel.name;

    // Kiểm tra nếu đã đạt cấp độ tối đa
    if (currentLevelIndex === levels.length - 1) {
      return {
        currentLevel: currentLevelName,
        nextLevel: null,
        progress: 100,
        currentSpent: totalSpent,
        nextLevelAmount: null,
        remainingAmount: 0,
        isMaxLevel: true
      };
    }

    const nextLevel = levels[currentLevelIndex + 1];

    // Tính toán progress trong cấp độ hiện tại
    const levelMin = currentLevel.min;
    const levelMax = currentLevel.max;
    const levelRange = levelMax - levelMin;
    const progressInLevel = ((totalSpent - levelMin) / levelRange) * 100;

    return {
      currentLevel: currentLevelName,
      nextLevel: nextLevel.name,
      progress: Math.min(progressInLevel, 100),
      currentSpent: totalSpent,
      nextLevelAmount: nextLevel.min,
      remainingAmount: nextLevel.min - totalSpent,
      isMaxLevel: false
    };
  };

  // Hàm tính điểm loyalty dựa trên tổng chi tiêu (1 điểm = 1000 VND chi tiêu)
  const calculateLoyaltyPoints = (walletInfo) => {
    if (!walletInfo || !walletInfo.totalSpentInWallet) return 0;
    return Math.floor(walletInfo.totalSpentInWallet / 1000);
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

              {/* Progress Bar Section */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#FFD700'
                }}>
                  📊 Tiến trình cấp độ
                </h4>

                {(() => {
                  const progressData = calculateLoyaltyProgress(walletInfo);
                  if (progressData.isMaxLevel) {
                    return (
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#FFD700',
                          textAlign: 'center',
                          marginBottom: '12px'
                        }}>
                          🏆 Đã đạt cấp độ cao nhất!
                        </div>
                        <div style={{
                          backgroundColor: 'rgba(255, 215, 0, 0.2)',
                          height: '12px',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#FFD700',
                            borderRadius: '6px'
                          }}></div>
                        </div>
                        <div style={{
                          fontSize: '12px',
                          textAlign: 'center',
                          color: '#FFD700',
                          marginTop: '8px'
                        }}>
                          {calculateLoyaltyPoints(walletInfo).toLocaleString()} điểm - {progressData.currentLevel}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#FFD700'
                        }}>
                          {progressData.currentLevel} → {progressData.nextLevel}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          opacity: 0.8
                        }}>
                          {Math.round(progressData.progress)}%
                        </span>
                      </div>

                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        height: '12px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          width: `${progressData.progress}%`,
                          height: '100%',
                          backgroundColor: '#FFD700',
                          borderRadius: '6px',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>

                      <div style={{
                        fontSize: '11px',
                        textAlign: 'center',
                        opacity: 0.8
                      }}>
                        {calculateLoyaltyPoints(walletInfo).toLocaleString()} điểm • Còn {formatCurrency(progressData.remainingAmount)} để đạt {progressData.nextLevel}
                      </div>
                    </div>
                  );
                })()}
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
