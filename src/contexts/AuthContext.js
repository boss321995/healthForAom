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
  const [token, setToken] = useState(safariLocalStorage.getItem('healthToken'));

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
          // Check if it's a mock token
          if (token.startsWith('mock-jwt-token-')) {
            const mockUser = JSON.parse(safariLocalStorage.getItem('healthUser'));
            if (mockUser) {
              setUser(mockUser);
            } else {
              logout();
            }
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
      
      // Fallback to mock login for development/demo
      console.log('Using mock authentication for demo purposes');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!username || !password) {
          return { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
        }
        
        if (password.length < 6) {
          return { success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
        }

        const mockToken = 'mock-jwt-token-' + Date.now();
        const mockUser = {
          id: Math.floor(Math.random() * 1000),
          username: username,
          email: username + '@example.com',
          name: username,
          avatar: null,
          createdAt: new Date().toISOString()
        };
        
        setToken(mockToken);
        setUser(mockUser);
        safariLocalStorage.setItem('healthToken', mockToken);
        safariLocalStorage.setItem('healthUser', JSON.stringify(mockUser));
        
        const demoMessage = isSafari() ? 
          'เข้าสู่ระบบสำเร็จ (Safari Demo Mode)' : 
          'เข้าสู่ระบบสำเร็จ (Demo Mode)';
        
        return { success: true, message: demoMessage };
      } catch (mockError) {
        console.error('Mock login also failed:', mockError);
        return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' };
      }
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
      
      // Fallback to mock registration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!username || !email || !password) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
      }
      
      if (password.length < 6) {
        throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
      }

      const mockToken = 'mock-jwt-token-' + Date.now();
      const mockUser = {
        id: Math.floor(Math.random() * 1000),
        username: username,
        email: email,
        name: profileData?.full_name || username,
        avatar: null,
        createdAt: new Date().toISOString()
      };
      
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('healthToken', mockToken);
      localStorage.setItem('healthUser', JSON.stringify(mockUser));
      
      // Save profile data to localStorage for mock
      if (profileData) {
        localStorage.setItem('healthProfile', JSON.stringify(profileData));
        console.log('📝 Mock profile data saved to localStorage');
      }
      
      return { success: true, message: 'สมัครสมาชิกสำเร็จ (Mock)' };
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
