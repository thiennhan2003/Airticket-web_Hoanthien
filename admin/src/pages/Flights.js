import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Avatar,
  Tooltip,
  Badge,
  Stack,
  Divider,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flight as FlightIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  LocalAirport as AirportIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeader } from '../config';

const Flights = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('departureTime');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [currentFlight, setCurrentFlight] = useState({
    flightCode: '',
    route: '',
    departureTime: '',
    arrivalTime: '',
    totalSeats: '',
    firstClassPrice: '',
    businessPrice: '',
    economyPrice: '',
  });

  // Lấy danh sách chuyến bay
  const fetchFlights = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.FLIGHTS.LIST, getAuthHeader());
      // Backend trả về { flights: [], pagination: {} }
      setFlights(response.data.data?.flights || response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching flights:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 500) {
          setError(data?.message || 'Lỗi server nội bộ khi tải danh sách');
        } else if (status === 401) {
          setError('Không có quyền truy cập');
        } else {
          setError(`Lỗi server (${status}): ${data?.message || 'Không xác định'}`);
        }
      } else if (err.request) {
        setError('Không thể kết nối đến server');
      } else {
        setError('Có lỗi xảy ra khi tải danh sách chuyến bay');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentFlight({
      flightCode: '',
      route: '',
      departureTime: '',
      arrivalTime: '',
      totalSeats: '',
      firstClassPrice: '',
      businessPrice: '',
      economyPrice: '',
      // Các trường hiển thị thời gian (ban đầu rỗng)
      departureTimeDisplay: '',
      arrivalTimeDisplay: '',
    });
    setOpenDialog(true);
  };

  // Mở dialog chỉnh sửa
  const handleOpenEdit = (flight) => {
    setEditMode(true);
    setCurrentFlight({
      ...flight,
      departureTime: new Date(flight.departureTime).toISOString().slice(0, 16),
      arrivalTime: new Date(flight.arrivalTime).toISOString().slice(0, 16),
      firstClassPrice: flight.firstClassPrice || '',
      businessPrice: flight.businessPrice || '',
      economyPrice: flight.economyPrice || '',
      delayReason: flight.delayReason || '', // Chỉ cần khi chỉnh sửa
      // Thêm thông tin hiển thị dễ đọc
      departureTimeDisplay: new Date(flight.departureTime).toLocaleString('vi-VN'),
      arrivalTimeDisplay: new Date(flight.arrivalTime).toLocaleString('vi-VN'),
    });
    setOpenDialog(true);
  };

  // Đóng dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
    // Reset state currentFlight khi đóng dialog
    setCurrentFlight({
      flightCode: '',
      route: '',
      departureTime: '',
      arrivalTime: '',
      totalSeats: '',
      firstClassPrice: '',
      businessPrice: '',
      economyPrice: '',
      delayReason: '', // Reset lý do delay
      // Reset các trường hiển thị thời gian
      departureTimeDisplay: '',
      arrivalTimeDisplay: '',
    });
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentFlight((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Lưu chuyến bay (thêm hoặc sửa)
  const handleSave = async () => {
    try {
      // Validate các trường bắt buộc không được để trống
      if (!currentFlight.flightCode || !currentFlight.route ||
          (!editMode && !currentFlight.totalSeats) || !currentFlight.firstClassPrice ||
          !currentFlight.businessPrice || !currentFlight.economyPrice) {
        setError('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      // Validate thời gian nếu có nhập (cho cả thêm mới và chỉnh sửa)
      if ((currentFlight.departureTime || currentFlight.arrivalTime) &&
          currentFlight.departureTime && currentFlight.arrivalTime) {
        const departureTime = new Date(currentFlight.departureTime);
        const arrivalTime = new Date(currentFlight.arrivalTime);

        if (departureTime >= arrivalTime) {
          setError('Thời gian đến phải sau thời gian khởi hành');
          return;
        }
      }

      // Nếu đang thêm mới và chưa nhập thời gian, báo lỗi
      if (!editMode && (!currentFlight.departureTime || !currentFlight.arrivalTime)) {
        setError('Vui lòng nhập thời gian khởi hành và đến cho chuyến bay mới');
        return;
      }

      // Validate số ghế phải là số dương (chỉ khi thêm mới)
      if (!editMode && (isNaN(currentFlight.totalSeats) || parseInt(currentFlight.totalSeats) <= 0)) {
        setError('Số ghế phải là số dương');
        return;
      }

      // Validate giá vé phải là số không âm
      if (currentFlight.firstClassPrice !== '' && (isNaN(currentFlight.firstClassPrice) || parseFloat(currentFlight.firstClassPrice) < 0)) {
        setError('Giá hạng nhất phải là số không âm');
        return;
      }

      if (currentFlight.businessPrice !== '' && (isNaN(currentFlight.businessPrice) || parseFloat(currentFlight.businessPrice) < 0)) {
        setError('Giá thương gia phải là số không âm');
        return;
      }

      if (currentFlight.economyPrice !== '' && (isNaN(currentFlight.economyPrice) || parseFloat(currentFlight.economyPrice) < 0)) {
        setError('Giá phổ thông phải là số không âm');
        return;
      }

      // Validate định dạng mã chuyến bay (ví dụ: VN123, VJ456, etc.)
      const flightCodePattern = /^[A-Z]{2}\d{3,}$/;
      if (!flightCodePattern.test(currentFlight.flightCode.trim())) {
        setError('Mã chuyến bay phải có định dạng: 2 chữ cái + số (VD: VN123, VJ456)');
        return;
      }

      // Chuẩn bị dữ liệu
      const flightData = {
        flightCode: currentFlight.flightCode.trim(),
        route: currentFlight.route.trim(),
        firstClassPrice: parseFloat(currentFlight.firstClassPrice) || 0,
        businessPrice: parseFloat(currentFlight.businessPrice) || 0,
        economyPrice: parseFloat(currentFlight.economyPrice) || 0,
      };

      // Chỉ thêm lý do delay khi đang chỉnh sửa và có nhập lý do
      if (editMode && currentFlight.delayReason && currentFlight.delayReason.trim()) {
        flightData.delayReason = currentFlight.delayReason.trim();
      }

      // Chỉ thêm thông tin ghế khi thêm mới
      if (!editMode) {
        flightData.totalSeats = Number(currentFlight.totalSeats);
        flightData.availableSeats = Number(currentFlight.totalSeats);
      }

      // Chỉ thêm thời gian nếu người dùng đã nhập
      if (currentFlight.departureTime) {
        flightData.departureTime = new Date(currentFlight.departureTime).toISOString();
      }
      if (currentFlight.arrivalTime) {
        flightData.arrivalTime = new Date(currentFlight.arrivalTime).toISOString();
      }

      // Log dữ liệu trước khi gửi để debug
      console.log('📊 Dữ liệu gửi lên server:', flightData);

      // Validate dữ liệu cuối cùng trước khi gửi
      if (isNaN(flightData.firstClassPrice) || isNaN(flightData.businessPrice) || isNaN(flightData.economyPrice)) {
        setError('Giá vé phải là số hợp lệ');
        return;
      }

      if (flightData.firstClassPrice < 0 || flightData.businessPrice < 0 || flightData.economyPrice < 0) {
        setError('Giá vé phải là số không âm');
        return;
      }

      if (editMode) {
        // Cập nhật
        await axios.put(
          API_ENDPOINTS.FLIGHTS.DETAIL(currentFlight._id),
          flightData,
          getAuthHeader()
        );
        setSuccess('Cập nhật chuyến bay thành công!');
      } else {
        // Thêm mới
        await axios.post(
          API_ENDPOINTS.FLIGHTS.LIST,
          flightData,
          getAuthHeader()
        );
        setSuccess('Thêm chuyến bay thành công!');
      }

      // Thông báo đặc biệt nếu có thay đổi thời gian và lý do delay
      if (editMode && (currentFlight.departureTime || currentFlight.arrivalTime)) {
        const reasonText = currentFlight.delayReason && currentFlight.delayReason.trim()
          ? ` với lý do: "${currentFlight.delayReason.trim()}"`
          : '';
        setSuccess(`Cập nhật chuyến bay thành công! Thông báo thay đổi lịch bay đã được gửi đến hành khách${reasonText}.`);
      }
      
      fetchFlights();
      setTimeout(() => {
        handleCloseDialog();
        setSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Error saving flight:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);

      // Xử lý lỗi chi tiết hơn
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 500) {
          if (data?.message) {
            setError(`Lỗi server: ${data.message}`);
          } else {
            setError('Lỗi server nội bộ. Vui lòng thử lại sau.');
          }
        } else if (status === 400) {
          setError(data?.message || 'Dữ liệu không hợp lệ');
        } else if (status === 401) {
          setError('Không có quyền truy cập');
        } else if (status === 404) {
          setError('API endpoint không tồn tại');
        } else {
          setError(`Lỗi server (${status}): ${data?.message || 'Không xác định'}`);
        }
      } else if (err.request) {
        setError('Không thể kết nối đến server. Vui lòng kiểm tra backend có chạy không.');
      } else {
        setError('Có lỗi xảy ra khi gửi yêu cầu');
      }
    }
  };

  // Xóa chuyến bay
  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa chuyến bay này?')) {
      try {
        await axios.delete(
          API_ENDPOINTS.FLIGHTS.DETAIL(id),
          getAuthHeader()
        );
        setSuccess('Xóa chuyến bay thành công!');
        fetchFlights();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting flight:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);

        // Xử lý lỗi chi tiết hơn
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;

          if (status === 500) {
            setError(data?.message || 'Lỗi server nội bộ khi xóa chuyến bay');
          } else if (status === 400) {
            setError(data?.message || 'Không thể xóa chuyến bay');
          } else if (status === 401) {
            setError('Không có quyền truy cập');
          } else if (status === 404) {
            setError('Chuyến bay không tồn tại');
          } else {
            setError(`Lỗi server (${status}): ${data?.message || 'Không xác định'}`);
          }
        } else if (err.request) {
          setError('Không thể kết nối đến server');
        } else {
          setError('Có lỗi xảy ra khi xóa chuyến bay');
        }
      }
    }
  };


  // Hàm kiểm tra trạng thái chuyến bay dựa trên thời gian khởi hành
  const getFlightStatus = (departureTime) => {
    const departureDate = new Date(departureTime);
    const now = new Date();
    return departureDate < now ? 'Đã khởi hành' : 'Chưa khởi hành';
  };

  // Hàm lấy màu sắc cho trạng thái
  const getStatusColor = (status) => {
    return status === 'Đã khởi hành' ? 'error' : 'success';
  };


  // Format ngày giờ
  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('vi-VN');
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  // Filter và sort flights
  const getFilteredFlights = () => {
    let filtered = flights.filter(flight => {
      const matchesSearch = flight.flightCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           flight.route.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && getFlightStatus(flight.departureTime) === 'Chưa khởi hành') ||
                           (statusFilter === 'departed' && getFlightStatus(flight.departureTime) === 'Đã khởi hành');
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'flightCode':
          aValue = a.flightCode;
          bValue = b.flightCode;
          break;
        case 'route':
          aValue = a.route;
          bValue = b.route;
          break;
        case 'departureTime':
          aValue = new Date(a.departureTime);
          bValue = new Date(b.departureTime);
          break;
        case 'price':
          aValue = a.economyPrice || 0;
          bValue = b.economyPrice || 0;
          break;
        default:
          aValue = new Date(a.departureTime);
          bValue = new Date(b.departureTime);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  // Get flight statistics
  const getFlightStats = () => {
    const total = flights.length;
    const active = flights.filter(f => getFlightStatus(f.departureTime) === 'Chưa khởi hành').length;
    const departed = flights.filter(f => getFlightStatus(f.departureTime) === 'Đã khởi hành').length;
    const totalSeats = flights.reduce((sum, f) => sum + (f.totalSeats || 0), 0);
    const availableSeats = flights.reduce((sum, f) => sum + (f.availableSeats || 0), 0);
    
    return { total, active, departed, totalSeats, availableSeats };
  };

  const stats = getFlightStats();
  const filteredFlights = getFilteredFlights();


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            ✈️ Quản lý chuyến bay
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Tổng cộng {stats.total} chuyến bay • {stats.active} chưa khởi hành • {stats.departed} đã khởi hành
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchFlights}
          >
            Làm mới
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ px: 3 }}
          >
            Thêm chuyến bay
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <FlightIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tổng chuyến bay
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Chưa khởi hành
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.departed}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Đã khởi hành
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Search */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo mã chuyến bay hoặc tuyến đường..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Trạng thái"
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="active">Chưa khởi hành</MenuItem>
                  <MenuItem value="departed">Đã khởi hành</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sắp xếp</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sắp xếp"
                >
                  <MenuItem value="departureTime">Thời gian khởi hành</MenuItem>
                  <MenuItem value="flightCode">Mã chuyến bay</MenuItem>
                  <MenuItem value="route">Tuyến đường</MenuItem>
                  <MenuItem value="price">Giá vé</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Thứ tự</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  label="Thứ tự"
                >
                  <MenuItem value="asc">Tăng dần</MenuItem>
                  <MenuItem value="desc">Giảm dần</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  startIcon={<VisibilityIcon />}
                >
                  Bảng
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('card')}
                  startIcon={<FlightIcon />}
                >
                  Thẻ
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><strong>Mã chuyến bay</strong></TableCell>
                <TableCell><strong>Tuyến đường</strong></TableCell>
                <TableCell><strong>Khởi hành</strong></TableCell>
                <TableCell><strong>Đến</strong></TableCell>
                <TableCell><strong>Số ghế</strong></TableCell>
                <TableCell><strong>Giá vé</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell align="center"><strong>Hành động</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Box textAlign="center">
                      <FlightIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="textSecondary">
                        Không tìm thấy chuyến bay nào
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlights.map((flight) => (
                  <TableRow key={flight._id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {flight.flightCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {flight.route}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(flight.departureTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(flight.arrivalTime)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" mr={1}>
                          {flight.availableSeats || 0}/{flight.totalSeats || 0}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={((flight.totalSeats - flight.availableSeats) / flight.totalSeats) * 100}
                          sx={{ width: 60, height: 4 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" fontWeight="medium">
                        {formatCurrency(flight.economyPrice || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getFlightStatus(flight.departureTime)}
                        color={getStatusColor(getFlightStatus(flight.departureTime))}
                        size="small"
                        icon={getFlightStatus(flight.departureTime) === 'Chưa khởi hành' ? <ScheduleIcon /> : <CheckCircleIcon />}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Chỉnh sửa">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenEdit(flight)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(flight._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={3}>
          {filteredFlights.length === 0 ? (
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <FlightIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    Không tìm thấy chuyến bay nào
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            filteredFlights.map((flight) => (
              <Grid item xs={12} sm={6} md={4} key={flight._id}>
                <Card elevation={2} sx={{ height: '100%', '&:hover': { elevation: 4 } }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {flight.flightCode}
                      </Typography>
                      <Chip
                        label={getFlightStatus(flight.departureTime)}
                        color={getStatusColor(getFlightStatus(flight.departureTime))}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body1" color="textSecondary" mb={2}>
                      {flight.route}
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        <ScheduleIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                        Khởi hành: {formatDateTime(flight.departureTime)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        <AirportIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                        Đến: {formatDateTime(flight.arrivalTime)}
                      </Typography>
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Ghế còn trống: {flight.availableSeats || 0}/{flight.totalSeats || 0}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={((flight.totalSeats - flight.availableSeats) / flight.totalSeats) * 100}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Giá vé:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Hạng nhất: ${formatCurrency(flight.firstClassPrice || 0)}`} size="small" />
                        <Chip label={`Thương gia: ${formatCurrency(flight.businessPrice || 0)}`} size="small" />
                        <Chip label={`Phổ thông: ${formatCurrency(flight.economyPrice || 0)}`} size="small" color="primary" />
                      </Stack>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenEdit(flight)}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(flight._id)}
                      >
                        Xóa
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Dialog thêm/sửa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <FlightIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {editMode ? 'Chỉnh sửa chuyến bay' : 'Thêm chuyến bay mới'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {editMode ? 'Cập nhật thông tin chuyến bay' : 'Tạo chuyến bay mới trong hệ thống'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {/* Thông tin cơ bản */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                📋 Thông tin cơ bản
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Mã chuyến bay"
                name="flightCode"
                value={currentFlight.flightCode}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="VD: VN123"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FlightIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Định dạng: 2 chữ cái + số (VD: VN123, VJ456)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Tuyến đường"
                name="route"
                value={currentFlight.route}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="VD: Hà Nội - Hồ Chí Minh"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AirportIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Chỉ hiển thị trường tổng số ghế khi thêm mới */}
            {!editMode && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Tổng số ghế"
                  name="totalSeats"
                  type="number"
                  value={currentFlight.totalSeats}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="VD: 180"
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Số ghế phải là số dương"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PeopleIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            {/* Thời gian */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mt: 2 }}>
                ⏰ Thời gian
              </Typography>
            </Grid>

            {/* Hiển thị thời gian hiện tại (chỉ đọc) - chỉ hiển thị khi chỉnh sửa */}
            {editMode && currentFlight.departureTimeDisplay && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Thời gian hiện tại:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Khởi hành:</strong> {currentFlight.departureTimeDisplay}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Đến:</strong> {currentFlight.arrivalTimeDisplay}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Chỉnh sửa thời gian mới */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Thời gian khởi hành mới"
                name="departureTime"
                type="datetime-local"
                value={currentFlight.departureTime}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Để trống nếu không muốn thay đổi"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScheduleIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Thời gian đến mới"
                name="arrivalTime"
                type="datetime-local"
                value={currentFlight.arrivalTime}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Để trống nếu không muốn thay đổi"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AirportIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Lý do delay - chỉ hiển thị khi chỉnh sửa */}
            {editMode && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mt: 2 }}>
                    📝 Lý do thay đổi
                  </Typography>
                </Grid>
                
                {currentFlight.delayReason && (
                  <Grid item xs={12}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Lý do delay hiện tại:
                      </Typography>
                      <Typography variant="body2">
                        "{currentFlight.delayReason}"
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    label="Lý do thay đổi lịch bay"
                    name="delayReason"
                    value={currentFlight.delayReason || ''}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Nhập lý do delay/thay đổi lịch bay (VD: Bảo trì kỹ thuật, thời tiết xấu, v.v.)"
                    helperText="Để trống nếu không có lý do đặc biệt"
                  />
                </Grid>
              </>
            )}

            {/* Giá vé */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ mt: 2 }}>
                💰 Giá vé
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Giá hạng nhất (VNĐ)"
                name="firstClassPrice"
                type="number"
                value={currentFlight.firstClassPrice}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="VD: 5000000"
                inputProps={{ min: 0, step: 1000 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Giá thương gia (VNĐ)"
                name="businessPrice"
                type="number"
                value={currentFlight.businessPrice}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="VD: 3000000"
                inputProps={{ min: 0, step: 1000 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Giá phổ thông (VNĐ)"
                name="economyPrice"
                type="number"
                value={currentFlight.economyPrice}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="VD: 1500000"
                inputProps={{ min: 0, step: 1000 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            Hủy
          </Button>
          <Button onClick={handleSave} variant="contained" size="large">
            {editMode ? 'Cập nhật chuyến bay' : 'Thêm chuyến bay'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Flights;
