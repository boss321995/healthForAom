import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { 
  safariLocalStorage, 
  getSafariAxiosConfig, 
  handleSafariCorsError,
  getSafariErrorMessage,
  initSafariSupport,
  isSafari 
} from '../utils/safariSupport';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    const storedToken = safariLocalStorage.getItem('healthToken');
    if (storedToken && storedToken.startsWith('mock-jwt-token-')) {
      safariLocalStorage.removeItem('healthToken');
      safariLocalStorage.removeItem('healthUser');
      return null;
    }
    return storedToken;
  });

  // Initialize Safari support
  useEffect(() => {
    initSafariSupport();
  }, []);

  // Configure axios defaults
  useEffect(() => {
    if (token && !token.startsWith('mock-jwt-token-')) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          if (token.startsWith('mock-jwt-token-')) {
            logout();
          } else {
            // Real backend authentication check with Safari config
            const config = getSafariAxiosConfig();
            config.headers.Authorization = `Bearer ${token}`;
            const response = await axios.get('/api/profile', config);
            setUser(response.data);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          
          // Handle Safari-specific errors
          const safariError = getSafariErrorMessage(error);
          if (safariError) {
            console.warn('Safari-specific error:', safariError);
          }
          
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      // Try real backend first with Safari-compatible config
      const config = getSafariAxiosConfig();
      const response = await axios.post('/api/auth/login', {
        username,
        password
      }, config);

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      safariLocalStorage.setItem('healthToken', newToken);
      safariLocalStorage.removeItem('healthUser'); // Clear mock user data
      
      return { success: true, message: response.data.message || 'เข้าสู่ระบบสำเร็จ' };
    } catch (error) {
      console.error('Backend login failed:', error);
      
      // Check for Safari-specific CORS errors first
      const safariCorsError = handleSafariCorsError(error);
      if (safariCorsError) {
        return safariCorsError;
      }
      
      // Get Safari-specific error message
      const safariErrorMessage = getSafariErrorMessage(error);
      if (safariErrorMessage) {
        return { success: false, message: safariErrorMessage };
      }
      
      // Handle other specific errors
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        return { success: false, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' };
      }
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        return { success: false, message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้' };
      }

      if (error.response?.status === 401) {
        return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }

      if (error.response?.status === 500) {
        return { success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' };
      }
      return { success: false, message: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' };
    }
  };

  const register = async (username, email, password, profileData = null) => {
    try {
      console.log('🚀 Attempting backend registration with:', { username, email, profileData });
      
      // Try real backend first
  const response = await axios.post('/api/auth/register', {
        username,
        email,
        password,
        profile: profileData
      });

      console.log('✅ Backend response:', response.data);

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('healthToken', newToken);
      localStorage.removeItem('healthUser'); // Clear mock user data
      
      console.log('✅ Registration successful with profile data');
      
      return { success: true, message: response.data.message || 'สมัครสมาชิกสำเร็จ' };
    } catch (error) {
      console.error('❌ Backend registration failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response) {
        const status = error.response.status;
        const apiMessage = error.response.data?.error || error.response.data?.message;

        if (status === 400) {
          return { success: false, message: apiMessage || 'ข้อมูลไม่ถูกต้องหรือมีผู้ใช้งานแล้ว' };
        }

        if (status === 401) {
          return { success: false, message: apiMessage || 'ไม่ได้รับอนุญาต กรุณาลองเข้าสู่ระบบอีกครั้ง' };
        }

        if (status === 403) {
          return { success: false, message: apiMessage || 'สิทธิ์การเข้าถึงไม่ถูกต้อง กรุณาลองใหม่' };
        }

        if (status === 409) {
          return { success: false, message: apiMessage || 'ข้อมูลผู้ใช้งานซ้ำ กรุณาเปลี่ยนชื่อผู้ใช้หรืออีเมล' };
        }

        return { success: false, message: apiMessage || 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้' };
      }
      if (!username || !email || !password) {
        return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
      }

      if (password.length < 6) {
        return { success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
      }

      return { success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    safariLocalStorage.removeItem('healthToken');
    safariLocalStorage.removeItem('healthUser');
    delete axios.defaults.headers.common['Authorization'];
    
    // Additional Safari cleanup
    if (isSafari()) {
      console.log('🦁 Safari logout - clearing additional data');
      try {
        // Clear any Safari-specific cached data
        sessionStorage.clear();
      } catch (error) {
        console.warn('Safari session cleanup failed:', error);
      }
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
