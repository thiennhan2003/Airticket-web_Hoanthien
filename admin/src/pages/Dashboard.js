import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import {
  Flight as FlightIcon,
  ConfirmationNumber as TicketIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeader } from '../config';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: (theme) =>
        theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
      '&:hover': {
        boxShadow: 3,
        transform: 'translateY(-4px)',
        transition: 'all 0.3s ease-in-out',
      },
    }}
    elevation={2}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </Box>
      <Icon
        sx={{
          fontSize: 48,
          color: color || 'primary.main',
          opacity: 0.8,
        }}
      />
    </Box>
  </Paper>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalPaidTickets: 0,
    totalRevenue: 0,
    pendingTickets: 0,
    refundedTickets: 0,
    failedTickets: 0,
    totalFlights: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Lấy thông tin số lượng chuyến bay
        const flightsRes = await axios.get(API_ENDPOINTS.FLIGHTS.LIST, getAuthHeader());
        const flights = flightsRes.data.data?.flights || flightsRes.data.data || [];
        const totalFlights = flights.length;

        // Chỉ gọi API tickets một lần
        const ticketsRes = await axios.get(API_ENDPOINTS.TICKETS.LIST, getAuthHeader());

        // Lấy toàn bộ danh sách vé từ response
        const tickets = ticketsRes.data.data?.tickets || ticketsRes.data.data || [];

        // Tính thống kê từ danh sách vé
        const totalTickets = tickets.length;

        // Đếm số vé đã thanh toán
        const paidTickets = tickets.filter(ticket => ticket.paymentStatus === 'paid');
        const totalPaidTickets = paidTickets.length;

        // Tính tổng doanh thu từ vé đã thanh toán
        const revenue = paidTickets.reduce((sum, ticket) => {
          // Tính giá cho một ghế (price / passengerCount) rồi nhân lại để đảm bảo chính xác
          const pricePerSeat = ticket.price / (ticket.passengerCount || 1);
          return sum + (pricePerSeat * (ticket.passengerCount || 1));
        }, 0);

        // Đếm số vé theo trạng thái
        const pendingTickets = tickets.filter(ticket => ticket.paymentStatus === 'pending').length;
        const refundedTickets = tickets.filter(ticket => ticket.paymentStatus === 'refunded').length;
        const failedTickets = tickets.filter(ticket => ticket.paymentStatus === 'failed').length;

        setStats({
          totalTickets: totalTickets,
          totalPaidTickets: totalPaidTickets,
          totalRevenue: revenue,
          pendingTickets: pendingTickets,
          refundedTickets: refundedTickets,
          failedTickets: failedTickets,
          totalFlights: totalFlights,
        });

        setError('');
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Không thể tải thống kê');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const statsCards = [
    { title: 'Tổng vé', value: stats.totalTickets, icon: TicketIcon, color: 'primary.main' },
    { title: 'Đã thanh toán', value: stats.totalPaidTickets, icon: MoneyIcon, color: 'success.main' },
    { title: 'Doanh thu', value: formatCurrency(stats.totalRevenue), icon: MoneyIcon, color: 'warning.main' },
    { title: 'Chuyến bay', value: stats.totalFlights, icon: FlightIcon, color: 'info.main' },
    { title: 'Chờ thanh toán', value: stats.pendingTickets, icon: TicketIcon, color: 'warning.main' },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tổng quan
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Thống kê đặt vé
            </Typography>
            <Box sx={{ height: 300, backgroundColor: 'grey.100', borderRadius: 1 }}>
              {/* Placeholder for chart */}
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
                color="text.secondary"
              >
                Biểu đồ thống kê sẽ hiển thị ở đây
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Thống kê trạng thái vé
            </Typography>
            <Box>
              <Box sx={{
                p: 2,
                mb: 2,
                backgroundColor: 'success.light',
                borderRadius: 1,
                color: 'success.contrastText'
              }}>
                <Typography variant="subtitle2">
                  ✅ Đã thanh toán: {stats.totalPaidTickets}
                </Typography>
              </Box>
              <Box sx={{
                p: 2,
                mb: 2,
                backgroundColor: 'warning.light',
                borderRadius: 1,
                color: 'warning.contrastText'
              }}>
                <Typography variant="subtitle2">
                  ⏳ Chờ thanh toán: {stats.pendingTickets}
                </Typography>
              </Box>
              <Box sx={{
                p: 2,
                mb: 2,
                backgroundColor: 'info.light',
                borderRadius: 1,
                color: 'info.contrastText'
              }}>
                <Typography variant="subtitle2">
                  ↩ Đã hoàn tiền: {stats.refundedTickets}
                </Typography>
              </Box>
              <Box sx={{
                p: 2,
                backgroundColor: 'error.light',
                borderRadius: 1,
                color: 'error.contrastText'
              }}>
                <Typography variant="subtitle2">
                  ❌ Thất bại: {stats.failedTickets}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
