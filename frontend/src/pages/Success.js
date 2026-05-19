import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Success.css';

const Success = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [ticketData, setTicketData] = useState(null);
  const [countdown, setCountdown] = useState(1 * 60 * 60); // 1 hour in seconds

  useEffect(() => {
    // Lấy thông tin vé từ state được truyền từ trang Booking
    const data = location.state?.ticketData;
    if (data) {
      setTicketData(data);
    } else {
      // Nếu không có dữ liệu, chuyển về trang chủ
      navigate('/');
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.state, navigate]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Hàm tạo chuỗi hiển thị hạng vé chi tiết
  const formatSeatClasses = () => {
    if (!ticketData.selectedSeats || !ticketData.seatClasses) {
      return ticketData.class;
    }

    const seatClassGroups = {};
    ticketData.selectedSeats.forEach((seatId, index) => {
      const seatClass = ticketData.seatClasses[index] || 'economy';
      if (!seatClassGroups[seatClass]) {
        seatClassGroups[seatClass] = [];
      }
      seatClassGroups[seatClass].push(seatId);
    });

    const classLabels = {
      'first': 'First Class',
      'business': 'Business',
      'economy': 'Economy'
    };

    return Object.entries(seatClassGroups)
      .map(([seatClass, seats]) => `${classLabels[seatClass]}: ${seats.join(', ')}`)
      .join('; ');
  };

  const handlePayment = () => {
  // Chuyển đến trang thanh toán với thông tin vé
  navigate(`/payment/${ticketData.ticketId}`, {
    state: { ticketData }
  });
};


  const handleGoHome = () => {
    navigate('/');
  };

  if (!ticketData) {
    return (
      <div className="success-container">
        <div className="loading">Đang tải thông tin...</div>
      </div>
    );
  }

  return (
    <div className="success-container">
      <div className="success-header">
        <h2>Đặt vé thành công!</h2>
        <button onClick={handleGoHome} className="back-btn">
          ← Về trang chủ
        </button>
      </div>

      <div className="success-content">
        <div className="success-confirmation">
          <div className="confirmation-icon">✅</div>
          <div className="confirmation-message">
            <h3>Vé của bạn đã được đặt thành công!</h3>
            <p>Vé đang ở trạng thái <strong>"Chờ thanh toán"</strong></p>
            <p>Vui lòng thanh toán trong vòng <strong>{formatTime(countdown)}</strong> để giữ chỗ.</p>
          </div>

          <div className="booking-details">
            <div className="detail-item">
              <span><strong>Mã vé:</strong></span>
              <span>{ticketData.ticketId?.slice(-8).toUpperCase()}</span>
            </div>
            <div className="detail-item">
              <span><strong>Mã chuyến bay:</strong></span>
              <span>{ticketData.flightCode}</span>
            </div>
            <div className="detail-item">
              <span><strong>Tuyến bay:</strong></span>
              <span>{ticketData.route}</span>
            </div>
            <div className="detail-item">
              <span><strong>Số lượng hành khách:</strong></span>
              <span>{ticketData.passengerCount}</span>
            </div>
            <div className="detail-item">
              <span><strong>Hạng vé:</strong></span>
              <span className="capitalize">{formatSeatClasses()}</span>
            </div>
            <div className="detail-item">
              <span><strong>Tổng tiền:</strong></span>
              <span className="price">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketData.totalPrice)}
              </span>
            </div>
            <div className="detail-item">
              <span><strong>Hạn thanh toán:</strong></span>
              <span className="urgent">
                {new Date(Date.now() + countdown * 1000).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          <div className="confirmation-actions">
            <button onClick={handlePayment} className="pay-now-btn">
              Thanh toán ngay
            </button>
            <button onClick={handleGoHome} className="continue-shopping-btn">
              Để thanh toán sau
            </button>
          </div>

          {countdown < 1800 && ( // Hiển thị cảnh báo khi còn dưới 30 phút
            <div className="warning-message">
              ⚠️ Chỉ còn {formatTime(countdown)} để thanh toán! Vé sẽ bị hủy nếu không thanh toán kịp thời.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Success;
