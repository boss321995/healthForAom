import axios from 'axios';

// Create axios instance with base configuration
// Prefer same-origin API in production; allow override via REACT_APP_API_URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000, // Increased timeout for Render cold starts
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // App stores token under 'healthToken' (AuthContext uses this key)
    const token = localStorage.getItem('healthToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid, remove stored tokens and redirect to login
      localStorage.removeItem('healthToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
