import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PostRegistrationAssessment from './PostRegistrationAssessment';

const Register = ({ onSwitchToLogin, onBackToLanding }) => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Profile fields
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height_cm: '',
    weight_kg: '',
    phone: '',
    emergency_contact: '',
    medical_conditions: '',
    medications: '',
    allergies: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();

  // Calculate BMI
  const calculateBMI = (height_cm, weight_kg) => {
    if (!height_cm || !weight_kg || height_cm <= 0 || weight_kg <= 0) {
      return null;
    }
    const heightInMeters = height_cm / 100;
    return weight_kg / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'น้ำหนักน้อย';
    if (bmi <= 24.9) return 'ปกติ';
    if (bmi <= 29.9) return 'น้ำหนักเกิน';
    if (bmi <= 34.9) return 'อ้วนระดับ 1';
    if (bmi <= 39.9) return 'อ้วนระดับ 2';
    return 'อ้วนระดับ 3';
  };

  const getBMIColor = (bmi) => {
    if (!bmi) return 'text-gray-400';
    if (bmi < 18.5) return 'text-blue-600';
    if (bmi <= 24.9) return 'text-green-600';
    if (bmi <= 29.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const currentBMI = calculateBMI(formData.height_cm, formData.weight_kg);

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

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setIsLoading(false);
      return;
    }

    // Validate required profile fields
    if (!formData.full_name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      setIsLoading(false);
      return;
    }

    if (!formData.date_of_birth) {
      setError('กรุณาเลือกวันเกิด');
      setIsLoading(false);
      return;
    }

    if (!formData.gender) {
      setError('กรุณาเลือกเพศ');
      setIsLoading(false);
      return;
    }

    if (!formData.height_cm || formData.height_cm < 100 || formData.height_cm > 250) {
      setError('กรุณากรอกส่วนสูงให้ถูกต้อง (100-250 ซม.)');
      setIsLoading(false);
      return;
    }

    if (!formData.weight_kg || formData.weight_kg < 30 || formData.weight_kg > 200) {
      setError('กรุณากรอกน้ำหนักให้ถูกต้อง (30-200 กก.)');
      setIsLoading(false);
      return;
    }

    // Separate user registration data and profile data
    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password
    };

    const profileData = {
      full_name: formData.full_name.trim(),
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
      blood_group: formData.blood_group || null,
      height_cm: parseFloat(formData.height_cm),
      weight_kg: parseFloat(formData.weight_kg),
      phone: formData.phone.trim() || null,
      emergency_contact: formData.emergency_contact.trim() || null,
      medical_conditions: formData.medical_conditions.trim() || null,
      medications: formData.medications.trim() || null,
      allergies: formData.allergies.trim() || null
    };

    const result = await register(userData.username, userData.email, userData.password, profileData);
    
    if (result.success) {
      setRegistrationSuccess(true);
      setShowAssessment(true);
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  const handleAssessmentComplete = (assessmentData) => {
    console.log('✅ Health assessment completed:', assessmentData);
    // Redirect to dashboard or show success message
    window.location.href = '/';
  };

  const handleAssessmentSkip = () => {
    console.log('⏭️ Health assessment skipped');
    // Redirect to dashboard
    window.location.href = '/';
  };

  // Show assessment form after successful registration
  if (showAssessment) {
    return (
      <PostRegistrationAssessment 
        onComplete={handleAssessmentComplete}
        onSkip={handleAssessmentSkip}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="bg-white/95 backdrop-blur-lg rounded-xl p-8 border-2 border-gray-300 shadow-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              สมัครสมาชิก
            </h2>
            <p className="text-gray-600 mb-8">
              เริ่มต้นดูแลสุขภาพของคุณวันนี้
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-900 px-4 py-3 rounded-lg font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-2">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                placeholder="กรอกชื่อผู้ใช้"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                placeholder="กรอกอีเมล"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                placeholder="ยืนยันรหัสผ่าน"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            
            {/* Profile Section */}
            <div className="border-t-2 border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                ข้อมูลส่วนตัว
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                กรอกข้อมูลเพื่อให้ระบบวิเคราะห์สุขภาพได้แม่นยำ
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-2">
                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="ชื่อจริง นามสกุล"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-900 mb-2">
                    วันเกิด <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-900 mb-2">
                    เพศ <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">เลือกเพศ</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="blood_group" className="block text-sm font-medium text-gray-900 mb-2">
                    กรุ๊ปเลือด
                  </label>
                  <select
                    id="blood_group"
                    name="blood_group"
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    value={formData.blood_group}
                    onChange={handleChange}
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
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="08x-xxx-xxxx"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="height_cm" className="block text-sm font-medium text-gray-900 mb-2">
                    ส่วนสูง (ซม.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="height_cm"
                    name="height_cm"
                    type="number"
                    required
                    min="100"
                    max="250"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="เช่น 165"
                    value={formData.height_cm}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-900 mb-2">
                    น้ำหนัก (กก.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="weight_kg"
                    name="weight_kg"
                    type="number"
                    required
                    min="30"
                    max="200"
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="เช่น 60"
                    value={formData.weight_kg}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              {/* BMI Display */}
              {currentBMI && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">ค่า BMI ของคุณ</h4>
                      <div className="flex items-center space-x-3">
                        <span className={`text-2xl font-bold ${getBMIColor(currentBMI)}`}>
                          {currentBMI.toFixed(1)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getBMIColor(currentBMI)} bg-opacity-20 border`}>
                          {getBMICategory(currentBMI)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 mb-1">เกณฑ์อ้างอิง</div>
                      <div className="text-xs space-y-1">
                        <div className="text-blue-600">น้อย: &lt;18.5</div>
                        <div className="text-green-600">ปกติ: 18.5-24.9</div>
                        <div className="text-yellow-600">เกิน: 25.0-29.9</div>
                        <div className="text-red-600">อ้วน: &gt;30.0</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-900 mb-2">
                  ผู้ติดต่อฉุกเฉิน
                </label>
                <input
                  id="emergency_contact"
                  name="emergency_contact"
                  type="text"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="ชื่อและเบอร์โทรศัพท์ของผู้ติดต่อฉุกเฉิน"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="medical_conditions" className="block text-sm font-medium text-gray-900 mb-2">
                  โรคประจำตัว / ประวัติการรักษา
                </label>
                <textarea
                  id="medical_conditions"
                  name="medical_conditions"
                  rows="2"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="เช่น เบาหวาน, ความดันสูง, โรคหัวใจ (หากไม่มีให้ใส่ 'ไม่มี')"
                  value={formData.medical_conditions}
                  onChange={handleChange}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="medications" className="block text-sm font-medium text-gray-900 mb-2">
                  ยาที่รับประทานอยู่
                </label>
                <textarea
                  id="medications"
                  name="medications"
                  rows="2"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="ระบุชื่อยาและขนาด (หากไม่มีให้ใส่ 'ไม่มี')"
                  value={formData.medications}
                  onChange={handleChange}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-900 mb-2">
                  อาการแพ้
                </label>
                <textarea
                  id="allergies"
                  name="allergies"
                  rows="2"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="เช่น แพ้ยาเพนิซิลิน, แพ้อาหารทะเล (หากไม่มีให้ใส่ 'ไม่มี')"
                  value={formData.allergies}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-6 border-2 border-transparent rounded-lg shadow-lg text-lg font-bold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังสมัครสมาชิกและบันทึกข้อมูล...
                </div>
              ) : (
                'สมัครสมาชิก พร้อมข้อมูลโปรไฟล์'
              )}
            </button>
            
            {/* Info Notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 text-sm">ℹ️</span>
                <div className="text-xs text-blue-700">
                  <div className="font-medium mb-1">ข้อมูลที่คุณกรอก:</div>
                  <ul className="space-y-1 text-blue-600">
                    <li>• จะถูกเข้ารหัสและเก็บอย่างปลอดภัย</li>
                    <li>• ใช้สำหรับวิเคราะห์สุขภาพเท่านั้น</li>
                    <li>• สามารถแก้ไขได้ในหน้าโปรไฟล์</li>
                    <li>• ไม่มีการแชร์ข้อมูลให้บุคคลที่สาม</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
          
          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-700">
              มีบัญชีอยู่แล้ว?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-cyan-600 hover:text-cyan-800 font-bold underline"
              >
                เข้าสู่ระบบ
              </button>
            </p>
            
            {onBackToLanding && (
              <p className="text-gray-600">
                <button
                  onClick={onBackToLanding}
                  className="text-gray-600 hover:text-gray-800 text-sm underline font-medium"
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

export default Register;
