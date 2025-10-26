import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import CouponInput from '../components/CouponInput';
import './Booking.css';
import './Payment.css';

const Payment = ({ user }) => {
  const { ticketId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        // ✅ Nếu có dữ liệu vé được truyền từ trang Profile, dùng luôn
        if (location.state?.ticketData) {
          console.log('📋 Dữ liệu vé từ Profile:', location.state.ticketData);
          const ticketData = location.state.ticketData;

          // Đảm bảo các trường cần thiết có mặt
          const normalizedTicket = {
            ...ticketData,
            ticketId: ticketData.ticketId || ticketData._id,
            totalPrice: ticketData.totalPrice || ticketData.price,
            flightCode: ticketData.flightId?.flightCode || ticketData.flightCode || 'N/A',
            route: ticketData.flightId?.route || ticketData.route || 'N/A',
            passengerCount: ticketData.passengerCount || 1,
            seatNumbers: ticketData.seatNumbers || ticketData.selectedSeats || [ticketData.seatNumber || 'N/A'],
            seatClasses: ticketData.seatClasses || [ticketData.ticketClass || ticketData.class || 'economy'],
            bookingDate: ticketData.bookingDate,
            paymentStatus: ticketData.paymentStatus
          };

          setTicket(normalizedTicket);
          setLoading(false);
          return;
        }

        // ✅ Nếu không có, fallback sang gọi API
        if (ticketId) {
          const response = await fetch(`http://localhost:8080/api/v1/tickets/${ticket._id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setTicket(data.data);
          } else {
            alert('Không tìm thấy thông tin vé');
            navigate('/');
          }
        } else {
          alert('Không có thông tin vé để thanh toán');
          navigate('/');
        }
      } catch (error) {
        console.error('Lỗi lấy thông tin vé:', error);
        alert('Lỗi kết nối server');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchTicket();
  }, [ticketId, location.state, navigate]);

  // Tính toán finalAmount khi ticket hoặc discount thay đổi
  useEffect(() => {
    if (ticket) {
      const originalAmount = ticket.totalPrice || 0;
      const discount = discountAmount || 0;
      setFinalAmount(Math.max(0, originalAmount - discount));
    }
  }, [ticket, discountAmount]);
  
  
  // Hàm xử lý thanh toán thành công
  const handlePaymentSuccess = async (paymentIntentId) => {
    // Nếu payment đã hoàn thành trước đó, chỉ cần set success state
    if (paymentIntentId === 'already-paid') {
      setPaymentSuccess(true);
      setPaymentError(null);
      console.log('✅ Payment was already completed');
      return;
    }

    setPaymentSuccess(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem('accessToken');

      // Gọi API để xác nhận thanh toán
      const response = await fetch(`http://localhost:8080/api/v1/payments/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId
        }),
      });

      if (response.ok) {
        // Lấy ticket mới từ backend
        const updatedTicketData = await response.json();
        const updatedTicket = updatedTicketData.data || updatedTicketData;

        console.log('✅ Vé đã được cập nhật trạng thái "paid"', updatedTicket);

        // Cập nhật state ticket với dữ liệu backend
        setTicket(prev => ({
          ...prev,
          ...updatedTicket
        }));

        // Apply coupon sau khi thanh toán thành công
        await applyCouponAfterPayment();

      } else {
        const errorData = await response.json();
        console.error('❌ Lỗi cập nhật trạng thái vé:', errorData.message || response.statusText);
        setPaymentError('Cập nhật trạng thái vé thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Lỗi kết nối khi cập nhật vé:', error);
      setPaymentError('Lỗi kết nối server. Vui lòng thử lại.');
    }
  };
  

  // Hàm xử lý lỗi thanh toán
  const handlePaymentError = (error) => {
    setPaymentError(error);
  };

  // Xử lý khi coupon được áp dụng
  const handleCouponApplied = (couponData) => {
    setAppliedCoupon(couponData.coupon);
    setDiscountAmount(couponData.discountAmount);
    console.log('✅ Coupon applied:', couponData);
  };

  // Xử lý khi coupon bị xóa
  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    console.log('🗑️ Coupon removed');
  };

  // Apply coupon sau khi thanh toán thành công
  const applyCouponAfterPayment = async () => {
    if (appliedCoupon && ticket) {
      try {
        const token = localStorage.getItem('accessToken');
        await fetch('http://localhost:8080/api/v1/coupons/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            couponId: appliedCoupon._id,
          }),
        });
        console.log('✅ Coupon applied successfully');
      } catch (error) {
        console.error('❌ Error applying coupon:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="booking-container">
        <div className="loading">Đang tải thông tin vé...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="booking-container">
        <div className="error">
          <h3>Không tìm thấy thông tin vé</h3>
          <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
          <button onClick={() => navigate('/')} className="back-btn">
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Debug: Log thông tin ticket để kiểm tra
  console.log('🎫 Thông tin vé thanh toán:', {
    ticketId: ticket.ticketId,
    totalPrice: ticket.totalPrice,
    flightCode: ticket.flightCode,
    route: ticket.route,
    passengerCount: ticket.passengerCount,
    seatClasses: ticket.seatClasses,
    seatNumbers: ticket.seatNumbers,
    bookingDate: ticket.bookingDate,
    paymentStatus: ticket.paymentStatus
  });

  if (paymentSuccess) {
    return (
      <div className="booking-container">
        <div className="booking-header">
          <h2>✅ Hoàn tất thanh toán</h2>
          <div className="success-buttons">
            <button onClick={() => navigate('/')} className="back-btn">
              ← Về trang chủ
            </button>
            <button onClick={() => navigate('/profile')} className="profile-btn">
              👤 Xem vé của tôi
            </button>
          </div>
        </div>

        <div className="booking-content">
          <div className="booking-confirmation">
            <div className="confirmation-card">
              <div className="confirmation-icon">✅</div>
              <div className="confirmation-message">
                <h3>✅ Hoàn tất thanh toán</h3>
                <p>Mã thanh toán demo: <strong>{ticket.ticketId?.slice(-8).toUpperCase()}</strong></p>
                <p>✅ Đã cập nhật trạng thái vé thành <strong>"Đã thanh toán"</strong></p>
                <p>⏰ Hạn thanh toán đã được dừng lại</p>
                <p>📧 <strong>Email xác nhận đã được gửi</strong> đến {user?.email}</p>
                <p>Bạn có thể kiểm tra vé trong trang hồ sơ cá nhân.</p>
              </div>

              <div className="booking-details">
                <div className="detail-item">
                  <span><strong>Mã vé:</strong></span>
                  <span>{ticket.ticketId?.slice(-8).toUpperCase()}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Mã chuyến bay:</strong></span>
                  <span>{ticket.flightCode}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Tuyến bay:</strong></span>
                  <span>{ticket.route}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Số hành khách:</strong></span>
                  <span>{ticket.passengerCount}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Chi tiết ghế:</strong></span>
                  <span>
                    {ticket.seatClasses && ticket.seatNumbers && ticket.seatClasses.length > 0 ? (
                      ticket.seatClasses.map((seatClass, index) => (
                        <div key={index} style={{ marginBottom: '2px' }}>
                          <span className="capitalize">
                            Ghế {ticket.seatNumbers[index]} - {seatClass}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="capitalize">{ticket.seatClasses || ticket.class}</span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span><strong>Tổng tiền:</strong></span>
                  <span className="price">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticket.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h2> Đơn thanh toán </h2>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Về trang chủ
        </button>
      </div>

      <div className="booking-content">
        {/* Thông tin vé cần thanh toán */}
        <div className="payment-ticket-info">
          <h3>Thông tin vé thanh toán</h3>
          <div className="ticket-summary-card">
            <div className="ticket-details">
              <div className="detail-item">
                <span><strong>Mã vé:</strong></span>
                <span>{ticket.ticketId?.slice(-8).toUpperCase()}</span>
              </div>
              <div className="detail-item">
                <span><strong>Mã chuyến bay:</strong></span>
                <span>{ticket.flightCode}</span>
              </div>
              <div className="detail-item">
                <span><strong>Tuyến bay:</strong></span>
                <span>{ticket.route}</span>
              </div>
              <div className="detail-item">
                <span><strong>Số lượng hành khách:</strong></span>
                <span>{ticket.passengerCount}</span>
              </div>
              <div className="detail-item">
                <span><strong>Chi tiết ghế:</strong></span>
                <span>
                  {ticket.seatClasses && ticket.seatNumbers && ticket.seatClasses.length > 0 ? (
                    ticket.seatClasses.map((seatClass, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        <span className="capitalize">
                          Ghế {ticket.seatNumbers[index]} - {seatClass}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="capitalize">{ticket.seatClasses || ticket.class}</span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span><strong>Tổng tiền:</strong></span>
                <span className="price">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticket.totalPrice)}
                </span>
              </div>
              {appliedCoupon && (
                <>
                  <div className="detail-item">
                    <span><strong>Mã giảm giá:</strong></span>
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {appliedCoupon.code} ({appliedCoupon.discountType === 'percentage'
                        ? `${appliedCoupon.discountValue}%`
                        : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appliedCoupon.discountValue)
                      })
                    </span>
                  </div>
                  <div className="detail-item">
                    <span><strong>Giảm giá:</strong></span>
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                      -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}
                    </span>
                  </div>
                  <div className="detail-item" style={{ borderTop: '2px solid #4caf50', paddingTop: '10px' }}>
                    <span><strong>Thành tiền:</strong></span>
                    <span className="price" style={{ color: '#4caf50', fontSize: '1.2em' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thông tin hành khách */}
        <div className="passenger-details">
          <h3>Thông tin hành khách</h3>
          <div className="passenger-info">
            <p><strong>Họ tên:</strong> {user?.fullName || `${user?.firstName} ${user?.lastName}`}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Số điện thoại:</strong> {user?.phoneNumber || 'Chưa cập nhật'}</p>
          </div>
        </div>

        {/* Mã giảm giá */}
        <div className="coupon-section">
          <h3>🎫 Mã giảm giá</h3>
          <div className="coupon-wrapper">
            <CouponInput
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              originalAmount={ticket.totalPrice}
            />
          </div>
        </div>

        {/* Form thanh toán */}
        <div className="payment-section">
          <h3>Thông tin thanh toán</h3>
          <div className="payment-container">
            <PaymentForm
              amount={finalAmount}
              currency="vnd"
              ticketId={ticket.ticketId}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
            {paymentError && (
              <div className="error-message" style={{ marginTop: '15px', textAlign: 'center' }}>
                {paymentError}
              </div>
            )}
          </div>
        </div>

        {/* Thông báo quan trọng */}
        <div className="payment-notice">
          <div className="demo-notice">
            🔒 <strong>Thanh toán an toàn</strong><br/>
            Hệ thống tích hợp Stripe để xử lý thanh toán thực tế và bảo mật.<br/>
            Thông tin thẻ được mã hóa và bảo vệ theo tiêu chuẩn PCI DSS.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
