import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tickets.css';

const Tickets = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const navigate = useNavigate();

  // Lấy danh sách vé đã đặt
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      console.log('Token:', token); // Debug token

      // Lấy thông tin user từ token để đảm bảo lấy đúng vé
      const userResponse = await fetch('http://localhost:8080/api/v1/auth/get-profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.error('Không thể lấy thông tin user');
        setTickets([]);
        return;
      }

      const userData = await userResponse.json();
      const currentUserId = userData.data._id;
      console.log('Current user ID:', currentUserId);

      // Lấy vé với userId
      const response = await fetch(`http://localhost:8080/api/v1/tickets?userId=${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status); // Debug response status

      if (response.ok) {
        const data = await response.json();
        console.log('Tickets data:', data); // Debug dữ liệu trả về

        // API trả về {tickets: [...], pagination: {...}}
        // Chuyển đổi dữ liệu từ API sang định dạng UI mong đợi
        let ticketsArray = [];
       if (data.data && data.data.tickets && Array.isArray(data.data.tickets)) {
              ticketsArray = data.data.tickets
                .filter(ticket => ticket.userId === currentUserId)
                .map(ticket => ({
                          _id: ticket._id,
              ticketCode: ticket.ticketCode,
              passengerName: ticket.passengerName,
              email: ticket.email,
              phoneNumber: ticket.phoneNumber,
              seatNumber: ticket.seatNumber,  // Giữ lại nếu cần, nhưng ưu tiên seatNumbers
              seatNumbers: ticket.seatNumbers || [ticket.seatNumber],  // Mảng ghế đầy đủ
              seatClasses: ticket.seatClasses || [ticket.ticketClass],  // Mảng lớp ghế tương ứng
              price: ticket.price,
              passengerCount: ticket.passengerCount,
              paymentStatus: ticket.paymentStatus,
              bookingDate: ticket.bookingDate,
              paidAt: ticket.paidAt,
              refundedAt: ticket.refundedAt,
              status: ticket.status
            }));
        }

        console.log('Processed tickets:', ticketsArray); // Debug dữ liệu đã xử lý
        setTickets(ticketsArray);
      } else {
        console.error('Lỗi lấy danh sách vé, status:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
        setTickets([]);
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // Hủy vé
  const handleCancelTicket = async (ticketId, reason = 'Customer requested cancellation') => {
    // Tạo modal xác nhận thay vì dùng confirm()
    const confirmed = window.confirm('Bạn có chắc chắn muốn hủy vé này?');
    if (!confirmed) {
      return;
    }

    setCancelling(ticketId);

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
          reason
        })
      });

      if (response.ok) {
        alert('Vé đã được hủy thành công! Số tiền sẽ được hoàn lại trong 5-10 ngày làm việc.');
        // Cập nhật trạng thái vé trong danh sách
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
    } finally {
      setCancelling(null);
    }
  };

  // Định dạng ngày tháng
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Định dạng tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (!user) {
    return (
      <div className="tickets-container">
        <div className="unauthorized">
          <h2>Vui lòng đăng nhập để xem vé đã đặt</h2>
          <button onClick={() => navigate('/login')} className="login-btn">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tickets-container">
        <div className="loading">Đang tải danh sách vé...</div>
      </div>
    );
  }

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <h2>Vé đã đặt</h2>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Quay lại trang chủ
        </button>
      </div>

      {Array.isArray(tickets) && tickets.length === 0 ? (
        <div className="no-tickets">
          <h3>Bạn chưa có vé nào</h3>
          <p>Hãy đặt vé máy bay để bắt đầu hành trình của bạn!</p>
          <button onClick={() => navigate('/')} className="book-now-btn">
            Đặt vé ngay
          </button>
        </div>
      ) : Array.isArray(tickets) ? (
        <div className="tickets-list">
          {tickets.map((ticket) => (
            <div key={ticket._id} className={`ticket-card ${ticket.paymentStatus}`}>
              <div className="ticket-header">
                <div className="ticket-code">
                  <strong>Mã vé: {ticket.ticketCode}</strong>
                </div>
                <div className={`ticket-status ${ticket.paymentStatus}`}>
                  {ticket.paymentStatus === 'paid' && '✓ Đã thanh toán'}
                  {ticket.paymentStatus === 'pending' && '⏳ Chờ thanh toán'}
                  {ticket.paymentStatus === 'refunded' && '↩ Đã hoàn tiền'}
                  {ticket.paymentStatus === 'failed' && '✗ Thất bại'}
                </div>
              </div>

              <div className="ticket-content">
                <div className="ticket-info">
                  <div className="info-section">
                    <h4>Thông tin hành khách</h4>
                    <p><strong>Email:</strong> {ticket.email}</p>
                    <p><strong>Số điện thoại:</strong> {ticket.phoneNumber}</p>
                  </div>

                  <div className="info-section">
                    <h4>Thông tin vé</h4>
                    <p><strong>Mã vé:</strong> {ticket.ticketCode}</p>
                    <p><strong>Số lượng hành khách:</strong> {ticket.passengerCount || 1} người</p>
                    <p><strong>Số ghế:</strong> {ticket.seatNumber}</p>
                    <p><strong>Ngày đặt:</strong> {formatDate(ticket.bookingDate)}</p>
                  </div>

                  <div className="info-section">
                    <p><strong>Giá vé:</strong> {formatCurrency(ticket.price)}</p>
                    <p><strong>Trạng thái:</strong> {ticket.paymentStatus === 'paid' ? 'Đã thanh toán' : ticket.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chờ thanh toán'}</p>
                    {ticket.paidAt && (
                      <p><strong>Ngày thanh toán:</strong> {formatDate(ticket.paidAt)}</p>
                    )}
                    {ticket.refundedAt && (
                      <p><strong>Ngày hoàn tiền:</strong> {formatDate(ticket.refundedAt)}</p>
                    )}
                  </div>
                </div>

                <div className="ticket-actions">
                  {ticket.paymentStatus === 'paid' && (
                    <button
                      onClick={() => handleCancelTicket(ticket._id)}
                      disabled={cancelling === ticket._id}
                      className="cancel-btn"
                    >
                      {cancelling === ticket._id ? 'Đang hủy...' : 'Hủy vé'}
                    </button>
                  )}

                  {ticket.paymentStatus === 'refunded' && (
                    <div className="refund-info">
                      <p>Vé đã được hủy và hoàn tiền</p>
                      {ticket.refundReason && (
                        <p><small>Lý do: {ticket.refundReason}</small></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="error-message">
          <h3>Có lỗi khi tải danh sách vé</h3>
          <p>Vui lòng thử lại sau hoặc liên hệ hỗ trợ.</p>
          <button onClick={fetchTickets} className="retry-btn">
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
};

export default Tickets;
