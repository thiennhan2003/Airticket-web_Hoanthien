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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  LocalOffer as CouponIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS, getAuthHeader } from '../config';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 1,
    expiryDate: '',
    isActive: true,
    description: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.COUPONS.LIST, getAuthHeader());
      console.log('Coupons response:', response.data);
      setCoupons(response.data.data?.coupons || response.data.data || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách mã giảm giá');
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mở dialog tạo coupon
  const handleOpenCreate = () => {
    setEditMode(false);
    setCurrentCoupon({
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderValue: 0,
      maxDiscount: 0,
      usageLimit: 1,
      expiryDate: '',
      isActive: true,
      description: '',
    });
    setOpenDialog(true);
  };

  // Mở dialog chỉnh sửa
  const handleOpenEdit = (coupon) => {
    setEditMode(true);
    setCurrentCoupon({
      ...coupon,
      expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0],
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
    setCurrentCoupon((prev) => ({
      ...prev,
      [name]: name === 'discountValue' || name === 'minOrderValue' || name === 'maxDiscount' || name === 'usageLimit'
        ? Number(value)
        : value,
    }));
  };

  // Tạo coupon mới
  const handleCreate = async () => {
    try {
      // Validate dữ liệu
      if (!currentCoupon.code || !currentCoupon.discountValue || !currentCoupon.expiryDate) {
        setError('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      if (currentCoupon.discountType === 'percentage' && currentCoupon.discountValue > 100) {
        setError('Giảm giá theo phần trăm không được vượt quá 100%');
        return;
      }

      const couponData = {
        ...currentCoupon,
        code: currentCoupon.code.toUpperCase(),
      };

      await axios.post(API_ENDPOINTS.COUPONS.CREATE, couponData, getAuthHeader());
      setSuccess('Tạo mã giảm giá thành công!');
      setTimeout(() => {
        setSuccess('');
        handleCloseDialog();
        fetchCoupons();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo mã giảm giá');
      console.error('Error creating coupon:', err);
    }
  };

  // Cập nhật coupon
  const handleUpdate = async () => {
    try {
      // Validate dữ liệu
      if (!currentCoupon.code || !currentCoupon.discountValue || !currentCoupon.expiryDate) {
        setError('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      if (currentCoupon.discountType === 'percentage' && currentCoupon.discountValue > 100) {
        setError('Giảm giá theo phần trăm không được vượt quá 100%');
        return;
      }

      const couponData = {
        ...currentCoupon,
        code: currentCoupon.code.toUpperCase(),
      };

      await axios.put(API_ENDPOINTS.COUPONS.UPDATE(currentCoupon._id), couponData, getAuthHeader());
      setSuccess('Cập nhật mã giảm giá thành công!');
      setTimeout(() => {
        setSuccess('');
        handleCloseDialog();
        fetchCoupons();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật mã giảm giá');
      console.error('Error updating coupon:', err);
    }
  };

  // Xóa coupon
  const handleDelete = async (couponId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) {
      try {
        await axios.delete(API_ENDPOINTS.COUPONS.DELETE(couponId), getAuthHeader());
        setSuccess('Xóa mã giảm giá thành công!');
        setTimeout(() => {
          setSuccess('');
          fetchCoupons();
        }, 2000);
      } catch (err) {
        setError('Không thể xóa mã giảm giá');
        console.error('Error deleting coupon:', err);
      }
    }
  };

  // Toggle trạng thái active
  const handleToggleStatus = async (couponId) => {
    try {
      await axios.patch(API_ENDPOINTS.COUPONS.TOGGLE_STATUS(couponId), {}, getAuthHeader());
      fetchCoupons();
    } catch (err) {
      setError('Không thể thay đổi trạng thái mã giảm giá');
      console.error('Error toggling coupon status:', err);
    }
  };

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format ngày
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Đang tải danh sách mã giảm giá...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <CouponIcon sx={{ mr: 1, color: '#ff6b35' }} />
          <Typography variant="h4" component="h1">
            Quản lý mã giảm giá
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: '#ff6b35', '&:hover': { backgroundColor: '#e55a2b' } }}
        >
          Tạo mã giảm giá
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Thống kê */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tổng số coupon
              </Typography>
              <Typography variant="h4">
                {coupons.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Đang hoạt động
            </Typography>
              <Typography variant="h4">
                {coupons.filter(c => c.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Đã hết hạn
            </Typography>
              <Typography variant="h4">
                {coupons.filter(c => new Date(c.expiryDate) < new Date()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tổng lượt sử dụng
            </Typography>
              <Typography variant="h4">
                {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bảng danh sách coupon */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Mã</strong></TableCell>
                <TableCell><strong>Loại</strong></TableCell>
                <TableCell><strong>Giá trị</strong></TableCell>
                <TableCell><strong>Điều kiện</strong></TableCell>
                <TableCell><strong>Giới hạn</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell><strong>Thao tác</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon._id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body1" sx={{ fontWeight: 'bold', mr: 1 }}>
                        {coupon.code}
                      </Typography>
                      {coupon.description && (
                        <Typography variant="caption" color="textSecondary">
                          {coupon.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={coupon.discountType === 'percentage' ? <PercentIcon /> : <MoneyIcon />}
                      label={coupon.discountType === 'percentage' ? 'Phần trăm' : 'Cố định'}
                      color={coupon.discountType === 'percentage' ? 'primary' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}%`
                        : formatCurrency(coupon.discountValue)
                      }
                    </Typography>
                    {coupon.discountType === 'percentage' && coupon.maxDiscount && (
                      <Typography variant="caption" color="textSecondary">
                        Tối đa: {formatCurrency(coupon.maxDiscount)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      Đơn tối thiểu: {formatCurrency(coupon.minOrderValue)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      HSD: {formatDate(coupon.expiryDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {coupon.usedCount}/{coupon.usageLimit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={coupon.isActive}
                            onChange={() => handleToggleStatus(coupon._id)}
                            color="primary"
                          />
                        }
                        label=""
                      />
                      <Chip
                        label={coupon.isActive ? 'Hoạt động' : 'Tạm dừng'}
                        color={coupon.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEdit(coupon)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(coupon._id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Chưa có mã giảm giá nào
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog tạo/chỉnh sửa coupon */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mã giảm giá"
                name="code"
                value={currentCoupon.code}
                onChange={handleInputChange}
                placeholder="WELCOME10"
                helperText="Chỉ chứa chữ cái in hoa và số"
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Loại giảm giá"
                name="discountType"
                value={currentCoupon.discountType}
                onChange={handleInputChange}
              >
                <MenuItem value="percentage">Phần trăm (%)</MenuItem>
                <MenuItem value="fixed">Cố định (VNĐ)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Giá trị giảm giá"
                name="discountValue"
                value={currentCoupon.discountValue}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: currentCoupon.discountType === 'percentage' ? '%' : 'VNĐ',
                }}
              />
            </Grid>
            {currentCoupon.discountType === 'percentage' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Giảm tối đa"
                  name="maxDiscount"
                  value={currentCoupon.maxDiscount}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Tối đa</InputAdornment>,
                  }}
                  helperText="Số tiền giảm tối đa cho loại phần trăm"
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Đơn hàng tối thiểu"
                name="minOrderValue"
                value={currentCoupon.minOrderValue}
                onChange={handleInputChange}
                helperText="Giá trị đơn hàng tối thiểu để áp dụng"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Giới hạn sử dụng"
                name="usageLimit"
                value={currentCoupon.usageLimit}
                onChange={handleInputChange}
                helperText="Số lượt có thể sử dụng mã này"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Ngày hết hạn"
                name="expiryDate"
                value={currentCoupon.expiryDate}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mô tả"
                name="description"
                value={currentCoupon.description}
                onChange={handleInputChange}
                placeholder="Mô tả về mã giảm giá này..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          <Button
            variant="contained"
            onClick={editMode ? handleUpdate : handleCreate}
            sx={{ backgroundColor: '#ff6b35', '&:hover': { backgroundColor: '#e55a2b' } }}
          >
            {editMode ? 'Cập nhật' : 'Tạo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Coupons;
