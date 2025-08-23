import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const UpdateProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    blood_group: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('healthToken');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/profile', { headers });
      
      if (response.data.profile_completed) {
        setProfileForm({
          first_name: response.data.first_name || '',
          last_name: response.data.last_name || '',
          date_of_birth: response.data.date_of_birth ? response.data.date_of_birth.split('T')[0] : '',
          gender: response.data.gender || '',
          height_cm: response.data.height_cm || '',
          blood_group: response.data.blood_group || '',
          phone: response.data.phone || '',
          emergency_contact: response.data.emergency_contact || '',
          emergency_phone: response.data.emergency_phone || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setSubmitMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!profileForm.first_name.trim()) {
      errors.push('กรุณากรอกชื่อ');
    }
    
    if (!profileForm.last_name.trim()) {
      errors.push('กรุณากรอกนามสกุล');
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
      const token = localStorage.getItem('healthToken');
      if (!token) {
        setSubmitMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบใหม่' });
        setIsSubmitting(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put('http://localhost:5000/api/profile', profileForm, { headers });
      
      setSubmitMessage({ type: 'success', text: 'อัปเดตโปรไฟล์สำเร็จ!' });
      
      // Auto hide success message after 3 seconds
      setTimeout(() => {
        setSubmitMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            ✏️ อัปเดตโปรไฟล์
          </h1>
          <p className="text-gray-300 text-lg">
            กรอกข้อมูลส่วนตัวเพื่อให้ระบบแสดงผลได้อย่างครบถ้วน
          </p>
        </div>

        {/* Submit Message */}
        {submitMessage.text && (
          <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-lg ${
            submitMessage.type === 'success' 
              ? 'bg-green-600/20 border border-green-400 text-green-300' 
              : 'bg-red-600/20 border border-red-400 text-red-300'
          }`}>
            {submitMessage.text}
          </div>
        )}

        {/* Profile Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  👤 ข้อมูลส่วนตัว
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      ชื่อ <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={profileForm.first_name}
                      onChange={handleInputChange}
                      placeholder="กรอกชื่อ"
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      นามสกุล <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={profileForm.last_name}
                      onChange={handleInputChange}
                      placeholder="กรอกนามสกุล"
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      วันเกิด <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={profileForm.date_of_birth}
                      onChange={handleInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      เพศ <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="">เลือกเพศ</option>
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      ส่วนสูง (ซม.) <span className="text-yellow-400">✨ สำหรับคำนวณ BMI</span>
                    </label>
                    <input
                      type="number"
                      name="height_cm"
                      value={profileForm.height_cm}
                      onChange={handleInputChange}
                      min="100"
                      max="250"
                      placeholder="เช่น 170"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      กรุ๊ปเลือด
                    </label>
                    <select
                      name="blood_group"
                      value={profileForm.blood_group}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="">เลือกกรุ๊ปเลือด</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
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

              {/* Contact Information */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  📞 ข้อมูลติดต่อ
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleInputChange}
                      placeholder="เช่น 0812345678"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      ผู้ติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="text"
                      name="emergency_contact"
                      value={profileForm.emergency_contact}
                      onChange={handleInputChange}
                      placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  {/* Emergency Phone */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 font-medium mb-2">
                      เบอร์ติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="tel"
                      name="emergency_phone"
                      value={profileForm.emergency_phone}
                      onChange={handleInputChange}
                      placeholder="เช่น 0812345678"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-cyan-500/25'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
