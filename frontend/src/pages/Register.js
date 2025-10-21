import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";


function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  // Hàm xử lý nhập dữ liệu
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Hàm submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.status !== 200) {
        alert(data.message || "Đăng ký thất bại!");
        return;
      }

      alert(data.message || "Đăng ký thành công!");
      navigate("/login"); // Chuyển hướng về trang đăng nhập
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      alert("Không thể kết nối server!");
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Tạo tài khoản</h2>
      <form className="register-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="fullName"
          placeholder="Họ và tên"
          value={formData.fullName}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phoneNumber"
          placeholder="Số điện thoại"
          value={formData.phoneNumber}
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
        <input
          type="password"
          name="confirmPassword"
          placeholder="Xác nhận mật khẩu"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
        <button type="submit">Đăng ký</button>
      </form>

      <p className="register-footer">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>

      <div className="back-home">
        <Link to="/">← Quay lại Trang chủ</Link>
      </div>
    </div>
  );
}

export default Register;
