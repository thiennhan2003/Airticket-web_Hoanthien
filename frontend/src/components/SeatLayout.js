import React, { useState, useEffect } from 'react';
import './SeatLayout.css';

const SeatLayout = ({
  flightId,
  selectedSeats = [],
  onSeatSelect,
  passengerCount = 1,
  maxSelections = 1,
  flightPrices = null, // Thêm thông tin giá vé từ flight
  onSeatPriceChange // Callback khi giá ghế thay đổi
}) => {
  const [seatLayout, setSeatLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    const fetchSeatLayout = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8080/api/v1/seat-layout/flights/${flightId}/seats`);
        if (response.ok) {
          const data = await response.json();
          setSeatLayout(data.data);
        } else {
          setError('Không thể tải sơ đồ ghế');
        }
      } catch (error) {
        console.error('Lỗi tải sơ đồ ghế:', error);
        setError('Lỗi kết nối server');
      } finally {
        setLoading(false);
      }
    };

    if (flightId) {
      fetchSeatLayout();
    }
  }, [flightId]);

  // Tính giá của một ghế dựa trên hạng
  const getSeatPrice = (seat) => {
    if (!flightPrices) return 0;

    switch (seat.seatClass) {
      case 'first':
        return flightPrices.firstClassPrice || flightPrices.economyPrice || 0;
      case 'business':
        return flightPrices.businessPrice || flightPrices.economyPrice || 0;
      case 'economy':
        return flightPrices.economyPrice || 0;
      default:
        return flightPrices.economyPrice || 0;
    }
  };

  // Format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getSeatColor = (seat) => {
    // Base color by seat class
    let baseColor = '';

    switch (seat.seatClass) {
      case 'first':
        baseColor = '#FFD700'; // Yellow/gold for first class
        break;
      case 'business':
        baseColor = '#9333EA'; // Purple for business class
        break;
      case 'economy':
        baseColor = '#3B82F6'; // Blue for economy class
        break;
      default:
        baseColor = '#6B7280'; // Gray for unknown class
    }

    // Override color based on status
    if (seat.status === 'booked') {
      return '#EF4444'; // Red for booked seats
    }

    // If seat is selected by user, show green
    if (selectedSeats.includes(seat.seatId)) {
      return '#10B981'; // Green for selected seats
    }

    return baseColor;
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'booked') {
      return; // Can't select booked seats
    }

    if (selectedSeats.includes(seat.seatId)) {
      // Deselect seat
      const newSelectedSeats = selectedSeats.filter(id => id !== seat.seatId);
      onSeatSelect(newSelectedSeats);

      // Tính lại tổng giá sau khi bỏ chọn ghế
      if (onSeatPriceChange) {
        const totalPrice = newSelectedSeats.reduce((sum, seatId) => {
          const seatInfo = getSeatById(seatId);
          return sum + (seatInfo ? getSeatPrice(seatInfo) : 0);
        }, 0);
        onSeatPriceChange(totalPrice);
      }
    } else {
      // Select seat (check max selections limit)
      if (selectedSeats.length < maxSelections) {
        const newSelectedSeats = [...selectedSeats, seat.seatId];
        onSeatSelect(newSelectedSeats);

        // Tính lại tổng giá sau khi chọn ghế
        if (onSeatPriceChange) {
          const totalPrice = newSelectedSeats.reduce((sum, seatId) => {
            const seatInfo = getSeatById(seatId);
            return sum + (seatInfo ? getSeatPrice(seatInfo) : 0);
          }, 0);
          onSeatPriceChange(totalPrice);
        }
      }
    }
  };

  const handleSeatHover = (seat) => {
    setHoveredSeat(seat);
  };

  const handleSeatLeave = () => {
    setHoveredSeat(null);
  };

  const getSeatById = (seatId) => {
    if (!seatLayout) return null;
    for (const row of seatLayout.layout) {
      for (const seat of row.seats) {
        if (seat.seatId === seatId) {
          return seat;
        }
      }
    }
    return null;
  };

  const isSeatSelected = (seatId) => {
    return selectedSeats.includes(seatId);
  };

  if (loading) {
    return (
      <div className="seat-layout-container">
        <div className="loading">Đang tải sơ đồ ghế...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seat-layout-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!seatLayout) {
    return (
      <div className="seat-layout-container">
        <div className="error">Không có dữ liệu sơ đồ ghế</div>
      </div>
    );
  }

  return (
    <div className="seat-layout-container">
      <div className="seat-layout-header">
        <h3>Chọn ghế ngồi</h3>
        <div className="seat-legend">
          <div className="legend-item">
            <div className="legend-color available"></div>
            <span>Ghế trống</span>
          </div>
          <div className="legend-item">
            <div className="legend-color selected"></div>
            <span>Ghế đã chọn</span>
          </div>
          <div className="legend-item">
            <div className="legend-color booked"></div>
            <span>Ghế đã đặt</span>
          </div>
        </div>
      </div>

      <div className="seat-class-info">
        <div className="class-info first-class">
          <div className="class-color first"></div>
          <span>Hạng nhất ({flightPrices ? formatPrice(flightPrices.firstClassPrice || flightPrices.economyPrice || 0) : 'N/A'})</span>
        </div>
        <div className="class-info business-class">
          <div className="class-color business"></div>
          <span>Thương gia ({flightPrices ? formatPrice(flightPrices.businessPrice || flightPrices.economyPrice || 0) : 'N/A'})</span>
        </div>
        <div className="class-info economy-class">
          <div className="class-color economy"></div>
          <span>Phổ thông ({flightPrices ? formatPrice(flightPrices.economyPrice || 0) : 'N/A'})</span>
        </div>
      </div>

      <div className="airplane-container">
        <div className="airplane">
          {/* Cockpit Area */}
          <div className="airplane-header">
            <div className="cockpit-label">COCKPIT</div>
            <div className="exit-row">EXIT</div>
          </div>

          {/* Main Cabin Layout */}
          <div className="seat-grid">
            {seatLayout.layout.map((row, rowIndex) => (
              <div key={row.row} className="seat-row">
                <div className="row-number">{row.row}</div>

                <div className="seats-container">
                  {/* Left seats (A, B, C) */}
                  <div className="left-seats">
                    {row.seats.slice(0, 3).map((seat, index) => {
                      const isWindowSeat = index === 0; // Chỉ ghế A là cửa sổ
                      return (
                        <div
                          key={seat.seatId}
                          className={`seat ${isSeatSelected(seat.seatId) ? 'selected' : ''} ${seat.status === 'booked' ? 'booked' : 'available'} ${isWindowSeat ? 'window' : 'aisle-seat'}`}
                          style={{
                            backgroundColor: getSeatColor(seat),
                            cursor: seat.status === 'booked' ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleSeatClick(seat)}
                          onMouseEnter={() => handleSeatHover(seat)}
                          onMouseLeave={handleSeatLeave}
                          title={`${seat.seatId} - ${seat.seatClass === 'first' ? 'Hạng nhất' : seat.seatClass === 'business' ? 'Thương gia' : 'Phổ thông'} - ${isWindowSeat ? 'Ghế cửa sổ' : 'Ghế lối đi'} (${formatPrice(getSeatPrice(seat))})`}
                        >
                          {seat.seatId}
                        </div>
                      );
                    })}
                  </div>

                  {/* Center aisle */}
                  <div className="aisle">
                    <div className="aisle-label">Lối đi</div>
                  </div>

                  {/* Right seats (D, E, F) */}
                  <div className="right-seats">
                    {row.seats.slice(3, 6).map((seat, index) => {
                      const isWindowSeat = index === 2; // Chỉ ghế F là cửa sổ (index 2 trong slice 3-6)
                      return (
                        <div
                          key={seat.seatId}
                          className={`seat ${isSeatSelected(seat.seatId) ? 'selected' : ''} ${seat.status === 'booked' ? 'booked' : 'available'} ${isWindowSeat ? 'window' : 'aisle-seat'}`}
                          style={{
                            backgroundColor: getSeatColor(seat),
                            cursor: seat.status === 'booked' ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleSeatClick(seat)}
                          onMouseEnter={() => handleSeatHover(seat)}
                          onMouseLeave={handleSeatLeave}
                          title={`${seat.seatId} - ${seat.seatClass === 'first' ? 'Hạng nhất' : seat.seatClass === 'business' ? 'Thương gia' : 'Phổ thông'} - ${isWindowSeat ? 'Ghế cửa sổ' : 'Ghế lối đi'} (${formatPrice(getSeatPrice(seat))})`}
                        >
                          {seat.seatId}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="row-number">{row.row}</div>
              </div>
            ))}
          </div>

          {/* Tail section */}
          <div className="airplane-footer">
            <div className="exit-row">EXIT</div>
          </div>
        </div>
      </div>

      {/* Hiển thị thông tin ghế đang hover */}
      {hoveredSeat && (
        <div className="seat-hover-info">
          <div className="seat-hover-card">
            <div className="seat-hover-title">
              <strong>{hoveredSeat.seatId}</strong>
            </div>
            <div className="seat-hover-details">
              <div className="seat-hover-class">
                Hạng: {hoveredSeat.seatClass === 'first' ? 'Hạng nhất' : hoveredSeat.seatClass === 'business' ? 'Thương gia' : 'Phổ thông'}
              </div>
              <div className="seat-hover-position">
                Vị trí: {(() => {
                  let currentRow = null;
                  let seatInRowIndex = null;

                  for (const row of seatLayout.layout) {
                    const seatIndexInRow = row.seats.findIndex(s => s.seatId === hoveredSeat.seatId);
                    if (seatIndexInRow !== -1) {
                      currentRow = row;
                      seatInRowIndex = seatIndexInRow;
                      break;
                    }
                  }

                  if (currentRow && seatInRowIndex !== null) {
                    const isWindowSeat = seatInRowIndex === 0 || seatInRowIndex === 5;
                    return isWindowSeat ? 'Ghế cửa sổ' : 'Ghế lối đi';
                  }

                  return 'Ghế lối đi';
                })()}
              </div>
              <div className="seat-hover-price">
                Giá: {formatPrice(getSeatPrice(hoveredSeat))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="seat-selection-info">
        <p>Đã chọn: {selectedSeats.length}/{maxSelections} ghế</p>
        {selectedSeats.length > 0 && (
          <div className="selected-seats">
            <p><strong>Ghế đã chọn:</strong></p>
            <div className="selected-seats-list">
              {selectedSeats.map(seatId => {
                const seat = getSeatById(seatId);

                // Tìm vị trí ghế trong hàng hiện tại
                let seatInRowIndex = null;
                for (const row of seatLayout.layout) {
                  const index = row.seats.findIndex(s => s.seatId === seatId);
                  if (index !== -1) {
                    seatInRowIndex = index;
                    break;
                  }
                }

                // Với layout 3+3: chỉ ghế A (0) và F (5) là cửa sổ
                const isWindowSeat = seatInRowIndex !== null &&
                  (seatInRowIndex === 0 || seatInRowIndex === 5);

                return (
                  <div key={seatId} className="selected-seat-badge">
                    <span className="seat-id">{seatId}</span>
                    <span className="seat-position">{isWindowSeat ? '🪟 Cửa sổ' : '🚶 Lối đi'}</span>
                    <span className="seat-price">({formatPrice(seat ? getSeatPrice(seat) : 0)})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatLayout;
