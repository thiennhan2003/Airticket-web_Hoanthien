import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Button,
  Stack
} from '@mui/material';
import {
  Flight as FlightIcon,
  ConfirmationNumber as TicketIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  LocalAirport as AirportIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeader } from '../config';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue, subtitle }) => (
  <Card
    sx={{
      height: '100%',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      '&:hover': {
        boxShadow: 6,
        transform: 'translateY(-4px)',
        transition: 'all 0.3s ease-in-out',
      },
    }}
    elevation={2}
  >
    <CardContent sx={{ p: 3 }}>
      {/* Header với icon */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" color="textSecondary" fontWeight="medium">
          {title}
        </Typography>
        <Avatar
          sx={{
            backgroundColor: color,
            width: 40,
            height: 40,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Avatar>
      </Box>
      
      {/* Value */}
      <Typography variant="h4" component="div" fontWeight="bold" color={color} mb={1}>
        {value}
      </Typography>
      
      {/* Subtitle */}
      {subtitle && (
        <Typography variant="body2" color="textSecondary" mb={1.5} sx={{ lineHeight: 1.3 }}>
          {subtitle}
        </Typography>
      )}
      
      {/* Trend */}
      {trend && (
        <Box display="flex" alignItems="center" mt={1}>
          {trend === 'up' ? (
            <TrendingUpIcon sx={{ color: 'success.main', mr: 0.5, fontSize: 18 }} />
          ) : (
            <TrendingDownIcon sx={{ color: 'error.main', mr: 0.5, fontSize: 18 }} />
          )}
          <Typography 
            variant="body2" 
            color={trend === 'up' ? 'success.main' : 'error.main'}
            fontWeight="medium"
          >
            {trendValue}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
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
    totalUsers: 0,
    conversionRate: 0,
    avgTicketValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentFlights, setRecentFlights] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Lấy thông tin số lượng chuyến bay
        const flightsRes = await axios.get(API_ENDPOINTS.FLIGHTS.LIST, getAuthHeader());
        const flights = flightsRes.data.data?.flights || flightsRes.data.data || [];
        const totalFlights = flights.length;

        // Lấy thông tin users
        const usersRes = await axios.get(API_ENDPOINTS.USERS.LIST, getAuthHeader());
        const users = usersRes.data.data?.users || usersRes.data.data || [];
        const totalUsers = users.length;

        // Lấy thông tin tickets
        const ticketsRes = await axios.get(API_ENDPOINTS.TICKETS.LIST, getAuthHeader());
        const tickets = ticketsRes.data.data?.tickets || ticketsRes.data.data || [];

        // Tính thống kê từ danh sách vé
        const totalTickets = tickets.length;

        // Đếm số vé đã thanh toán
        const paidTickets = tickets.filter(ticket => ticket.paymentStatus === 'paid');
        const totalPaidTickets = paidTickets.length;

        // Tính tổng doanh thu từ vé đã thanh toán
        const revenue = paidTickets.reduce((sum, ticket) => {
          const pricePerSeat = ticket.price / (ticket.passengerCount || 1);
          return sum + (pricePerSeat * (ticket.passengerCount || 1));
        }, 0);

        // Đếm số vé theo trạng thái
        const pendingTickets = tickets.filter(ticket => ticket.paymentStatus === 'pending').length;
        const refundedTickets = tickets.filter(ticket => ticket.paymentStatus === 'refunded').length;
        const failedTickets = tickets.filter(ticket => ticket.paymentStatus === 'failed').length;

        // Tính conversion rate và average ticket value
        const conversionRate = totalTickets > 0 ? ((totalPaidTickets / totalTickets) * 100).toFixed(1) : 0;
        const avgTicketValue = totalPaidTickets > 0 ? (revenue / totalPaidTickets) : 0;

        // Lấy recent tickets (5 vé gần nhất)
        const recentTicketsData = tickets
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        // Lấy recent flights (5 chuyến bay gần nhất)
        const recentFlightsData = flights
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        // Tạo dữ liệu cho biểu đồ (7 ngày gần nhất)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayTickets = tickets.filter(ticket => {
            const ticketDate = new Date(ticket.createdAt);
            return ticketDate.toDateString() === date.toDateString();
          });
          
          chartData.push({
            date: date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
            tickets: dayTickets.length,
            revenue: dayTickets
              .filter(t => t.paymentStatus === 'paid')
              .reduce((sum, t) => sum + (t.price || 0), 0)
          });
        }

        setStats({
          totalTickets: totalTickets,
          totalPaidTickets: totalPaidTickets,
          totalRevenue: revenue,
          pendingTickets: pendingTickets,
          refundedTickets: refundedTickets,
          failedTickets: failedTickets,
          totalFlights: totalFlights,
          totalUsers: totalUsers,
          conversionRate: conversionRate,
          avgTicketValue: avgTicketValue,
        });

        setRecentTickets(recentTicketsData);
        setRecentFlights(recentFlightsData);
        setChartData(chartData);
        setLastRefresh(new Date());
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'refunded': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'refunded': return 'Đã hoàn tiền';
      case 'failed': return 'Thất bại';
      default: return status;
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const statsCards = [
    { 
      title: 'Tổng vé', 
      value: stats.totalTickets, 
      icon: TicketIcon, 
      color: '#1976d2',
      trend: 'up',
      trendValue: '+12%',
      subtitle: 'So với tháng trước'
    },
    { 
      title: 'Đã thanh toán', 
      value: stats.totalPaidTickets, 
      icon: CheckCircleIcon, 
      color: '#2e7d32',
      trend: 'up',
      trendValue: '+8%',
      subtitle: `${stats.conversionRate}% tỷ lệ chuyển đổi`
    },
    { 
      title: 'Doanh thu', 
      value: formatCurrency(stats.totalRevenue), 
      icon: MoneyIcon, 
      color: '#ed6c02',
      trend: 'up',
      trendValue: '+15%',
      subtitle: `Trung bình ${formatCurrency(stats.avgTicketValue)}/vé`
    },
    { 
      title: 'Chuyến bay', 
      value: stats.totalFlights, 
      icon: FlightIcon, 
      color: '#0288d1',
      trend: 'up',
      trendValue: '+5%',
      subtitle: 'Đang hoạt động'
    },
    { 
      title: 'Người dùng', 
      value: stats.totalUsers, 
      icon: PeopleIcon, 
      color: '#7b1fa2',
      trend: 'up',
      trendValue: '+20%',
      subtitle: 'Đã đăng ký'
    },
    { 
      title: 'Chờ thanh toán', 
      value: stats.pendingTickets, 
      icon: ScheduleIcon, 
      color: '#d32f2f',
      trend: 'down',
      trendValue: '-3%',
      subtitle: 'Cần xử lý'
    },
  ];

  const pieData = [
    { name: 'Đã thanh toán', value: stats.totalPaidTickets, color: '#2e7d32' },
    { name: 'Chờ thanh toán', value: stats.pendingTickets, color: '#ed6c02' },
    { name: 'Đã hoàn tiền', value: stats.refundedTickets, color: '#0288d1' },
    { name: 'Thất bại', value: stats.failedTickets, color: '#d32f2f' },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            📊 Dashboard Tổng Quan
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Cập nhật lần cuối: {lastRefresh.toLocaleString('vi-VN')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Làm mới dữ liệu">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => window.open('/flights', '_blank')}
          >
            Xem báo cáo chi tiết
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={4} key={index}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              trend={stat.trend}
              trendValue={stat.trendValue}
              subtitle={stat.subtitle}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  📈 Xu hướng doanh thu & đặt vé
                </Typography>
                <Chip 
                  icon={<TrendingUpIcon />} 
                  label="7 ngày gần nhất" 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                />
              </Box>
              <Box sx={{ height: 400, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ed6c02" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ed6c02" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#666' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#666' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: '#666' }}
                    />
                    <RechartsTooltip 
                      formatter={(value, name) => [
                        name === 'tickets' ? value : formatCurrency(value),
                        name === 'tickets' ? 'Số vé' : 'Doanh thu'
                      ]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="tickets"
                      stroke="#1976d2"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTickets)"
                      name="Số vé"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#ed6c02"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Doanh thu"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                🥧 Phân bố trạng thái vé
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [value, 'vé']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity & Admin Tools */}
      <Grid container spacing={3}>
        {/* Recent Tickets */}
        <Grid item xs={12} lg={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  🎫 Vé gần đây
                </Typography>
                <Badge badgeContent={recentTickets.length} color="primary">
                  <TicketIcon />
                </Badge>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Mã vé</strong></TableCell>
                      <TableCell><strong>Hành khách</strong></TableCell>
                      <TableCell><strong>Trạng thái</strong></TableCell>
                      <TableCell><strong>Thời gian</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTickets.map((ticket) => (
                      <TableRow key={ticket._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {ticket.ticketCode}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {ticket.passengerName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(ticket.paymentStatus)}
                            color={getStatusColor(ticket.paymentStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(ticket.createdAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Flights */}
        <Grid item xs={12} lg={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  ✈️ Chuyến bay gần đây
                </Typography>
                <Badge badgeContent={recentFlights.length} color="primary">
                  <FlightIcon />
                </Badge>
              </Box>
              <List>
                {recentFlights.map((flight, index) => (
                  <React.Fragment key={flight._id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <FlightIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={flight.flightCode}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {flight.route}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(flight.departureTime)}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={`${flight.availableSeats}/${flight.totalSeats} ghế`}
                        size="small"
                        color={flight.availableSeats > 10 ? 'success' : 'warning'}
                      />
                    </ListItem>
                    {index < recentFlights.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Tools */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                🛠️ Tiện ích quản trị
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FlightIcon />}
                    onClick={() => window.open('/flights', '_blank')}
                    sx={{ height: 60 }}
                  >
                    Quản lý chuyến bay
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<TicketIcon />}
                    onClick={() => window.open('/tickets', '_blank')}
                    sx={{ height: 60 }}
                  >
                    Quản lý vé
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PeopleIcon />}
                    onClick={() => window.open('/users', '_blank')}
                    sx={{ height: 60 }}
                  >
                    Quản lý người dùng
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SecurityIcon />}
                    onClick={() => window.open('/qr-scanner', '_blank')}
                    sx={{ height: 60 }}
                  >
                    QR Scanner
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
