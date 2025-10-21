import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Flights from './pages/Flights';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Profile from './pages/Profile';
import QRScanner from './pages/QRScanner';
import Layout from './components/Layout';
import { API_ENDPOINTS, getAuthHeader } from './config';
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          // Lấy thông tin user từ token
          const response = await axios.get(API_ENDPOINTS.AUTH.PROFILE, getAuthHeader());
          console.log('Profile response:', response.data);
          
          // Kiểm tra nếu user có role là admin
          const userData = response.data.data || response.data;
          if (userData.role === 'admin') {
            setIsAuthenticated(true);
            setIsAdmin(true);
            console.log('✅ Admin authenticated');
          } else {
            // Nếu không phải admin, xóa token và đăng xuất
            console.log('❌ Not admin, role:', userData.role);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('❌ Lỗi xác thực:', error.response?.data || error.message);
          // Chỉ xóa token nếu là lỗi 401 (Unauthorized)
          if (error.response?.status === 401) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');
            setIsAuthenticated(false);
            setIsAdmin(false);
          } else {
            // Nếu lỗi khác (network, server), giữ token và thử lại sau
            console.log('⚠️ Network/Server error, keeping token');
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: 'background.default',
          }}
        >
          <Typography variant="h6">Đang tải...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated && isAdmin ? (
              <Navigate to="/" replace />
            ) : (
              <Login 
                setIsAuthenticated={setIsAuthenticated} 
                setIsAdmin={setIsAdmin} 
              />
            )
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated && isAdmin ? (
              <Layout setIsAuthenticated={setIsAuthenticated}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/flights" element={<Flights />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/qr-scanner" element={<QRScanner />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
