import React, { useState, useRef } from 'react';
import jsQR from 'jsqr';
import './QRScanner.css';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState('camera'); // 'camera' hoặc 'file'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startScanning = async () => {
    try {
      setScanning(true);
      setError('');
      setTicketInfo(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        const scan = () => {
          if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.height = video.videoHeight;
              canvas.width = video.videoWidth;

              context.drawImage(video, 0, 0, canvas.width, canvas.height);

              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);

              if (code) {
                // Dừng camera
                stream.getTracks().forEach(track => track.stop());

                // Xử lý dữ liệu QR code
                handleQRCode(code.data);
                return;
              }
            }

            if (scanning) {
              requestAnimationFrame(scan);
            }
          }
        };

        videoRef.current.onloadedmetadata = () => {
          requestAnimationFrame(scan);
        };
      }
    } catch (error) {
      console.error('Lỗi truy cập camera:', error);
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      setScanning(false);
    }
  };

  const handleQRCode = async (qrData) => {
    try {
      setError('');

      const response = await fetch('http://localhost:8080/api/v1/tickets/qr-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể đọc thông tin vé');
      }

      const data = await response.json();
      setTicketInfo(data.data);
    } catch (error) {
      console.error('Lỗi xử lý QR code:', error);
      setError(error.message || 'Không thể đọc thông tin từ mã QR');
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setError('');
      setTicketInfo(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Tạo canvas để xử lý ảnh
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            handleQRCode(code.data);
          } else {
            setError('Không tìm thấy mã QR trong hình ảnh. Vui lòng thử lại với hình ảnh rõ ràng hơn.');
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi xử lý file:', error);
      setError('Lỗi xử lý hình ảnh. Vui lòng thử lại.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const stopScanning = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
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

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'refunded': return 'Đã hoàn tiền';
      case 'failed': return 'Thất bại';
      case 'checked-in': return 'Đã check-in';
      default: return 'Không xác định';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'refunded': return '#6c757d';
      case 'failed': return '#dc3545';
      case 'checked-in': return '#17a2b8';
      default: return '#6c757d';
    }
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

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2>📱 Quét mã QR vé máy bay</h2>
        <p>Kiểm tra thông tin vé nhanh chóng bằng cách quét mã QR</p>

        {/* Mode Selection */}
        <div className="mode-selection">
          <button
            className={`mode-btn ${scanMode === 'camera' ? 'active' : ''}`}
            onClick={() => setScanMode('camera')}
          >
            📷 Camera
          </button>
          <button
            className={`mode-btn ${scanMode === 'file' ? 'active' : ''}`}
            onClick={() => setScanMode('file')}
          >
            📁 Tải ảnh
          </button>
        </div>
      </div>

      <div className="qr-scanner-content">
        {!ticketInfo && (
          <div className="scanner-section">
            <div className="camera-container">
              {scanMode === 'camera' ? (
                scanning ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-feed"
                    />
                    <canvas
                      ref={canvasRef}
                      className="qr-canvas"
                    />
                    <div className="camera-overlay">
                      <div className="qr-frame"></div>
                      <p>Đưa mã QR vào khung hình để quét</p>
                    </div>
                    <button onClick={stopScanning} className="stop-scan-btn">
                      ⏹️ Dừng quét
                    </button>
                  </>
                ) : (
                  <div className="camera-placeholder">
                    <div className="camera-icon">📷</div>
                    <p>Nhấn nút bên dưới để bắt đầu quét mã QR</p>
                    <button onClick={startScanning} className="start-scan-btn">
                      🚀 Bắt đầu quét
                    </button>
                  </div>
                )
              ) : (
                <div className="file-upload-section">
                  <div className="file-upload-placeholder">
                    <div className="upload-icon">📁</div>
                    <p>Chọn hình ảnh chứa mã QR từ máy tính</p>
                    <button onClick={triggerFileInput} className="upload-btn">
                      📂 Chọn ảnh
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div className="upload-tips">
                    <h4>💡 Mẹo chụp ảnh mã QR:</h4>
                    <ul>
                      <li>Đảm bảo mã QR nằm gọn trong khung hình</li>
                      <li>Chụp ở nơi có đủ ánh sáng</li>
                      <li>Giữ điện thoại ổn định khi chụp</li>
                      <li>Tránh chụp nghiêng hoặc mờ</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {ticketInfo && (
          <div className="ticket-info-section">
            <div className="ticket-info-header">
              <h3>✅ Thông tin vé máy bay</h3>
              <button onClick={() => setTicketInfo(null)} className="scan-again-btn">
                🔄 Quét lại
              </button>
            </div>

            <div className="ticket-details">

              <div className="flight-info-card">
                <div className="flight-route">
                  <div className="route-info">
                    <h4>{ticketInfo.flightId?.route || 'N/A'}</h4>
                    <p className="flight-code">{ticketInfo.flightId?.flightCode || 'N/A'}</p>
                  </div>
                  <div className="seat-info">
                    {renderSeatInfo(ticketInfo)}
                  </div>
                </div>

                <div className="flight-times">
                  <div className="time-info">
                    <span className="time-label">Khởi hành:</span>
                    <span className="time-value">
                      {ticketInfo.flightId?.departureTime ?
                        formatDate(ticketInfo.flightId.departureTime) : 'Chưa xác định'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Mã vé:</span>
                  <span className="info-value ticket-code">{ticketInfo.ticketCode}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Trạng thái:</span>
                  <span
                    className="info-value status-badge"
                    style={{ backgroundColor: getStatusColor(ticketInfo.status) }}
                  >
                    {getStatusText(ticketInfo.status)}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Họ tên:</span>
                  <span className="info-value">{ticketInfo.passengerName}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Giá vé:</span>
                  <span className="info-value price">{formatCurrency(ticketInfo.price)}</span>
                </div>
              </div>

              <div className="verification-info">
                <div className="verification-item">
                  <span className="verification-label">Thời gian xác thực:</span>
                  <span className="verification-value">
                    {formatDate(ticketInfo.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
