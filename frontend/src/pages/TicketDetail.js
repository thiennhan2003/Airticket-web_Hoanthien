import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import './TicketDetail.css';

const TicketDetail = ({ user, setUser }) => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    // Nếu có dữ liệu vé từ state (từ Profile page), sử dụng luôn
    if (location.state?.ticketData) {
      setTicket(location.state.ticketData);
      setLoading(false);
      return;
    }

    // Nếu không có dữ liệu, fetch từ API
    fetchTicketDetail();
  }, [ticketId, location.state]);

  // Tự động tạo QR code nếu vé đã check-in và có dữ liệu QR
  useEffect(() => {
    if (ticket && ticket.status === 'checked-in' && ticket.qrCode && !qrCodeUrl) {
      generateQRCodeFromData(ticket.qrCode);
    }
  }, [ticket, qrCodeUrl]);

  const generateQRCodeFromData = async (qrData) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (qrError) {
      console.error('Lỗi tạo QR code từ dữ liệu:', qrError);
    }
  };

  const fetchTicketDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/v1/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin vé');
      }

      const data = await response.json();
      setTicket(data.data || data);
    } catch (error) {
      console.error('Lỗi khi tải vé:', error);
      setError('Không thể tải thông tin vé');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      setCheckinLoading(true);
      setCheckinError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/v1/tickets/${ticketId}/checkin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể check-in');
      }

      const data = await response.json();

      // Cập nhật thông tin vé với QR code
      setTicket(data.data);
      // Không cần setQrCodeUrl('') nữa vì useEffect sẽ tự động tạo lại

      // Tạo QR code từ dữ liệu trả về
      if (data.data.qrCode) {
        generateQRCodeFromData(data.data.qrCode);
      }

      alert('✅ Check-in thành công! QR code đã được tạo.');
    } catch (error) {
      console.error('Lỗi check-in:', error);
      setCheckinError(error.message || 'Không thể check-in. Vui lòng thử lại.');
    } finally {
      setCheckinLoading(false);
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
      <div className="seat-display">
        <div className="seat-class-badge">
          {seatInfo.class}
        </div>
        <div className="seat-numbers">
          Ghế: {seatInfo.seats}
        </div>
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#1976d2';
      case 'pending': return '#f57c00';
      case 'refunded': return '#7b1fa2';
      case 'failed': return '#d32f2f';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'refunded': return 'Đã hoàn tiền';
      case 'failed': return 'Thất bại';
      default: return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="ticket-detail-container">
        <div className="loading">Đang tải thông tin vé...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="ticket-detail-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>{error || 'Không tìm thấy vé'}</h3>
          <button onClick={() => navigate('/profile')} className="back-btn">
            ← Quay lại hồ sơ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-detail-container">
      <div className="ticket-detail-header">
        <button onClick={() => navigate('/profile')} className="back-btn">
          ← Quay lại hồ sơ
        </button>
        <h2>Chi tiết vé máy bay</h2>
      </div>

      <div className="ticket-detail-content">
        {/* Thông tin cơ bản */}
        <div className="ticket-section">
          <h3 className="section-title">📋 Thông tin vé</h3>
          <div className="ticket-info-grid">
            <div className="info-item">
              <span className="info-label">Mã vé:</span>
              <span className="info-value ticket-code">{ticket.ticketCode}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Trạng thái:</span>
              <span className="info-value status-badge" style={{
                backgroundColor: getStatusColor(ticket.paymentStatus),
                color: 'white'
              }}>
                {getStatusText(ticket.paymentStatus)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Giá vé:</span>
              <span className="info-value price">{formatCurrency(ticket.price)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Ngày đặt:</span>
              <span className="info-value">{formatDate(ticket.bookingDate)}</span>
            </div>
          </div>
        </div>

        {/* Thông tin hành khách */}
        <div className="ticket-section">
          <h3 className="section-title">👤 Thông tin hành khách</h3>
          <div className="passenger-info">
            <div className="passenger-avatar">
              {ticket.passengerName ? ticket.passengerName.charAt(0).toUpperCase() : 'N'}
            </div>
            <div className="passenger-details">
              <h4>{ticket.passengerName}</h4>
              <p><strong>Email:</strong> {ticket.email}</p>
              <p><strong>Số điện thoại:</strong> {ticket.phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Thông tin chuyến bay */}
        <div className="ticket-section">
          <h3 className="section-title">✈️ Thông tin chuyến bay</h3>
          <div className="flight-info-card">
            <div className="flight-route">
              <div className="route-info">
                <h4>{ticket.flightId?.route || ticket.route || 'N/A'}</h4>
                <p className="flight-code">{ticket.flightId?.flightCode || ticket.flightCode || 'N/A'}</p>
              </div>
              <div className="seat-info">
                {renderSeatInfo(ticket)}
              </div>
            </div>

            {/* Thông tin thời gian (nếu có) */}
            {ticket.flightId && (
              <div className="flight-times">
                <div className="time-info">
                  <span className="time-label">Khởi hành:</span>
                  <span className="time-value">
                    {ticket.flightId.departureTime ?
                      formatDate(ticket.flightId.departureTime) : 'Chưa xác định'}
                  </span>
                </div>
                <div className="time-info">
                  <span className="time-label">Đến nơi:</span>
                  <span className="time-value">
                    {ticket.flightId.arrivalTime ?
                      formatDate(ticket.flightId.arrivalTime) : 'Chưa xác định'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lịch sử thanh toán */}
        {(ticket.paidAt || ticket.refundedAt) && (
          <div className="ticket-section">
            <h3 className="section-title">💳 Lịch sử thanh toán</h3>
            <div className="payment-timeline">
              {ticket.paidAt && (
                <div className="timeline-item paid">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Thanh toán thành công</h4>
                    <p>{formatDate(ticket.paidAt)}</p>
                    {ticket.paymentMethod && (
                      <span className="payment-method">Phương thức: {ticket.paymentMethod}</span>
                    )}
                  </div>
                </div>
              )}

              {ticket.refundedAt && (
                <div className="timeline-item refunded">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Đã hoàn tiền</h4>
                    <p>{formatDate(ticket.refundedAt)}</p>
                    {ticket.refundId && (
                      <span className="refund-id">Mã hoàn tiền: {ticket.refundId}</span>
                    )}
                    {ticket.refundReason && (
                      <span className="refund-reason">Lý do: {ticket.refundReason}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông tin bổ sung */}
        <div className="ticket-section">
          <h3 className="section-title">📋 Thông tin bổ sung</h3>
          <div className="additional-info">
            <div className="info-row">
              <span className="info-label">Số lượng hành khách:</span>
              <span className="info-value">{ticket.passengerCount || 1}</span>
            </div>

            {ticket.paymentIntentId && (
              <div className="info-row">
                <span className="info-label">Mã thanh toán:</span>
                <span className="info-value mono">{ticket.paymentIntentId}</span>
              </div>
            )}

            {ticket.qrCode && ticket.status === 'checked-in' && (
              <div className="info-row">
                <span className="info-label">QR Code:</span>
                <div className="qr-display">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" />
                  ) : (
                    <div className="qr-placeholder">
                      <p>Đang tạo mã QR...</p>
                    </div>
                  )}
                  <p className="qr-instruction">
                    📱 Xuất trình mã QR này tại quầy check-in sân bay
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ticket-actions">
          {ticket.paymentStatus === 'paid' && ticket.status !== 'checked-in' && (
            <button
              onClick={handleCheckin}
              disabled={checkinLoading}
              className="action-btn checkin-btn"
            >
              {checkinLoading ? '⏳ Đang check-in...' : '✅ Check-in trực tuyến'}
            </button>
          )}

          {checkinError && (
            <div className="checkin-error">
              ⚠️ {checkinError}
            </div>
          )}

          {ticket.paymentStatus === 'paid' && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn hủy vé này?')) {
                  // Gọi API hủy vé
                  navigate('/profile');
                }
              }}
              className="action-btn cancel-btn"
            >
              ❌ Hủy vé
            </button>
          )}

          <button
            onClick={() => navigate('/profile')}
            className="action-btn back-btn"
          >
            ← Quay lại hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
