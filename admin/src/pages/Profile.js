import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { API_ENDPOINTS, getAuthHeader } from '../config';
import axios from 'axios';

const Profile = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.AUTH.PROFILE, getAuthHeader());
      const userData = response.data.data || response.data;
      setProfile({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
      });
    } catch (error) {
      console.error('Lỗi khi tải thông tin hồ sơ:', error);
      setMessage({ type: 'error', text: 'Không thể tải thông tin hồ sơ' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setProfile(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      await axios.put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, profile, getAuthHeader());

      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
    } catch (error) {
      console.error('Lỗi khi cập nhật hồ sơ:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Không thể cập nhật hồ sơ'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hồ sơ cá nhân
      </Typography>

      <Card sx={{ maxWidth: 600, margin: '0 auto' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'primary.main',
                fontSize: '2rem',
                mr: 3
              }}
            >
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'A'}
            </Avatar>
            <Box>
              <Typography variant="h5">{profile.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Quản trị viên
              </Typography>
            </Box>
          </Box>

          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Họ và tên"
                  value={profile.fullName}
                  onChange={handleChange('fullName')}
                  variant="outlined"
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange('email')}
                  variant="outlined"
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  value={profile.phoneNumber}
                  onChange={handleChange('phoneNumber')}
                  variant="outlined"
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={fetchProfile}
                    disabled={saving}
                  >
                    Làm mới
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} /> : null}
                  >
                    {saving ? 'Đang lưu...' : 'Cập nhật'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
