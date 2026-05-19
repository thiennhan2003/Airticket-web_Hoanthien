const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    PROFILE: `${API_BASE_URL}/auth/get-profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/auth/update-profile`,
  },
  FLIGHTS: {
    LIST: `${API_BASE_URL}/flights`,
    DETAIL: (id) => `${API_BASE_URL}/flights/${id}`,
  },
  TICKETS: {
    LIST: `${API_BASE_URL}/tickets`,
    DETAIL: (id) => `${API_BASE_URL}/tickets/${id}`,
  },
  COUPONS: {
    LIST: `${API_BASE_URL}/coupons`,
    DETAIL: (id) => `${API_BASE_URL}/coupons/${id}`,
    CREATE: `${API_BASE_URL}/coupons`,
    UPDATE: (id) => `${API_BASE_URL}/coupons/${id}`,
    DELETE: (id) => `${API_BASE_URL}/coupons/${id}`,
    TOGGLE_STATUS: (id) => `${API_BASE_URL}/coupons/${id}/toggle-status`,
    VALIDATE: `${API_BASE_URL}/coupons/validate`,
    APPLY: `${API_BASE_URL}/coupons/apply`,
    STATISTICS: `${API_BASE_URL}/coupons/stats/summary`,
  },
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    DETAIL: (id) => `${API_BASE_URL}/users/${id}`,
  },
  DASHBOARD: {
    STATS: `${API_BASE_URL}/dashboard/stats`,
  },
};

export const getAuthHeader = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getAuthHeader,
};
