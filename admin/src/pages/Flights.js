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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flight as FlightIcon,
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


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <FlightIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Quản lý chuyến bay
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Thêm chuyến bay
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Mã chuyến bay</strong></TableCell>
              <TableCell><strong>Tuyến đường</strong></TableCell>
              <TableCell><strong>Khởi hành</strong></TableCell>
              <TableCell><strong>Đến</strong></TableCell>
              <TableCell><strong>Số ghế (còn/tổng)</strong></TableCell>
              <TableCell><strong>Giá hạng nhất</strong></TableCell>
              <TableCell><strong>Giá thương gia</strong></TableCell>
              <TableCell><strong>Giá phổ thông</strong></TableCell>
              <TableCell><strong>Trạng thái</strong></TableCell>
              <TableCell><strong>Hành động</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  Chưa có chuyến bay nào
                </TableCell>
              </TableRow>
            ) : (
              flights.map((flight) => (
                <TableRow key={flight._id} hover>
                  <TableCell>{flight.flightCode}</TableCell>
                  <TableCell>{flight.route}</TableCell>
                  <TableCell>{formatDateTime(flight.departureTime)}</TableCell>
                  <TableCell>{formatDateTime(flight.arrivalTime)}</TableCell>
                  <TableCell>{flight.availableSeats || 0}/{flight.totalSeats || 0} ghế</TableCell>
                  <TableCell>{flight.firstClassPrice?.toLocaleString('vi-VN')} VNĐ</TableCell>
                  <TableCell>{flight.businessPrice?.toLocaleString('vi-VN')} VNĐ</TableCell>
                  <TableCell>{flight.economyPrice?.toLocaleString('vi-VN')} VNĐ</TableCell>
                  <TableCell>
                    <Chip
                      label={getFlightStatus(flight.departureTime)}
                      color={getStatusColor(getFlightStatus(flight.departureTime))}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleOpenEdit(flight)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(flight._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm/sửa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Chỉnh sửa chuyến bay' : 'Thêm chuyến bay mới'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
            <TextField
              label="Mã chuyến bay"
              name="flightCode"
              value={currentFlight.flightCode}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="VD: VN123"
            />
            <TextField
              label="Tuyến đường"
              name="route"
              value={currentFlight.route}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="VD: Hà Nội - Hồ Chí Minh"
            />

            {/* Chỉ hiển thị trường tổng số ghế khi thêm mới */}
            {!editMode && (
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
              />
            )}

            {/* Hiển thị thời gian hiện tại (chỉ đọc) - chỉ hiển thị khi chỉnh sửa */}
            {editMode && currentFlight.departureTimeDisplay && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Thời gian khởi hành hiện tại"
                  value={currentFlight.departureTimeDisplay}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Thời gian đến hiện tại"
                  value={currentFlight.arrivalTimeDisplay}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  variant="outlined"
                />
              </Box>
            )}

            {/* Chỉnh sửa thời gian mới */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Thời gian khởi hành mới"
                name="departureTime"
                type="datetime-local"
                value={currentFlight.departureTime}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Để trống nếu không muốn thay đổi"
              />
              <TextField
                label="Thời gian đến mới"
                name="arrivalTime"
                type="datetime-local"
                value={currentFlight.arrivalTime}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                helperText="Để trống nếu không muốn thay đổi"
              />
            </Box>

            {/* Hiển thị lý do delay hiện tại (nếu có) - chỉ hiển thị khi chỉnh sửa */}
            {editMode && currentFlight.delayReason && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <strong>Lý do delay hiện tại:</strong> "{currentFlight.delayReason}"
              </Alert>
            )}

            {/* Chỉ hiển thị trường lý do delay khi chỉnh sửa */}
            {editMode && (
              <TextField
                label="Lý do thay đổi lịch bay"
                name="delayReason"
                value={currentFlight.delayReason || ''}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                placeholder="Nhập lý do delay/thay đổi lịch bay (VD: Bảo trì kỹ thuật, thời tiết xấu, v.v.)"
                helperText="Để trống nếu không có lý do đặc biệt"
              />
            )}

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
            />
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
            />
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          <Button onClick={handleSave} variant="contained">
            {editMode ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Flights;
