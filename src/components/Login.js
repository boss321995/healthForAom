import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSafari } from '../utils/safariSupport';
import '../styles/safari.css';

const Login = ({ onSwitchToRegister, onBackToLanding }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSafariBrowser, setIsSafariBrowser] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    setIsSafariBrowser(isSafari());
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.username, formData.password);
      
      if (!result.success) {
        // แสดงข้อความ error ที่เหมาะสมตามประเภทของปัญหา
        let errorMessage = result.message;
        
        // ตรวจสอบและปรับข้อความให้เข้าใจง่าย
        if (result.message.includes('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') || 
            result.message.includes('Invalid credentials') ||
            result.message.includes('401')) {
          errorMessage = '❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
        } else if (result.message.includes('เซิร์ฟเวอร์') || 
                   result.message.includes('server') ||
                   result.message.includes('500')) {
          errorMessage = '🔧 เซิร์ฟเวอร์มีปัญหาขณะนี้ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
        } else if (result.message.includes('เชื่อมต่อ') || 
                   result.message.includes('network') ||
                   result.message.includes('connection')) {
          errorMessage = '📡 ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        } else if (result.message.includes('Safari')) {
          errorMessage = result.message; // ใช้ข้อความ Safari-specific ที่มีอยู่แล้ว
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('🚨 เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-purple-50 ${isSafariBrowser ? 'safari-flex-fix safari-gradient-fix' : ''}`}>
      <div className="max-w-md w-full space-y-8 p-8">
        <div className={`bg-white/95 backdrop-blur-lg rounded-lg p-8 border-2 border-blue-300 shadow-xl ${isSafariBrowser ? 'safari-transform-fix' : ''}`}>
          <div className="text-center">
            <h2 className={`text-3xl font-bold text-blue-800 mb-2 ${isSafariBrowser ? 'safari-text-fix' : ''}`}>
              เข้าสู่ระบบ
            </h2>
            <p className={`text-blue-700 mb-8 font-semibold ${isSafariBrowser ? 'safari-text-fix' : ''}`}>
              ระบบจัดการสุขภาพส่วนบุคคล
              {isSafariBrowser && (
                <span className="block text-sm text-orange-600 mt-1">
                  🦁 Safari Browser Detected
                </span>
              )}
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">
                      {error.includes('❌') ? '❌' : 
                       error.includes('🔧') ? '🔧' : 
                       error.includes('📡') ? '📡' : 
                       error.includes('🚨') ? '🚨' : '⚠️'}
                    </span>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="text-red-800 font-semibold text-sm">
                      {error}
                    </div>
                    
                    {/* แสดงคำแนะนำเพิ่มเติมตามประเภทของ error */}
                    {error.includes('รหัสผ่านไม่ถูกต้อง') && (
                      <div className="mt-3 text-red-700 text-xs">
                        <p className="font-medium mb-1">💡 คำแนะนำ:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>ตรวจสอบการพิมพ์ Caps Lock</li>
                          <li>ตรวจสอบว่าใช้ชื่อผู้ใช้หรืออีเมลที่ถูกต้อง</li>
                        </ul>
                      </div>
                    )}
                    
                    {error.includes('เซิร์ฟเวอร์มีปัญหา') && (
                      <div className="mt-3 text-red-700 text-xs">
                        <p className="font-medium mb-1">🔧 สถานะเซิร์ฟเวอร์:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>เซิร์ฟเวอร์อาจกำลังบำรุงรักษา</li>
                          <li>รอ 30 วินาที แล้วลองใหม่</li>
                        </ul>
                      </div>
                    )}
                    
                    {error.includes('เชื่อมต่อ') && (
                      <div className="mt-3 text-red-700 text-xs">
                        <p className="font-medium mb-1">📡 ตรวจสอบการเชื่อมต่อ:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>ตรวจสอบสัญญาณ WiFi หรือ Mobile Data</li>
                          <li>ลองเปิดเว็บไซต์อื่นดู</li>
                          <li>รีเฟรชหน้าเว็บ (F5)</li>
                        </ul>
                      </div>
                    )}
                    
                    {isSafariBrowser && error.includes('Safari') && (
                      <div className="mt-3 text-orange-700 text-xs">
                        <p className="font-medium mb-1">🦁 Safari Settings:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>ปิด "Prevent cross-site tracking" ใน Settings → Privacy</li>
                          <li>เปิดใช้งาน cookies ทั้งหมด</li>
                          <li>ลองรีเฟรชหน้าเว็บ</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {isSafariBrowser && !error && (
              <div className="bg-orange-50 border-2 border-orange-300 text-orange-800 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-center">
                  <span className="text-lg mr-2">🦁</span>
                  <div>
                    <p className="font-semibold">Safari Browser Detected</p>
                    <p>หากมีปัญหาในการเข้าสู่ระบบ ให้ตรวจสอบ Privacy Settings</p>
                  </div>
                </div>
              </div>
            )}
            
          
            
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-blue-800 mb-2">
                ชื่อผู้ใช้ หรือ อีเมล
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-3 py-2 bg-white/90 border-2 border-blue-300 rounded-lg text-blue-800 placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-blue-800 mb-2">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-white/90 border-2 border-blue-300 rounded-lg text-blue-800 placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="กรอกรหัสผ่าน"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border-2 border-emerald-500 rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all ${isSafariBrowser ? 'safari-hover safari-transform-fix' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className={`animate-spin -ml-1 mr-3 h-5 w-5 text-white ${isSafariBrowser ? 'safari-spinner' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center space-y-3">
            <p className="text-blue-700 font-semibold">
              ยังไม่มีบัญชี?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline"
              >
                สมัครสมาชิก
              </button>
            </p>
            
            {onBackToLanding && (
              <p className="text-blue-600">
                <button
                  onClick={onBackToLanding}
                  className="text-blue-600 hover:text-blue-700 text-sm underline font-medium"
                >
                  ← กลับหน้าหลัก
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
