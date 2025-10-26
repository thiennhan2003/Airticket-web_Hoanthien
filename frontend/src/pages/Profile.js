import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import Wallet from '../components/Wallet';

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Pagination state cho lịch sử đặt vé
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Lấy danh sách vé đã đặt khi chuyển sang tab bookings
  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      fetchTickets();
    }
  }, [activeTab, user, currentPage, itemsPerPage]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [navigate]);
  

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:8080/api/v1/auth/get-profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin hồ sơ');
      }

      const data = await response.json();
      const userData = data.data || data;
      setProfile({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || ''
      });
    } catch (error) {
      console.error('Lỗi khi tải thông tin hồ sơ:', error);
      setMessage({ type: 'error', text: 'Không thể tải thông tin hồ sơ' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setProfile(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể cập nhật hồ sơ');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });

      // Cập nhật thông tin user trong state
      if (data.data) {
        setUser(prev => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật hồ sơ:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Không thể cập nhật hồ sơ'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    navigate('/');
  };

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const token = localStorage.getItem('accessToken');

      // Lấy thông tin user hiện tại để có userId
      const userResponse = await fetch('http://localhost:8080/api/v1/auth/get-profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Không thể lấy thông tin người dùng');
      }

      const userData = await userResponse.json();
      const currentUserId = userData.data?._id;

      if (!currentUserId) {
        throw new Error('Không tìm thấy thông tin người dùng');
      }

      // Chuẩn bị query parameters cho pagination và userId
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        userId: currentUserId
      });

      // Gọi API lấy vé với pagination
      const response = await fetch(`http://localhost:8080/api/v1/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách vé');
      }

      const data = await response.json();
      const ticketsData = data.data?.tickets || [];
      const paginationData = data.data?.pagination || data.pagination || {};

      setTickets(ticketsData);
      setTotalItems(paginationData.totalRecord || 0);
      setTotalPages(Math.ceil((paginationData.totalRecord || 0) / itemsPerPage));
    } catch (error) {
      console.error('Lỗi tải vé:', error);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };
  

  // Xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Xử lý thay đổi số items per page
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset về trang đầu khi thay đổi số items
  };

  const handleCancelTicket = async (ticketId) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn hủy vé này?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ticketId,
          reason: 'Customer requested cancellation'
        })
      });

      if (response.ok) {
        alert('Vé đã được hủy thành công!');
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket._id === ticketId
              ? { ...ticket, paymentStatus: 'refunded', status: 'cancelled' }
              : ticket
          )
        );
      } else {
        const error = await response.json();
        alert(`Lỗi hủy vé: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi hủy vé:', error);
      alert('Không thể hủy vé. Vui lòng thử lại sau!');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatSeatInfo = (ticket) => {
    const seatClasses = ticket.seatClasses || [ticket.ticketClass || ticket.class || 'Economy'];
    const seatNumbers = ticket.seatNumbers || [ticket.seatNumber || 'N/A'];

    if (seatClasses.length === 1) {
      return {
        class: seatClasses[0],
        seats: seatNumbers[0]
      };
    }

    return {
      class: `${seatClasses.length} ghế (${seatClasses.join(', ')})`,
      seats: seatNumbers.join(', ')
    };
  };

  const renderSeatInfo = (ticket) => {
    const seatInfo = formatSeatInfo(ticket);

    return (
      <>
        <span className="seat-class" style={{
          fontSize: '12px',
          opacity: 0.8,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          display: 'block'
        }}>
          {seatInfo.class}
        </span>
        <span className="seat-number" style={{
          fontSize: '18px',
          fontWeight: '600'
        }}>Ghế {seatInfo.seats}</span>
      </>
    );
  };

  const handlePayment = (ticket) => {
    // Đảm bảo truyền đầy đủ thông tin cần thiết cho trang payment
    const paymentTicketData = {
      ...ticket,
      // Đảm bảo các trường cần thiết có mặt
      ticketId: ticket._id,
      totalPrice: ticket.price,
      flightCode: ticket.flightId?.flightCode || ticket.flightCode || 'N/A',
      route: ticket.flightId?.route || ticket.route || 'N/A',
      passengerCount: ticket.passengerCount || 1,
      seatClasses: ticket.seatClasses || [ticket.ticketClass || ticket.class || 'economy'],
      seatNumbers: ticket.seatNumbers || [ticket.seatNumber || 'N/A'],
      bookingDate: ticket.bookingDate,
      paymentStatus: ticket.paymentStatus
    };

    navigate(`/payment/${ticket._id}`, {
      state: {
        ticketData: paymentTicketData,
        showPayment: true,
      },
    });
  };

  // Tính ngày hạn thanh toán (ví dụ: 1h sau khi đặt vé)
  const getPaymentDeadline = (bookingDate) => {
    const deadline = new Date(bookingDate);
    deadline.setHours(deadline.getHours() + 1); // Thêm 1h
    return deadline;
  };

  const isExpired = (bookingDate) => {
    const deadline = getPaymentDeadline(bookingDate);
    return new Date() > deadline;
  };

  // Hàm xác định cấp bậc thành viên dựa trên số vé đã đặt hoặc tiêu chí khác
  const getMembershipTier = (userData) => {
    // Đây là logic mẫu - bạn có thể điều chỉnh theo yêu cầu thực tế
    // Ví dụ: dựa trên số vé đã đặt, tổng tiền đã chi tiêu, v.v.
    if (userData.membershipTier) {
      return userData.membershipTier;
    }

    // Logic mặc định nếu không có thông tin từ API
    return 'Bạc'; // Mặc định là Bạc cho thành viên mới
  };

  const getMembershipColor = (tier) => {
    switch (tier) {
      case 'Kim cương': return '#E8E8E8';
      case 'Vàng': return '#FFD700';
      case 'Bạc': return '#C0C0C0';
      default: return '#C0C0C0';
    }
  };

  const getMembershipBenefits = (tier) => {
    switch (tier) {
      case 'Kim cương':
        return ['Ưu tiên đặt vé', 'Hoàn tiền 100%', 'Hỗ trợ 24/7', 'Tích điểm 3x'];
      case 'Vàng':
        return ['Ưu tiên đặt vé', 'Hoàn tiền 50%', 'Hỗ trợ nhanh', 'Tích điểm 2x'];
      case 'Bạc':
        return ['Tích điểm cơ bản', 'Hỗ trợ tiêu chuẩn'];
      default:
        return ['Tích điểm cơ bản', 'Hỗ trợ tiêu chuẩn'];
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Hồ sơ cá nhân</h2>
        <div className="header-buttons">
          <button className="btn-home" onClick={() => navigate('/')}>
            🏠 Trang chủ
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Thông tin cá nhân
          </button>
          <button
            className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Lịch sử đặt vé
          </button>
          <button
            className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            👛 Ví điện tử
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="profile-info">
            {/* Profile Header */}
            <div className="profile-header-card">
              <div className="profile-avatar-section">
                <div className="avatar-container">
                  <div className="avatar-circle">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                <div className="profile-details">
                  <h3 className="profile-name">{profile.fullName || 'Chưa cập nhật tên'}</h3>
                  <p className="profile-email">{profile.email}</p>
                  <div className="membership-badge" style={{ backgroundColor: getMembershipColor(getMembershipTier(user)) }}>
                    <span className="membership-icon">
                      {getMembershipTier(user) === 'Kim cương' ? '💎' :
                       getMembershipTier(user) === 'Vàng' ? '🥇' : '🥈'}
                    </span>
                    <span className="membership-text">Thành viên {getMembershipTier(user)}</span>
                  </div>
                </div>
              </div>

              {/* Membership Benefits */}
              <div className="membership-benefits-card">
                <h4 className="benefits-title">🎁 Quyền lợi thành viên</h4>
                <div className="benefits-grid">
                  {getMembershipBenefits(getMembershipTier(user)).map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span className="benefit-text">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`message-card ${message.type}`}>
                <span className="message-icon">
                  {message.type === 'success' ? '✓' : '⚠️'}
                </span>
                <span className="message-text">{message.text}</span>
              </div>
            )}

            {/* Edit Form */}
            <div className="profile-form-card">
              <div className="form-header">
                <h4 className="form-title">📝 Chỉnh sửa thông tin</h4>
                <p className="form-subtitle">Cập nhật thông tin cá nhân của bạn</p>
              </div>

              <form className="edit-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">
                      <span className="label-icon">👤</span>
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={handleChange('fullName')}
                      placeholder="Nhập họ và tên đầy đủ"
                      className="field-input"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      <span className="label-icon">✉️</span>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={handleChange('email')}
                      placeholder="Nhập địa chỉ email"
                      className="field-input"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">
                      <span className="label-icon">📱</span>
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={profile.phoneNumber}
                      onChange={handleChange('phoneNumber')}
                      placeholder="Nhập số điện thoại"
                      className="field-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={fetchProfile}
                    disabled={saving}
                  >
                    <span className="btn-icon">🔄</span>
                    Làm mới
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    <span className="btn-icon">
                      {saving ? '⏳' : '💾'}
                    </span>
                    {saving ? 'Đang lưu...' : 'Cập nhật thông tin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

  {activeTab === 'bookings' && (
    <div className="bookings-history">
      <div className="bookings-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📜 Lịch sử đặt vé
            </h3>
          </div>

          <div className="bookings-controls" style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div className="pagination-info" style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center'
            }}>
              <span className="total-tickets" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                📊 Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} vé
              </span>
              <span className="current-page" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                📄 Trang {currentPage} của {totalPages}
              </span>
            </div>

            <div className="items-per-page-selector" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Hiển thị:
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                disabled={ticketsLoading}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: ticketsLoading ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                vé mỗi trang
              </span>
            </div>
          </div>
        </div>
      </div>

    {ticketsLoading ? (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Đang tải danh sách vé...</p>
      </div>
    ) : Array.isArray(tickets) && tickets.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">✈️</div>
        <h4>Bạn chưa có vé nào</h4>
        <p>Hãy đặt vé máy bay để bắt đầu hành trình của bạn!</p>
        <button onClick={() => navigate('/')} className="book-now-btn">
          Đặt vé ngay
        </button>
      </div>
    ) : Array.isArray(tickets) ? (
      <div className="tickets-container" style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
      }}>
        {tickets.map((ticket) => (
          <div key={ticket._id} className={`ticket-card ${ticket.paymentStatus}`} style={{
            background: '#ffffff',
            color: ticket.paymentStatus === 'paid' ? '#1976d2' : 
                   ticket.paymentStatus === 'pending' ? '#f57c00' : 
                   ticket.paymentStatus === 'refunded' ? '#7b1fa2' : '#d32f2f',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: `2px solid ${ticket.paymentStatus === 'paid' ? '#2196f3' : 
                               ticket.paymentStatus === 'pending' ? '#ff9800' : 
                               ticket.paymentStatus === 'refunded' ? '#9c27b0' : '#f44336'}`
          }}
          onClick={(e) => {
            // Ngăn sự kiện click lan truyền từ các button bên trong
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
              return;
            }
            navigate(`/ticket/${ticket._id}`, { state: { ticketData: ticket } });
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
          }}
          >
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: ticket.paymentStatus === 'paid' 
                ? 'radial-gradient(circle, rgba(33, 150, 243, 0.05) 0%, transparent 70%)'
                : ticket.paymentStatus === 'pending'
                ? 'radial-gradient(circle, rgba(255, 152, 0, 0.05) 0%, transparent 70%)'
                : ticket.paymentStatus === 'refunded'
                ? 'radial-gradient(circle, rgba(156, 39, 176, 0.05) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(244, 67, 54, 0.05) 0%, transparent 70%)',
              borderRadius: '50%'
            }}></div>

            {/* Ticket Header */}
            <div className="ticket-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
              position: 'relative',
              zIndex: 2
            }}>
              <div className="ticket-code-section">
                <span className="ticket-code-label" style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>Mã vé</span>
                <span className="ticket-code" style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  display: 'block',
                  marginTop: '4px'
                }}>{ticket.ticketCode}</span>
              </div>
              <div className={`ticket-status-badge ${ticket.paymentStatus}`} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(10px)'
              }}>
                {ticket.paymentStatus === 'paid' && (
                  <>
                    <span className="status-icon" style={{ fontSize: '14px' }}>✓</span>
                    <span className="status-text">Đã thanh toán</span>
                  </>
                )}
                {ticket.paymentStatus === 'pending' && (
                  <>
                    <span className="status-icon" style={{ fontSize: '14px' }}>⏳</span>
                    <span className="status-text">Chờ thanh toán</span>
                  </>
                )}
                {ticket.paymentStatus === 'refunded' && (
                  <>
                    <span className="status-icon" style={{ fontSize: '14px' }}>↩</span>
                    <span className="status-text">Đã hoàn tiền</span>
                  </>
                )}
                {ticket.paymentStatus === 'failed' && (
                  <>
                    <span className="status-icon" style={{ fontSize: '14px' }}>✗</span>
                    <span className="status-text">Thất bại</span>
                  </>
                )}
              </div>
            </div>

            {/* Flight Info */}
            <div className="ticket-flight-info" style={{
              marginBottom: '16px',
              position: 'relative',
              zIndex: 2
            }}>
              <div className="flight-route" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div className="route-info">
                  <span className="route-text" style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {ticket.flightId?.route || ticket.route || 'N/A'}
                  </span>
                  <span className="flight-code" style={{
                    fontSize: '14px',
                    opacity: 0.9
                  }}>
                    {ticket.flightId?.flightCode || ticket.flightCode || 'N/A'}
                  </span>
                </div>
                <div className="seat-info" style={{
                  textAlign: 'right'
                }}>
                  {renderSeatInfo(ticket)}
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="ticket-details" style={{
              marginBottom: '16px',
              position: 'relative',
              zIndex: 2
            }}>
              <div className="detail-row" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px'
              }}>
                <div className="detail-item">
                  <span className="detail-label" style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '6px'
                  }}>👤 Hành khách</span>
                  <div className="detail-content">
                    <span className="passenger-name" style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '2px'
                    }}>{ticket.passengerName}</span>
                    <span className="passenger-phone" style={{
                      fontSize: '12px',
                      opacity: 0.8
                    }}>{ticket.phoneNumber}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label" style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '6px'
                  }}>📅 Ngày đặt</span>
                  <span className="detail-content" style={{
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>{formatDate(ticket.bookingDate)}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label" style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'block',
                    marginBottom: '6px'
                  }}>💰 Giá vé</span>
                  <span className="detail-content price" style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: ticket.paymentStatus === 'paid' ? '#1976d2' : '#f57c00'
                  }}>{formatCurrency(ticket.price)}</span>
                </div>
              </div>
            </div>

            {/* Payment Timeline */}
            {(ticket.paidAt || ticket.refundedAt) && (
              <div className="payment-timeline" style={{
                marginBottom: '16px',
                position: 'relative',
                zIndex: 2
              }}>
                {ticket.paidAt && (
                  <div className="timeline-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    opacity: 0.9
                  }}>
                    <span className="timeline-dot paid" style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#28a745'
                    }}></span>
                    <div className="timeline-content">
                      <span className="timeline-label">Thanh toán thành công</span>
                      <span className="timeline-date" style={{ marginLeft: '8px' }}>
                        {formatDate(ticket.paidAt)}
                      </span>
                    </div>
                  </div>
                )}
                {ticket.paidAt && (
                  <div className="timeline-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    opacity: 0.9,
                    marginTop: '4px'
                  }}>
                    <span className="timeline-dot email" style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#17a2b8'
                    }}></span>
                    <div className="timeline-content">
                      <span className="timeline-label">📧 Email xác nhận đã gửi</span>
                      <span className="timeline-date" style={{ marginLeft: '8px' }}>
                        {formatDate(ticket.paidAt)}
                      </span>
                    </div>
                  </div>
                )}
                {ticket.refundedAt && (
                  <div className="timeline-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    opacity: 0.9,
                    marginTop: '4px'
                  }}>
                    <span className="timeline-dot refunded" style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#6f42c1'
                    }}></span>
                    <div className="timeline-content">
                      <span className="timeline-label">Đã hoàn tiền</span>
                      <span className="timeline-date" style={{ marginLeft: '8px' }}>
                        {formatDate(ticket.refundedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="ticket-actions" style={{
              marginTop: 'auto',
              position: 'relative',
              zIndex: 2
            }}>
              {ticket.paymentStatus === 'paid' && (
                <button onClick={() => handleCancelTicket(ticket._id)} className="action-btn cancel-btn" style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: '1px solid #333333',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#333333';
                  e.target.style.borderColor = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#000000';
                  e.target.style.borderColor = '#333333';
                }}
                >
                  <span className="btn-icon">❌</span>
                  <span className="btn-text">Hủy vé</span>
                </button>
              )}

              {ticket.paymentStatus === 'pending' && (
                <>
                  {!isExpired(ticket.bookingDate) ? (
                    <>
                      <button
                        onClick={() => handlePayment(ticket)}
                        className="action-btn pay-btn primary"
                        style={{
                          backgroundColor: '#fff3e0',
                          color: '#f57c00',
                          border: '1px solid #ff9800',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#ffcc80';
                          e.target.style.borderColor = '#f57c00';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#fff3e0';
                          e.target.style.borderColor = '#ff9800';
                        }}
                      >
                        <span className="btn-icon">💳</span>
                        <span className="btn-text">Thanh toán</span>
                      </button>

                      <div className="payment-deadline" style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 0, 0, 0.1)'
                      }}>
                        <div className="deadline-info" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span className="deadline-icon" style={{ fontSize: '16px' }}>⏰</span>
                          <div className="deadline-text">
                            <span className="deadline-label" style={{
                              fontSize: '12px',
                              opacity: 0.8,
                              display: 'block'
                            }}>Hạn thanh toán</span>
                            <span className="deadline-time" style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'block',
                              marginBottom: '2px'
                            }}>
                              {formatDate(getPaymentDeadline(ticket.bookingDate))}
                            </span>
                            <span className="deadline-countdown" style={{
                              fontSize: '12px',
                              opacity: 0.8
                            }}>
                              Còn {Math.ceil((getPaymentDeadline(ticket.bookingDate) - new Date()) / (1000 * 60))} phút
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="expired-notice" style={{
                      backgroundColor: 'rgba(220, 53, 69, 0.8)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <span className="expired-icon">⚠️</span>
                      <span className="expired-text">Vé đã hết hạn thanh toán</span>
                    </div>
                  )}
                </>
              )}

              {ticket.paymentStatus === 'refunded' && (
                <div className="refund-notice" style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  color: '#7b1fa2',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '1px solid rgba(123, 31, 162, 0.3)'
                }}>
                  <span className="refund-icon">💸</span>
                  <span className="refund-text">Vé đã được hoàn tiền</span>
                  {ticket.refundReason && (
                    <span className="refund-reason" style={{
                      display: 'block',
                      fontSize: '12px',
                      opacity: 0.8,
                      marginTop: '4px'
                    }}>Lý do: {ticket.refundReason}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <h4>Có lỗi khi tải danh sách vé</h4>
        <p>Không thể tải danh sách vé của bạn. Vui lòng thử lại.</p>
        <button onClick={fetchTickets} className="retry-btn">
          <span className="btn-icon">🔄</span>
          <span className="btn-text">Thử lại</span>
        </button>
      </div>
    )}

    {/* Pagination Controls */}
    {totalPages > 1 && !ticketsLoading && (
      <div className="pagination-controls" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '24px',
        marginBottom: '16px',
        padding: '16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        flexWrap: 'wrap'
      }}>
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(1)}
          style={{
            padding: '8px 16px',
            border: currentPage === 1 ? '1px solid #6c757d' : '1px solid #007bff',
            backgroundColor: currentPage === 1 ? '#f8f9fa' : 'transparent',
            color: currentPage === 1 ? '#6c757d' : '#007bff',
            borderRadius: '6px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '100px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.target.style.backgroundColor = '#007bff';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#007bff';
            }
          }}
        >
          ⏮ Trang đầu
        </button>
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          style={{
            padding: '8px 16px',
            border: currentPage === 1 ? '1px solid #6c757d' : '1px solid #007bff',
            backgroundColor: currentPage === 1 ? '#f8f9fa' : 'transparent',
            color: currentPage === 1 ? '#6c757d' : '#007bff',
            borderRadius: '6px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '100px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.target.style.backgroundColor = '#007bff';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 1) {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#007bff';
            }
          }}
        >
          ◀ Trang trước
        </button>

        {/* Page Numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNumber;

          if (totalPages <= 5) {
            pageNumber = i + 1;
          } else if (currentPage <= 3) {
            pageNumber = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNumber = totalPages - 4 + i;
          } else {
            pageNumber = currentPage - 2 + i;
          }

          return (
            <button
              key={pageNumber}
              className={`pagination-btn ${currentPage === pageNumber ? 'active' : ''}`}
              onClick={() => handlePageChange(pageNumber)}
              style={{
                padding: '8px 12px',
                border: '1px solid #007bff',
                backgroundColor: currentPage === pageNumber ? '#007bff' : 'transparent',
                color: currentPage === pageNumber ? 'white' : '#007bff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '40px',
                ...(currentPage === pageNumber ? {
                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
                } : {})
              }}
              onMouseEnter={(e) => {
                if (currentPage !== pageNumber) {
                  e.target.style.backgroundColor = '#007bff';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== pageNumber) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#007bff';
                }
              }}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          style={{
            padding: '8px 16px',
            border: currentPage === totalPages ? '1px solid #6c757d' : '1px solid #007bff',
            backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'transparent',
            color: currentPage === totalPages ? '#6c757d' : '#007bff',
            borderRadius: '6px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '100px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.backgroundColor = '#007bff';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#007bff';
            }
          }}
        >
          Trang sau ▶
        </button>
        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(totalPages)}
          style={{
            padding: '8px 16px',
            border: currentPage === totalPages ? '1px solid #6c757d' : '1px solid #007bff',
            backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'transparent',
            color: currentPage === totalPages ? '#6c757d' : '#007bff',
            borderRadius: '6px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '100px'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.backgroundColor = '#007bff';
              e.target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#007bff';
            }
          }}
        >
          Trang cuối ⏭
        </button>
      </div>
    )}
  </div>
)}

        {activeTab === 'wallet' && (
          <Wallet user={user} />
        )}
      </div>
    </div>
  );
};

export default Profile;
