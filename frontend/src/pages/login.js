import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Normalize email (loại bỏ khoảng trắng & chuyển về lowercase)
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Định dạng dữ liệu gửi đi
      const loginData = {
        email: normalizedEmail,
        password: formData.password
      };

      console.log('Dữ liệu gửi đi:', JSON.stringify(loginData, null, 2));

      // Gửi request đăng nhập với 2FA
      const res = await fetch("http://localhost:8080/api/v1/auth/login-with-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(loginData)
      });

      const data = await res.json();
      console.log('Phản hồi từ server:', { status: res.status, data });

      if (!res.ok) {
        alert(data.message || `Đăng nhập thất bại! (Mã lỗi: ${res.status})`);
        return;
      }

      // Nếu yêu cầu xác thực 2FA
      if (data.data && data.data.requiresVerification) {
        // Chuyển đến trang xác thực với thông tin cần thiết
        navigate('/verification', {
          state: {
            email: data.data.email,
            tempToken: data.data.tempToken
          }
        });
        return;
      }

      // Nếu đăng nhập thành công ngay (trường hợp không yêu cầu 2FA)
      if (data.data && data.data.token && data.data.token.accessToken) {
        // Lưu token vào localStorage
        localStorage.setItem("accessToken", data.data.token.accessToken);

        // Lưu refreshToken nếu có
        if (data.data.token.refreshToken) {
          localStorage.setItem("refreshToken", data.data.token.refreshToken);
        }

        // Lưu thông tin user vào state
        if (data.data.user) {
          setUser(data.data.user);
        }

        // Chuyển về Home
        navigate("/");
      } else {
        alert('Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server!");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Đăng nhập</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Mật khẩu"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Đăng nhập</button>
      </form>

      <p className="auth-text">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>

      <div className="back-home">
        <Link to="/">← Quay lại Trang chủ</Link>
      </div>
    </div>
  );
}

export default Login;
