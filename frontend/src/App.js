import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import BannerSlider from "./BannerSlider";
import Login from "./pages/login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Booking from "./pages/Booking";
import Success from "./pages/Success";
import Payment from "./pages/Payment";
import TicketDetail from "./pages/TicketDetail";
import Verification from "./pages/Verification";
import "./pages/TicketDetail.css";

// Home component
function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Hàm clear kết quả tìm kiếm
  const handleClearResults = () => {
    setFlights([]);
  };
  const handleSearch = async (e) => {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const formData = new FormData(e.target);
    const from = formData.get('from')?.trim().toLowerCase();
    const to = formData.get('to')?.trim().toLowerCase();

    if (!from || !to) {
      alert('Vui lòng nhập nơi đi và nơi đến!');
      return;
    }

    try {
      // Tạo query string cho tìm kiếm
      const queryParams = new URLSearchParams({
        route: `${from} - ${to}`,
        limit: '50' // Lấy nhiều kết quả để tìm kiếm
      });

      const response = await fetch(`http://localhost:8080/api/v1/flights?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Lọc và sắp xếp kết quả phù hợp nhất
      let searchResults = data.data?.flights || [];

      if (searchResults.length === 0) {
        // Không tìm thấy kết quả, thử tìm kiếm gần đúng
        const fuzzyQueryParams = new URLSearchParams({
          route: `${from}|${to}`,
          limit: '20'
        });

        const fuzzyResponse = await fetch(`http://localhost:8080/api/v1/flights?${fuzzyQueryParams}`);
        const fuzzyData = await fuzzyResponse.json();
        searchResults = fuzzyData.data?.flights || [];

        if (searchResults.length === 0) {
          setFlights([]);
          return;
        }
      }

      setFlights(searchResults);
    } catch (error) {
      console.error('Lỗi khi tìm kiếm chuyến bay:', error);
      alert('Không thể tìm kiếm chuyến bay. Vui lòng thử lại sau!');
      setFlights([]);
    }
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Hàm xử lý đặt vé
  const handleBooking = (flight) => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt vé!');
      return;
    }

    // Điều hướng đến trang đặt vé với flightId
    window.location.href = `/booking/${flight._id}`;
  };

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h2 className="logo">✈️ FlightBooking</h2>
        </div>
        <div className="nav">
          <button className="nav-btn">Flights</button>
          <button className="nav-btn">Hotels</button>
          {user ? (
            <div className="user-menu">
              <div
                className="user-info"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="username">{user.fullName}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <span className="dropdown-arrow">▼</span>
              </div>
              
              {showUserMenu && (
                <div className={`dropdown-menu ${showUserMenu ? 'show' : ''}`}>
                  <button onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}>
                    <span className="icon">👤</span>
                    Hồ sơ cá nhân
                  </button>
                  <button onClick={() => {
                    handleLogout();
                    setShowUserMenu(false);
                  }}>
                    <span className="icon">🚪</span>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <button className="login-btn">Đăng nhập</button>
            </Link>
          )}
        </div>
      </header>

      {/* Banner */}
      <BannerSlider />

      {/* Search Box */}
      <section className="search-box">
        <h3>🔍 Tìm chuyến bay</h3>
        <form className="search-form" onSubmit={handleSearch}>
          <input name="from" type="text" placeholder="Nơi đi" required />
          <input name="to" type="text" placeholder="Nơi đến" required />
          <input type="date" required min={new Date().toISOString().split('T')[0]} />
          <input type="number" name="passengers" placeholder="Hành khách" min="1" defaultValue="1" />
          <select name="class">
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
          <button type="submit" className="btn-search">Tìm chuyến bay</button>
        </form>
      </section>

      {/* Flight Results */}
      <section className="results">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Kết quả tìm kiếm</h3>
          {flights.length > 0 && (
            <button
              onClick={handleClearResults}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Tìm kiếm mới
            </button>
          )}
        </div>
        {flights.length > 0 ? (
          flights.map((flight) => {
            // Kiểm tra xem chuyến bay đã khởi hành chưa (thời gian đầy đủ)
            const departureTime = new Date(flight.departureTime);
            const now = new Date();
            const isPastFlight = departureTime < now;

            return (
              <div key={flight._id} className={`flight-card ${isPastFlight ? 'past-flight' : ''}`}>
                <div>
                  <strong>{flight.flightCode}</strong>
                  {isPastFlight && <span className="past-flight-badge">ĐÃ KHỞI HÀNH</span>}
                  <p>Tuyến bay: {flight.route}</p>
                  <p>Khởi hành: {new Date(flight.departureTime).toLocaleString('vi-VN')}</p>
                  <p>Đến nơi: {new Date(flight.arrivalTime).toLocaleString('vi-VN')}</p>
                  <p>Số ghế còn: {flight.availableSeats}/{flight.totalSeats}</p>
                  <div className="flight-prices">
                    <p className="price-label">Giá vé:</p>
                    <div className="price-options">
                      {flight.economyPrice && (
                        <span className="price-option">
                          <span className="price-class">Economy:</span>
                          <span className="price-value">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(flight.economyPrice)}
                          </span>
                        </span>
                      )}
                      {flight.businessPrice && (
                        <span className="price-option">
                          <span className="price-class">Business:</span>
                          <span className="price-value">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(flight.businessPrice)}
                          </span>
                        </span>
                      )}
                      {flight.firstClassPrice && (
                        <span className="price-option">
                          <span className="price-class">First Class:</span>
                          <span className="price-value">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(flight.firstClassPrice)}
                          </span>
                        </span>
                      )}
                      {!flight.economyPrice && !flight.businessPrice && !flight.firstClassPrice && (
                        <span className="price-unavailable">Giá chưa cập nhật</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className={`btn-book ${isPastFlight ? 'disabled' : ''}`}
                  onClick={() => handleBooking(flight)}
                  disabled={!user || isPastFlight}
                >
                  {isPastFlight ? 'Đã khởi hành' : (user ? 'Đặt vé' : 'Đăng nhập để đặt vé')}
                </button>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              {flights.length === 0 && 'Nhập thông tin để tìm chuyến bay...'}
            </p>
            <p style={{ color: '#666' }}>
              💡 Mẹo: Nhập tên thành phố như "Hà Nội", "TP.HCM", "Đà Nẵng"...
            </p>
          </div>
        )}
      </section>

      {/* Promo Section */}
      <section className="promo-section">
        <h3>✈️ Dịch vụ nổi bật</h3>
        <div className="promo-grid">
          <div className="promo-card">
             <p>Ưu đãi vé máy bay giá rẻ</p>
          </div>
          <div className="promo-card">
            <p>Khách sạn tiện nghi</p>
          </div>
          <div className="promo-card">
            <p>Bảo hiểm du lịch an toàn</p>
          </div>
          <div className="promo-card">
            <p>Thuê xe du lịch</p>
          </div>
        </div>
      </section>

      {/* Promo Flights Section */}
<section className="promo-flights">
  <h3>✈️ Ưu đãi vé máy bay dành cho bạn!</h3>

  {/* Promo Banners */}
  <div className="promo-banners">
    <div className="banner-card">
      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRj6m2XYpqNmSmMYvG2YK4jtEr_c2tSMCGm0w&s" alt="Promo 1" />
      <p>10.10 Travel Sale - Giảm đến 30%</p>
    </div>
    <div className="banner-card">
      <img src="https://ik.imagekit.io/tvlk/image/imageResource/2025/09/11/1757555758021-be0e2d169a3d27772f10080585eaeaca.jpeg?tr=q-75" alt="Promo 2" />
      <p>Quà tặng 10.000 voucher hấp dẫn</p>
    </div>
  </div>

  {/* New User Promo Codes */}
  <div className="promo-codes">
    <h4>Mã ưu đãi tặng bạn mới</h4>
    <div className="codes-grid">
      <div className="code-card">
        <p>Giảm ngay 50K</p>
        <button onClick={() => navigator.clipboard.writeText("TVLKBANMOI")}>Copy</button>
      </div>
      <div className="code-card">
        <p>8% giảm giá khách sạn</p>
        <button onClick={() => navigator.clipboard.writeText("TVLKBANMOI")}>Copy</button>
      </div>
      <div className="code-card">
        <p>8% giảm hoạt động du lịch</p>
        <button onClick={() => navigator.clipboard.writeText("TVLKBANMOI")}>Copy</button>
      </div>
    </div>
  </div>

  {/* Flight Deals */}
<div className="flight-deals">
  <h4>Vé máy bay nội địa giá tốt nhất</h4>

  {/* Tabs chọn thành phố */}
  <div className="deals-tabs">
    {["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Huế", "Phú Quốc", "Nha Trang"].map((city) => (
      <button key={city}>{city}</button>
    ))}
  </div>

  {/* Cards */}
  <div className="deals-cards">
    {[
      {
        from: "TP HCM",
        to: "Hà Nội",
        price: "702.308 VND",
        date: "2 thg 3 2026",
        img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4b2NNaDSaCuzN5iKgi0WA_PU6PVYIU_7epw&s"
      },
      {
        from: "Đà Nẵng",
        to: "Hà Nội",
        price: "680.600 VND",
        date: "30 thg 9 2025",
        img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkrTe76itRaRGDa3CpFjG3gJMY_Fi2yWydCg&s"
      },
      {
        from: "Huế",
        to: "Hà Nội",
        price: "680.600 VND",
        date: "2 thg 10 2025",
        img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvsE2rmsNhgXZRT-U-OucddnukxMVa3RTb5w&s"
      },
    ].map((f, idx) => (
      <div key={idx} className="deal-card">
        <span className="label">MỘT CHIỀU</span>
        <img src={f.img} alt={`Flight ${idx + 1}`} />
        <p>{f.from} - {f.to}</p>
        <p>{f.date}</p>
        <p className="price">{f.price}</p>
      </div>
    ))}
  </div>

  {/* Button Xem thêm */}
  <button className="btn-view-more">Xem thêm ưu đãi bay</button>
  </div>

</section>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Về chúng tôi</h4>
            <ul>
              <li><a href="/about">Giới thiệu</a></li>
              <li><a href="/contact">Liên hệ</a></li>
              <li><a href="/careers">Tuyển dụng</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a href="/FAQ">FAQ</a></li>
              <li><a href="/chinhsach">Chính sách bảo mật</a></li>
              <li><a href="/dieukhoan">Điều khoản & điều kiện</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Kết nối với chúng tôi</h4>
            <div className="social-icons">
              <a href="https://www.facebook.com"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIp8fhKe_0pUg2VB0rJemNKkZl_1UOHc-Oaw&s" alt="Facebook" /></a>
              <a href="https://www.instagram.com"><img src="https://cdn.pixabay.com/photo/2016/12/04/18/58/instagram-1882330_1280.png" alt="instagram"></img></a>
              <a href="https://x.com"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIkPCqdgzFkqjlpmxBsh_-xzVE7Rm6DqRnhQ&s" alt="Twitter" /></a>
            </div>
          </div>
        </div>
        <p className="footer-copy">© 2025 Online Flight Booking. All rights reserved.</p>
      </footer>
    </div>
  );
}

// App component
function App() {
  const [user, setUser] = useState(null);

  // Hàm kiểm tra và refresh token thông minh
  const checkAndRefreshToken = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/get-profile", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (res.status === 401) {
        // Token hết hạn, thử refresh token
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const refreshRes = await fetch("http://localhost:8080/api/v1/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem("accessToken", refreshData.data.accessToken);
              if (refreshData.data.refreshToken) {
                localStorage.setItem("refreshToken", refreshData.data.refreshToken);
              }

              // Thử lấy profile lại với token mới
              const newRes = await fetch("http://localhost:8080/api/v1/auth/get-profile", {
                headers: {
                  "Authorization": `Bearer ${refreshData.data.accessToken}`,
                  "Content-Type": "application/json"
                },
              });

              if (newRes.ok) {
                const newData = await newRes.json();
                if (newData.data) {
                  setUser(newData.data);
                }
              }
              return;
            }
          } catch (refreshError) {
            console.error("Lỗi refresh token:", refreshError);
          }
        }

        // Không thể refresh token, đăng xuất
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
      } else if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setUser(data.data);
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra token:", err);
      // Không xóa token ngay, chỉ log lỗi để tránh đăng xuất không mong muốn
      // localStorage.removeItem("accessToken");
      // localStorage.removeItem("refreshToken");
      // setUser(null);
    }
  };

  // Lấy profile khi load app
  useEffect(() => {
    checkAndRefreshToken();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
        <Route path="/booking/:flightId" element={<Booking user={user} />} />
        <Route path="/success" element={<Success />} />
        <Route path="/payment/:ticketId" element={<Payment user={user} />} />
        {/* <Route path="/payment/" element={<Payment user={user} />} /> */}
        <Route path="/verification" element={<Verification setUser={setUser} />} />
        <Route path="/ticket/:ticketId" element={<TicketDetail user={user} setUser={setUser} />} />
        
      </Routes>
    </Router>
  );
}

export default App;
