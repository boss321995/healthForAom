import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
  const [token, setToken] = useState(localStorage.getItem('healthToken'));

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
            const mockUser = JSON.parse(localStorage.getItem('healthUser'));
            if (mockUser) {
              setUser(mockUser);
            } else {
              logout();
            }
          } else {
            // Real backend authentication check
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get('http://localhost:5000/api/profile', { headers });
            setUser(response.data);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      // Try real backend first
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('healthToken', newToken);
      localStorage.removeItem('healthUser'); // Clear mock user data
      
      return { success: true, message: response.data.message || 'เข้าสู่ระบบสำเร็จ' };
    } catch (error) {
      console.error('Backend login failed, using mock:', error);
      
      // Fallback to mock login
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!username || !password) {
        throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      }
      
      if (password.length < 6) {
        throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
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
      localStorage.setItem('healthToken', mockToken);
      localStorage.setItem('healthUser', JSON.stringify(mockUser));
      
      return { success: true, message: 'เข้าสู่ระบบสำเร็จ (Mock)' };
    }
  };

  const register = async (username, email, password, profileData = null) => {
    try {
      console.log('🚀 Attempting backend registration with:', { username, email, profileData });
      
      // Try real backend first
      const response = await axios.post('http://localhost:5000/api/auth/register', {
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
    localStorage.removeItem('healthToken');
    localStorage.removeItem('healthUser');
    delete axios.defaults.headers.common['Authorization'];
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
