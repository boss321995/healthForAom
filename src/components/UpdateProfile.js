import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  safariLocalStorage,
  getSafariAxiosConfig,
  handleSafariCorsError,
  getSafariErrorMessage
} from '../utils/safariSupport';

const UpdateProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    blood_group: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    medical_conditions: '',
    medications: ''
  });

  const formatDateValue = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    const stringValue = String(value);
    if (stringValue.includes('T')) {
      return stringValue.split('T')[0];
    }
    if (stringValue.includes(' ')) {
      return stringValue.split(' ')[0];
    }
    return stringValue;
  };

  useEffect(() => {
    if (!user) return;

    setProfileForm(prev => {
      const next = { ...prev };
      let changed = false;

      const maybeUpdate = (field, value, transform = (val) => val ?? '') => {
        if (next[field]) return;
        const transformed = transform(value);
        if (transformed) {
          next[field] = transformed;
          changed = true;
        }
      };

      maybeUpdate('full_name', user.full_name || user.name || user.display_name);
      maybeUpdate('date_of_birth', user.date_of_birth, formatDateValue);
      maybeUpdate('gender', user.gender);
      maybeUpdate('blood_group', user.blood_group);
      maybeUpdate('height_cm', user.height_cm);
      maybeUpdate('phone', user.phone);
      maybeUpdate('emergency_contact', user.emergency_contact);
      maybeUpdate('emergency_phone', user.emergency_phone);
      maybeUpdate('medical_conditions', user.medical_conditions);
      maybeUpdate('medications', user.medications);

      return changed ? next : prev;
    });
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = safariLocalStorage.getItem('healthToken');

      if (!token) {
        setSubmitMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบใหม่' });
        setLoading(false);
        return;
      }

      if (token.startsWith('mock-jwt-token-')) {
        setSubmitMessage({ type: 'error', text: 'โทเค็นไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
        setLoading(false);
        return;
      }

      const baseConfig = getSafariAxiosConfig();
      const requestConfig = {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${token}`
        }
      };

      const response = await axios.get('/api/users/profile', requestConfig);

      // Backend returns { user: {}, profile: {} }
      const profileData = response.data.profile;
      
      if (profileData) {
        setProfileForm({
          full_name: profileData.full_name || '',
          date_of_birth: formatDateValue(profileData.date_of_birth),
          gender: profileData.gender || '',
          height_cm: profileData.height_cm || '',
          blood_group: profileData.blood_group || '',
          phone: profileData.phone || '',
          emergency_contact: profileData.emergency_contact || '',
          emergency_phone: profileData.emergency_phone || '',
          medical_conditions: profileData.medical_conditions || '',
          medications: profileData.medications || ''
        });
      }
    } catch (error) {
      const safariCors = handleSafariCorsError(error);
      if (safariCors) {
        setSubmitMessage({ type: 'error', text: safariCors.message });
        setLoading(false);
        return;
      }

      const safariMessage = getSafariErrorMessage(error);
      if (safariMessage) {
        setSubmitMessage({ type: 'error', text: safariMessage });
        setLoading(false);
        return;
      }
      
      if (error.response?.status === 401) {
        setSubmitMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบใหม่' });
      } else if (error.response?.status === 404) {
        setSubmitMessage({ type: 'info', text: 'ยังไม่มีข้อมูลโปรไฟล์ กรุณากรอกข้อมูลใหม่' });
      } else {
        setSubmitMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้' });
      }
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
      fetchProfile();
    }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!profileForm.full_name.trim()) {
      errors.push('กรุณากรอกชื่อ-นามสกุล');
    }
    
    if (!profileForm.date_of_birth) {
      errors.push('กรุณาเลือกวันเกิด');
    }
    
    if (!profileForm.gender) {
      errors.push('กรุณาเลือกเพศ');
    }
    
    if (profileForm.height_cm && (profileForm.height_cm < 100 || profileForm.height_cm > 250)) {
      errors.push('ส่วนสูงต้องอยู่ระหว่าง 100-250 ซม.');
    }
    
    if (profileForm.phone && !/^[0-9]{9,10}$/.test(profileForm.phone.replace(/[-\s]/g, ''))) {
      errors.push('รูปแบบเบอร์โทรไม่ถูกต้อง');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setSubmitMessage({ 
        type: 'error', 
        text: `ข้อมูลไม่ถูกต้อง: ${errors.join(', ')}` 
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const token = safariLocalStorage.getItem('healthToken');
      if (!token) {
        setSubmitMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบใหม่' });
        setIsSubmitting(false);
        return;
      }

      if (token.startsWith('mock-jwt-token-')) {
        setSubmitMessage({ type: 'error', text: 'โทเค็นไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
        setIsSubmitting(false);
        return;
      }

      const baseConfig = getSafariAxiosConfig();
      const requestConfig = {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${token}`
        }
      };

      await axios.put('/api/users/profile', profileForm, requestConfig);
      
      setSubmitMessage({ type: 'success', text: 'อัปเดตโปรไฟล์สำเร็จ!' });

      // Auto hide success message after 3 seconds
      setTimeout(() => {
        setSubmitMessage({ type: '', text: '' });
      }, 3000);
      
      // Refresh profile data after successful update
      await fetchProfile();
      
    } catch (error) {
      const safariCors = handleSafariCorsError(error);
      if (safariCors) {
        setSubmitMessage({ type: 'error', text: safariCors.message });
        setIsSubmitting(false);
        return;
      }

      const safariMessage = getSafariErrorMessage(error);
      if (safariMessage) {
        setSubmitMessage({ type: 'error', text: safariMessage });
        setIsSubmitting(false);
        return;
      }

      let errorMessage = 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่';
      } else if (error.response?.status === 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง';
        console.error('Server error details:', error.response?.data);
      } else if (error.response?.status === 401) {
        errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
      } else if (error.response?.status === 400) {
        errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = `ข้อผิดพลาด: ${error.message}`;
      }
      
      setSubmitMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-800">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            ✏️ อัปเดตโปรไฟล์
          </h1>
          <p className="text-gray-600 text-lg">
            กรอกข้อมูลส่วนตัวเพื่อให้ระบบแสดงผลได้อย่างครบถ้วน
          </p>
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-left text-sm">
              <strong>Debug Info:</strong>
              <pre className="mt-2 text-xs">
                {JSON.stringify(profileForm, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Submit Message */}
        {submitMessage.text && (
          <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-lg ${
            submitMessage.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {submitMessage.text}
          </div>
        )}

        {/* Profile Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 border border-blue-200 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  👤 ข้อมูลส่วนตัว
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={profileForm.full_name}
                      onChange={handleInputChange}
                      placeholder="เช่น ณัฐนนท์ แก้วโมรา"
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        วันเกิด <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={profileForm.date_of_birth}
                        onChange={handleInputChange}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        เพศ <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={profileForm.gender}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">เลือกเพศ</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        ส่วนสูง (ซม.) <span className="text-yellow-600">✨ สำหรับคำนวณ BMI</span>
                      </label>
                      <input
                        type="number"
                        name="height_cm"
                        value={profileForm.height_cm}
                        onChange={handleInputChange}
                        min="100"
                        max="250"
                        placeholder="175.00"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">
                        กรุ๊ปเลือด
                      </label>
                      <select
                        name="blood_group"
                        value={profileForm.blood_group}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">เลือกกรุ๊ปเลือด</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  📞 ข้อมูลติดต่อ
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleInputChange}
                      placeholder="0959296637"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      ผู้ติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="text"
                      name="emergency_contact"
                      value={profileForm.emergency_contact}
                      onChange={handleInputChange}
                      placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {/* Emergency Phone */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 font-medium mb-2">
                      เบอร์ติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="tel"
                      name="emergency_phone"
                      value={profileForm.emergency_phone}
                      onChange={handleInputChange}
                      placeholder="เช่น 0812345678"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  🏥 ข้อมูลสุขภาพ
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Medical Conditions */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      โรคประจำตัว
                    </label>
                    <textarea
                      name="medical_conditions"
                      value={profileForm.medical_conditions}
                      onChange={handleInputChange}
                      placeholder="เช่น เบาหวาน, ความดันโลหิตสูง, หัวใจ (หรือระบุ 'ไม่มี' หากไม่มีโรคประจำตัว)"
                      rows="3"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {/* Medications */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      ยาที่ทานเป็นประจำ
                    </label>
                    <textarea
                      name="medications"
                      value={profileForm.medications}
                      onChange={handleInputChange}
                      placeholder="เช่น ยาลดความดัน, ยาเบาหวาน, วิตามิน (หรือระบุ 'ไม่มี' หากไม่ทานยาประจำ)"
                      rows="3"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-blue-500/25'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                      กำลังบันทึก...
                    </div>
                  ) : (
                    '💾 บันทึกโปรไฟล์'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateProfile;
