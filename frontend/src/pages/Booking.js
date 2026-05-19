import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import SeatLayout from '../components/SeatLayout';
import './Booking.css';

const Booking = ({ user }) => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);
  const [paymentError, setPaymentError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  // Lấy thông tin chuyến bay
  useEffect(() => {
    const fetchFlight = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/v1/flights/${flightId}`);
        if (response.ok) {
          const data = await response.json();
          setFlight(data.data);
        } else {
          alert('Không tìm thấy thông tin chuyến bay');
          navigate('/');
        }
      } catch (error) {
        console.error('Lỗi lấy thông tin chuyến bay:', error);
        alert('Lỗi kết nối server');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchFlight();
    } else {
      navigate('/');
    }
  }, [flightId, navigate]);

  // Tính tổng tiền dựa trên ghế được chọn
  useEffect(() => {
    if (selectedSeats.length > 0 && flight) {
      const calculateTotalPrice = async () => {
        try {
          // Lấy thông tin bố cục ghế để tính giá
          const response = await fetch(`http://localhost:8080/api/v1/seat-layout/flights/${flightId}/seats`);
          if (response.ok) {
            const data = await response.json();
            const seatLayout = data.data;

            // Tính tổng giá từ các ghế được chọn
            const total = selectedSeats.reduce((sum, seatId) => {
              // Tìm ghế trong bố cục
              for (const row of seatLayout.layout) {
                for (const seat of row.seats) {
                  if (seat.seatId === seatId) {
                    // Tính giá dựa trên hạng ghế
                    let seatPrice = 0;
                    switch (seat.seatClass) {
                      case 'first':
                        seatPrice = flight.firstClassPrice || flight.economyPrice || 0;
                        break;
                      case 'business':
                        seatPrice = flight.businessPrice || flight.economyPrice || 0;
                        break;
                      case 'economy':
                        seatPrice = flight.economyPrice || 0;
                        break;
                      default:
                        seatPrice = flight.economyPrice || 0;
                    }
                    // ✅ Sửa lỗi: Không return trong reduce, chỉ cộng dồn giá trị
                    return sum + seatPrice;
                  }
                }
              }
              return sum;
            }, 0);

            setTotalPrice(total);
          }
        } catch (error) {
          console.error('Lỗi tính tổng tiền:', error);
        }
      };

      calculateTotalPrice();
    } else {
      setTotalPrice(0);
    }
  }, [selectedSeats, flight, flightId]);

  // Hàm xử lý đặt vé (bước 1 - tạo vé trước)
  const handleBooking = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt vé!');
      navigate('/login');
      return;
    }

    // Kiểm tra số chỗ còn trống
    if (flight.availableSeats < passengerCount) {
      alert(`Không đủ ghế! Chỉ còn ${flight.availableSeats} ghế, bạn đã chọn ${passengerCount} hành khách.`);
      return;
    }

    // Kiểm tra ghế được chọn
    if (!selectedSeats || selectedSeats.length === 0) {
      alert('Vui lòng chọn ghế ngồi!');
      return;
    }

    if (selectedSeats.length !== passengerCount) {
      alert(`Vui lòng chọn ${passengerCount} ghế cho ${passengerCount} hành khách!`);
      return;
    }

    setBooking(true);

    try {
      // Xác định loại vé dựa trên ghế được chọn
      const dominantSeatClass = await getDominantSeatClass(selectedSeats);
      const seatClasses = await getSeatClassesForSeats(selectedSeats);

      const bookingData = {
        flightCode: flight.flightCode,
        seatNumbers: selectedSeats, // Gửi mảng ghế đã chọn
        seatClasses: seatClasses, // Gửi mảng loại vé tương ứng với từng ghế
        ticketClass: dominantSeatClass, // Sử dụng loại vé đã xác định
        price: totalPrice,
        passengerCount: passengerCount,
        passengerName: user.fullName || `${user.firstName} ${user.lastName}` || 'Khách hàng',
        email: user.email,
        phoneNumber: user.phoneNumber || 'Chưa cập nhật',
        // paymentDeadline sẽ được tự động tính toán dựa trên thời gian đặt vé thực tế
        userId: user._id || user.id
      };
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        const result = await response.json();
        setTicketId(result.data._id);

        // Đặt ghế sau khi tạo vé thành công
        await bookSelectedSeats(result.data._id);

        setBookingCompleted(true); // Đặt vé hoàn thành, chờ thanh toán
        setShowPayment(false); // Ẩn form thanh toán ban đầu

        // Chuẩn bị dữ liệu vé để truyền sang trang Success
        const ticketData = {
          ticketId: result.data._id,
          flightCode: flight.flightCode,
          route: flight.route,
          passengerCount: passengerCount,
          class: result.data.ticketClass || dominantSeatClass, // Lấy từ backend nếu có, nếu không thì dùng giá trị đã tính
          selectedSeats: selectedSeats,
          seatClasses: seatClasses, // Thêm thông tin hạng vé chi tiết cho từng ghế
          totalPrice: totalPrice,
          seatDetails: selectedSeats.map((seatId, index) => {
            // Tính giá thực tế cho từng ghế
            let seatPrice = 0;
            const seatClass = seatClasses[index] || 'economy';

            // Tính giá dựa trên hạng ghế giống như trong calculateTotalPrice
            switch (seatClass) {
              case 'first':
                seatPrice = flight.firstClassPrice || flight.economyPrice || 0;
                break;
              case 'business':
                seatPrice = flight.businessPrice || flight.economyPrice || 0;
                break;
              case 'economy':
              default:
                seatPrice = flight.economyPrice || 0;
                break;
            }

            return {
              seatId,
              seatClass: seatClass,
              price: seatPrice
            };
          })
        };

        // Chuyển hướng đến trang Success với dữ liệu vé
        navigate('/success', { state: { ticketData } });
      } else {
        const error = await response.json();
        alert(`Lỗi đặt vé: ${error.message}`);
      }
    } catch (error) {
      console.error('Lỗi đặt vé:', error);
      alert('Không thể đặt vé. Vui lòng thử lại sau!');
    } finally {
      setBooking(false);
    }
  };

  // Hàm đặt ghế đã chọn
  const bookSelectedSeats = async (ticketId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8080/api/v1/seat-layout/flights/${flightId}/seats/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          seatIds: selectedSeats,
          ticketId: ticketId
        })
      });

      if (!response.ok) {
        console.error('Lỗi đặt ghế:', await response.text());
      }
    } catch (error) {
      console.error('Lỗi đặt ghế:', error);
    }
  };

  // Hàm xử lý thanh toán thành công
  const handlePaymentSuccess = (paymentIntentId) => {
    alert(`Thanh toán thành công! Mã thanh toán: ${paymentIntentId}\nVé đã được xác nhận và sẽ được gửi về email của bạn.`);
    navigate('/');
  };

  // Hàm xử lý lỗi thanh toán
  const handlePaymentError = (error) => {
    setPaymentError(error);
  };

  // Hàm xác định hạng vé chính dựa trên ghế được chọn
  const getDominantSeatClass = async (seats) => {
    if (seats.length === 0) return 'economy';

    try {
      // Lấy thông tin bố cục ghế để xác định loại vé của ghế đầu tiên
      const response = await fetch(`http://localhost:8080/api/v1/seat-layout/flights/${flightId}/seats`);
      if (response.ok) {
        const data = await response.json();
        const seatLayout = data.data;

        // Tìm ghế đầu tiên trong danh sách để xác định loại vé
        const firstSeatId = seats[0];
        for (const row of seatLayout.layout) {
          for (const seat of row.seats) {
            if (seat.seatId === firstSeatId) {
              // Chuyển đổi seatClass từ enum sang định dạng phù hợp
              switch (seat.seatClass) {
                case 'first':
                  return 'first';
                case 'business':
                  return 'business';
                case 'economy':
                default:
                  return 'economy';
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Lỗi xác định loại vé:', error);
    }

    // Fallback về economy nếu không xác định được
    return 'economy';
  };

  // Hàm lấy loại vé cho từng ghế riêng biệt
  const getSeatClassesForSeats = async (seats) => {
    if (seats.length === 0) return [];

    try {
      const response = await fetch(`http://localhost:8080/api/v1/seat-layout/flights/${flightId}/seats`);
      if (response.ok) {
        const data = await response.json();
        const seatLayout = data.data;

        // Tạo map để tìm loại vé cho từng ghế
        const seatClassMap = {};
        for (const row of seatLayout.layout) {
          for (const seat of row.seats) {
            seatClassMap[seat.seatId] = seat.seatClass;
          }
        }

        // Trả về mảng loại vé tương ứng với thứ tự ghế được chọn
        return seats.map(seatId => {
          const seatClass = seatClassMap[seatId];
          switch (seatClass) {
            case 'first':
              return 'first';
            case 'business':
              return 'business';
            case 'economy':
            default:
              return 'economy';
          }
        });
      }
    } catch (error) {
      console.error('Lỗi lấy loại vé cho ghế:', error);
    }

    // Fallback về economy nếu không xác định được
    return seats.map(() => 'economy');
  };

  if (loading) {
    return (
      <div className="booking-container">
        <div className="loading">Đang tải thông tin chuyến bay...</div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="booking-container">
        <div className="error">Không tìm thấy thông tin chuyến bay</div>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h2>Đặt vé máy bay</h2>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Quay lại tìm kiếm
        </button>
      </div>

      <div className="booking-content">
        {/* Thông tin chuyến bay */}
        <div className="flight-details">
          <h3>Thông tin chuyến bay</h3>
            <div className="flight-info">
              <p><strong>Mã chuyến bay:</strong> {flight.flightCode}</p>
              <p><strong>Tuyến bay:</strong> {flight.route}</p>
              <p><strong>Khởi hành:</strong> {new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'long', day: '2-digit' }).format(new Date(flight.departureTime))}</p>
              <p><strong>Đến nơi:</strong> {new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: 'long', day: '2-digit' }).format(new Date(flight.arrivalTime))}</p>
              <p><strong>Số ghế còn:</strong> {flight.availableSeats}/{flight.totalSeats}</p>
            </div>
          </div>

        {/* Thông tin hành khách - ẩn khi đặt vé xong */}
        {!bookingCompleted && (
          <div className="passenger-details">
            <h3>Thông tin hành khách</h3>
            <div className="passenger-info">
              <p><strong>Họ tên:</strong> {user?.fullName}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Số điện thoại:</strong> {user?.phoneNumber || 'Chưa cập nhật'}</p>
            </div>
          </div>
        )}

        {/* Chọn số lượng hành khách - ẩn khi đặt vé xong */}
        {!bookingCompleted && (
          <div className="passenger-count">
            <h3>Số lượng hành khách</h3>
            <div className="passenger-selector">
              <label>Số lượng vé:</label>
              <select
                value={passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value))}
                className="passenger-select"
              >
                {Array.from({ length: Math.min(flight.availableSeats, 20) }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} hành khách</option>
                ))}
              </select>
              <span className="seats-remaining">
                (Còn {flight.availableSeats} ghế)
              </span>
            </div>
            <div className="price-breakdown">
              <div className="price-item">
                <span>Số lượng:</span>
                <span>{passengerCount} vé</span>
              </div>
              <div className="price-item total">
                <span><strong>Tổng tiền:</strong></span>
                <span><strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}</strong></span>
              </div>
            </div>
            {passengerCount > flight.availableSeats && (
              <div className="warning-message">
                ⚠️ Số lượng hành khách vượt quá số ghế còn lại của chuyến bay!
              </div>
            )}
          </div>
        )}

        {/* Chọn ghế ngồi - ẩn khi đặt vé xong */}
        {!bookingCompleted && (
          <div className="seat-selection">
            <h3>Chọn ghế ngồi</h3>
            <div className="seat-selection-controls">
              <button
                type="button"
                onClick={() => setShowSeatSelection(!showSeatSelection)}
                className="toggle-seat-selection-btn"
              >
                {showSeatSelection ? 'Ẩn sơ đồ ghế' : 'Chọn ghế ngồi'}
              </button>
              {selectedSeats.length > 0 && (
                <div className="selected-seats-summary">
                  <span><strong>Ghế đã chọn:</strong> {selectedSeats.join(', ')}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSeats([])}
                    className="clear-seats-btn"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>

            {showSeatSelection && (
              <SeatLayout
                flightId={flightId}
                selectedSeats={selectedSeats}
                onSeatSelect={setSelectedSeats}
                passengerCount={passengerCount}
                maxSelections={passengerCount}
                flightPrices={flight}
                onSeatPriceChange={setTotalPrice}
              />
            )}

            {selectedSeats.length !== passengerCount && passengerCount > 0 && (
              <div className="seat-warning-message">
                ⚠️ Vui lòng chọn {passengerCount} ghế cho {passengerCount} hành khách!
              </div>
            )}
          </div>
        )}

        {/* Xác nhận đặt vé - Chờ thanh toán */}
        {bookingCompleted && ticketId && (
          <div className="booking-confirmation">
            <h3>Đặt vé thành công!</h3>
            <div className="confirmation-card">
              <div className="confirmation-icon">✅</div>
              <div className="confirmation-message">
                <p><strong>Vé của bạn đã được đặt thành công!</strong></p>
                <p>Vé đang ở trạng thái <strong>"Chờ thanh toán"</strong></p>
                <p>Vui lòng thanh toán trong vòng 1 giờ để giữ chỗ.</p>
              </div>
              <div className="booking-details">
                <div className="detail-item">
                  <span><strong>Mã vé:</strong></span>
                  <span>{ticketId.slice(-8).toUpperCase()}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Tổng tiền:</strong></span>
                  <span className="price">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}</span>
                </div>
                <div className="detail-item">
                  <span><strong>Hạn thanh toán:</strong></span>
                  <span>{new Date(Date.now() + 1 * 60 * 60 * 1000).toLocaleString('vi-VN')} (ước tính)</span>
                </div>
              </div>
              <div className="confirmation-actions">
                <button onClick={() => setShowPayment(true)} className="pay-now-btn">
                  Thanh toán ngay
                </button>
                <button onClick={() => navigate('/')} className="continue-shopping-btn">
                  Để thanh toán sau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thanh toán */}
        {showPayment && ticketId && (
          <div className="payment-section">
            <h3>Thanh toán</h3>
            <div className="payment-container">
              <PaymentForm
                amount={totalPrice}
                currency="vnd"
                ticketId={ticketId}
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
        )}

        {/* Tổng tiền và hành động */}
        <div className="booking-summary">
          <div className="total-price">
            <h3>Tổng tiền:</h3>
            <span className="final-price">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
            </span>
          </div>

          <div className="booking-actions">
            <button onClick={() => navigate('/')} className="cancel-btn">
              Hủy
            </button>
            {!showPayment && !bookingCompleted ? (
              <button
                onClick={handleBooking}
                disabled={booking}
                className="confirm-btn"
              >
                {booking ? 'Đang xử lý...' : 'Đặt vé xong'}
              </button>
            ) : (
              <button
                onClick={() => setShowPayment(false)}
                className="back-payment-btn"
              >
                ← Quay lại chọn vé
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
