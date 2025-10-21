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
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

const TicketsManage = () => {
  const [tickets, setTickets] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search and filter state
  const [searchFlightCode, setSearchFlightCode] = useState('');

  // Lấy danh sách vé
  const fetchTickets = async () => {
    try {
      setLoading(true);

      // Chuẩn bị query parameters cho pagination và tìm kiếm
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      // Thêm tìm kiếm theo flightCode nếu có
      if (searchFlightCode.trim()) {
        params.append('flightCode', searchFlightCode.trim());
      }

      const response = await axios.get(`${API_ENDPOINTS.TICKETS.LIST}?${params}`);
      console.log('Tickets response:', response.data);

      const ticketsData = response.data.data?.tickets || response.data.data || [];
      const paginationData = response.data.data?.pagination || response.data.pagination || {};

      setTickets(ticketsData);
      setTotalItems(paginationData.totalRecord || 0);
      setTotalPages(Math.ceil((paginationData.totalRecord || 0) / itemsPerPage));
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách vé');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách chuyến bay
  const fetchFlights = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.FLIGHTS.LIST);
      const flightsList = response.data.data?.flights || response.data.data || [];
      setFlights(flightsList);
    } catch (err) {
      console.error('Error fetching flights:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchFlights();
  }, [currentPage, itemsPerPage, searchFlightCode]);

  // Xử lý thay đổi trang
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Xử lý thay đổi số items per page
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset về trang đầu khi thay đổi số items
  };

  // Xử lý tìm kiếm
  const handleSearch = () => {
    setCurrentPage(1); // Reset về trang đầu khi tìm kiếm
    fetchTickets();
  };

  // Xử lý reset tìm kiếm
  const handleResetSearch = () => {
    setSearchFlightCode('');
    setCurrentPage(1);
    fetchTickets();
  };

  // Xóa vé
  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa vé này? Số chỗ sẽ được hoàn trả.')) {
      try {
        await axios.delete(
          API_ENDPOINTS.TICKETS.DETAIL(id)
        );
        setSuccess('Xóa vé thành công!');
        fetchTickets();
        fetchFlights(); // Refresh để cập nhật số chỗ
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể xóa vé');
        console.error('Error deleting ticket:', err);
      }
    }
  };

  // Format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  // Format ngày giờ
  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Tính thời gian còn lại đến hạn thanh toán
  const getTimeUntilDeadline = (paymentDeadline) => {
    if (!paymentDeadline) return null;

    const deadline = new Date(paymentDeadline);
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();

    if (timeLeft <= 0) return null;

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, total: timeLeft };
  };

  // Component đếm ngược thời gian
  const CountdownTimer = ({ paymentDeadline, paymentStatus }) => {
    const [timeLeft, setTimeLeft] = useState(getTimeUntilDeadline(paymentDeadline));

    useEffect(() => {
      if (paymentStatus !== 'pending' || !paymentDeadline) {
        setTimeLeft(null);
        return;
      }

      const timer = setInterval(() => {
        const newTimeLeft = getTimeUntilDeadline(paymentDeadline);
        setTimeLeft(newTimeLeft);

        // Dừng timer nếu hết thời gian
        if (!newTimeLeft) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [paymentDeadline, paymentStatus]);

    if (paymentStatus !== 'pending' || !timeLeft) {
      return null;
    }

    const { hours, minutes, seconds } = timeLeft;

    return (
      <Box sx={{ mt: 0.5 }}>
        <Typography variant="caption" color={hours < 2 ? 'error' : 'warning'}>
          Còn: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </Typography>
      </Box>
    );
  };

  // Tên trạng thái thanh toán tiếng Việt
  const getPaymentStatusLabel = (paymentStatus) => {
    const labels = {
      pending: 'Chờ thanh toán',
      paid: 'Đã thanh toán',
      refunded: 'Đã hoàn tiền',
      failed: 'Thanh toán thất bại',
    };
    return labels[paymentStatus] || paymentStatus;
  };

  // Màu trạng thái thanh toán
  const getPaymentStatusColor = (paymentStatus) => {
    const colors = {
      pending: 'warning',
      paid: 'success',
      refunded: 'info',
      failed: 'error',
    };
    return colors[paymentStatus] || 'default';
  };

  // Tên trạng thái vé tiếng Việt
  const getTicketStatusLabel = (status) => {
    const labels = {
      booked: 'Đã đặt',
      'checked-in': 'Đã check-in',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  // Màu trạng thái vé
  const getTicketStatusColor = (status) => {
    const colors = {
      booked: 'primary',
      'checked-in': 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  // Xác định loại vé dựa trên giá
  const getTicketType = (ticketPrice, flight, passengerCount = 1) => {
    if (!flight) return 'Không xác định';

    // flight ở đây đã được populate từ API, có đầy đủ thông tin
    const { firstClassPrice, businessPrice, economyPrice } = flight;

    // Tính giá vé đơn lẻ từ tổng giá và số lượng hành khách
    const singlePrice = ticketPrice / passengerCount;

    // So sánh với giá các hạng (với sai số nhỏ để tránh lỗi floating point)
    const priceDiff = 1000; // Sai số cho phép

    if (Math.abs(singlePrice - firstClassPrice) <= priceDiff) {
      return 'First Class';
    } else if (Math.abs(singlePrice - businessPrice) <= priceDiff) {
      return 'Business';
    } else if (Math.abs(singlePrice - economyPrice) <= priceDiff) {
      return 'Economy';
    }

    return 'Không xác định';
  };

  // Định dạng loại vé từ enum sang tiếng Anh
  const formatTicketClass = (ticketClass) => {
    const classMap = {
      economy: 'Economy',
      business: 'Business',
      first: 'First Class'
    };
    return classMap[ticketClass] || ticketClass;
  };

  // Hiển thị thông tin ghế kèm theo loại vé
  const getSeatInfoWithTypes = (ticket) => {
    if (!ticket.seatNumbers || ticket.seatNumbers.length === 0) {
      const ticketType = ticket.seatClasses && ticket.seatClasses[0] ?
        formatTicketClass(ticket.seatClasses[0]) :
        (ticket.ticketClass ? formatTicketClass(ticket.ticketClass) : 'Không xác định');
      return `${ticket.seatNumber} (${ticketType})`;
    }

    // Nhóm ghế theo loại vé từ seatClasses nếu có
    if (ticket.seatClasses && ticket.seatClasses.length > 0) {
      const seatGroups = {};

      ticket.seatNumbers.forEach((seat, index) => {
        const seatClass = ticket.seatClasses[index];
        const ticketType = seatClass ? formatTicketClass(seatClass) : 'Không xác định';

        if (!seatGroups[ticketType]) {
          seatGroups[ticketType] = [];
        }
        seatGroups[ticketType].push(seat);
      });

      // Tạo chuỗi hiển thị
      const displayParts = Object.entries(seatGroups).map(([type, seats]) => {
        return `${type}: ${seats.join(', ')}`;
      });

      return displayParts.join('; ');
    }

    // Fallback: sử dụng ticketClass chung nếu không có seatClasses
    const ticketType = ticket.ticketClass ? formatTicketClass(ticket.ticketClass) : 'Không xác định';
    return `${ticket.seatNumbers.join(', ')} (${ticketType})`;
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
      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <TicketIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Quản lý đơn vé
        </Typography>
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

      {/* Search and Filter Controls */}
      <Paper sx={{
        p: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 2
      }}>
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🔍 Bộ lọc và tìm kiếm
            </Typography>
            <TextField
              label="Tìm kiếm theo mã chuyến bay"
              variant="outlined"
              size="small"
              value={searchFlightCode}
              onChange={(e) => setSearchFlightCode(e.target.value)}
              sx={{
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.8)',
                },
              }}
              InputProps={{
                style: { color: 'white' }
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.5)',
                }
              }}
            >
              Tìm kiếm
            </Button>
            <Button
              variant="outlined"
              onClick={handleResetSearch}
              disabled={loading}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }
              }}
            >
              Reset
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Hiển thị:
            </Typography>
            <TextField
              select
              size="small"
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              sx={{
                minWidth: 80,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                  },
                },
                '& .MuiSelect-select': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </TextField>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              mục mỗi trang
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Pagination Info */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        p: 2,
        backgroundColor: '#f8f9fa',
        borderRadius: 1,
        border: '1px solid #e9ecef'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#495057' }}>
          📊 Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} kết quả
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#6c757d' }}>
          📄 Trang {currentPage} của {totalPages}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Mã vé</strong></TableCell>
              <TableCell><strong>Hành khách</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>SĐT</strong></TableCell>
              <TableCell><strong>Số ghế & Loại vé</strong></TableCell>
              <TableCell><strong>Tổng ghế đã đặt</strong></TableCell>
              <TableCell><strong>Giá</strong></TableCell>
              <TableCell><strong>Ngày đặt</strong></TableCell>
              <TableCell><strong>Hạn thanh toán</strong></TableCell>
              <TableCell><strong>Thanh toán</strong></TableCell>
              <TableCell><strong>Trạng thái</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {searchFlightCode ? `Không tìm thấy vé nào với mã chuyến bay: ${searchFlightCode}` : 'Chưa có vé nào'}
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket._id} hover>
                  <TableCell>{ticket.ticketCode}</TableCell>
                  <TableCell>{ticket.passengerName}</TableCell>
                  <TableCell>{ticket.email}</TableCell>
                  <TableCell>{ticket.phoneNumber}</TableCell>
                  <TableCell>{getSeatInfoWithTypes(ticket)}</TableCell>
                  <TableCell>{ticket.passengerCount || 1}</TableCell>
                  <TableCell>{formatPrice(ticket.price)}</TableCell>
                  <TableCell>{formatDateTime(ticket.bookingDate)}</TableCell>
                  <TableCell>{formatDateTime(ticket.paymentDeadline)}</TableCell>
                  <TableCell>
                    <Box>
                      <Chip
                        label={getPaymentStatusLabel(ticket.paymentStatus)}
                        color={getPaymentStatusColor(ticket.paymentStatus)}
                        size="small"
                      />
                      <CountdownTimer
                        paymentDeadline={ticket.paymentDeadline}
                        paymentStatus={ticket.paymentStatus}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getTicketStatusLabel(ticket.status)}
                      color={getTicketStatusColor(ticket.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(ticket._id)}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 4,
          mb: 2,
          gap: 1,
          flexWrap: 'wrap',
          p: 2,
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          border: '1px solid #e9ecef'
        }}>
          <Button
            variant="outlined"
            disabled={currentPage === 1 || loading}
            onClick={() => handlePageChange(1)}
            sx={{
              borderColor: '#007bff',
              color: '#007bff',
              '&:hover': {
                backgroundColor: '#007bff',
                color: 'white',
                borderColor: '#007bff',
              },
              '&:disabled': {
                borderColor: '#6c757d',
                color: '#6c757d',
              }
            }}
          >
            ⏮ Trang đầu
          </Button>
          <Button
            variant="outlined"
            disabled={currentPage === 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            sx={{
              borderColor: '#007bff',
              color: '#007bff',
              '&:hover': {
                backgroundColor: '#007bff',
                color: 'white',
                borderColor: '#007bff',
              },
              '&:disabled': {
                borderColor: '#6c757d',
                color: '#6c757d',
              }
            }}
          >
            ◀ Trang trước
          </Button>

          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber;

            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }

            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "contained" : "outlined"}
                disabled={loading}
                onClick={() => handlePageChange(pageNumber)}
                sx={{
                  minWidth: 45,
                  ...(currentPage === pageNumber ? {
                    backgroundColor: '#007bff',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#0056b3',
                    }
                  } : {
                    borderColor: '#007bff',
                    color: '#007bff',
                    '&:hover': {
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderColor: '#007bff',
                    }
                  }),
                  '&:disabled': {
                    borderColor: '#6c757d',
                    color: '#6c757d',
                  }
                }}
              >
                {pageNumber}
              </Button>
            );
          })}

          <Button
            variant="outlined"
            disabled={currentPage === totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            sx={{
              borderColor: '#007bff',
              color: '#007bff',
              '&:hover': {
                backgroundColor: '#007bff',
                color: 'white',
                borderColor: '#007bff',
              },
              '&:disabled': {
                borderColor: '#6c757d',
                color: '#6c757d',
              }
            }}
          >
            Trang sau ▶
          </Button>
          <Button
            variant="outlined"
            disabled={currentPage === totalPages || loading}
            onClick={() => handlePageChange(totalPages)}
            sx={{
              borderColor: '#007bff',
              color: '#007bff',
              '&:hover': {
                backgroundColor: '#007bff',
                color: 'white',
                borderColor: '#007bff',
              },
              '&:disabled': {
                borderColor: '#6c757d',
                color: '#6c757d',
              }
            }}
          >
            Trang cuối ⏭
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TicketsManage;
