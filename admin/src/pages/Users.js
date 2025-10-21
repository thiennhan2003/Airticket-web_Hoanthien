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
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  MenuItem,
} from '@mui/material';
import {
  People as PeopleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'user',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.USERS.LIST);
        console.log('Users response:', response.data);
        setUsers(response.data.data?.users || response.data.data || []);
        setError('');
      } catch (err) {
        setError('Không thể tải danh sách người dùng');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Mở dialog chỉnh sửa
  const handleOpenEdit = (user) => {
    setEditMode(true);
    setCurrentUser({
      ...user,
    });
    setOpenDialog(true);
  };

  // Đóng dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
    setSuccess('');
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Lưu người dùng (chỉ sửa)
  const handleSave = async () => {
    try {
      // Validate dữ liệu
      if (!currentUser.fullName || !currentUser.email || !currentUser.phoneNumber) {
        setError('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      // Chuẩn bị dữ liệu (không gửi password khi edit)
      const userData = {
        fullName: currentUser.fullName.trim(),
        email: currentUser.email.trim(),
        phoneNumber: currentUser.phoneNumber.trim(),
        role: currentUser.role,
      };

      console.log('Sending user data:', userData);

      // Chỉ cập nhật (không có thêm mới)
      await axios.put(
        API_ENDPOINTS.USERS.DETAIL(currentUser._id),
        userData
      );
      setSuccess('Cập nhật người dùng thành công!');

      // Refresh danh sách
      const response = await axios.get(API_ENDPOINTS.USERS.LIST);
      setUsers(response.data.data?.users || response.data.data || []);

      setTimeout(() => {
        handleCloseDialog();
        setSuccess('');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
      setError(errorMsg);
      console.error('Error saving user:', err.response?.data || err);
    }
  };

  // Xóa người dùng
  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      try {
        await axios.delete(
          API_ENDPOINTS.USERS.DETAIL(id)
        );
        setSuccess('Xóa người dùng thành công!');
        // Refresh danh sách
        const response = await axios.get(API_ENDPOINTS.USERS.LIST);
        setUsers(response.data.data?.users || response.data.data || []);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể xóa người dùng');
        console.error('Error deleting user:', err);
      }
    }
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

  // Lấy chữ cái đầu tiên để hiển thị avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="flex-start" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Quản lý người dùng
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Avatar</strong></TableCell>
              <TableCell><strong>Tên</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>SĐT</strong></TableCell>
              <TableCell><strong>Vai trò</strong></TableCell>
              <TableCell><strong>Ngày đăng ký</strong></TableCell>
              <TableCell><strong>Trạng thái</strong></TableCell>
              <TableCell align="center"><strong>Thao tác</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Chưa có người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getInitials(user.fullName || user.name)}
                    </Avatar>
                  </TableCell>
                  <TableCell>{user.fullName || user.name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? 'Quản trị' : 'Người dùng'}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label="Đang hoạt động"
                      color="success"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleOpenEdit(user)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(user._id)}
                      disabled={user.role === 'admin'}
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

      <Box mt={2}>
        <Typography variant="body2" color="textSecondary">
          Tổng số người dùng: <strong>{users.length}</strong>
        </Typography>
      </Box>

      {/* Dialog chỉnh sửa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Chỉnh sửa người dùng
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
              label="Họ và tên"
              name="fullName"
              value={currentUser.fullName}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={currentUser.email}
                onChange={handleInputChange}
                required
              />
              <TextField
                label="Số điện thoại"
                name="phoneNumber"
                value={currentUser.phoneNumber}
                onChange={handleInputChange}
                required
              />
            </Box>
            <TextField
              label="Vai trò"
              name="role"
              select
              value={currentUser.role}
              onChange={handleInputChange}
              required
            >
              <MenuItem value="user">Người dùng</MenuItem>
              <MenuItem value="admin">Quản trị</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          <Button onClick={handleSave} variant="contained">
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
