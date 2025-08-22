import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import HealthAnalytics from './HealthAnalytics';
import axios from 'axios';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [healthSummary, setHealthSummary] = useState(null);
  const [recentMetrics, setRecentMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Form state for health metrics
  const [metricsForm, setMetricsForm] = useState({
    measurement_date: new Date().toISOString().split('T')[0],
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    blood_sugar_mg: '',
    cholesterol_total: '',
    cholesterol_hdl: '',
    cholesterol_ldl: '',
    triglycerides: '',
    hba1c: '',
    body_fat_percentage: '',
    muscle_mass_kg: '',
    notes: ''
  });

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = localStorage.getItem('healthToken');
      console.log('🔑 Token found:', token ? 'Yes' : 'No');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch health summary
      try {
        const summaryResponse = await axios.get('http://localhost:5000/api/health-summary', { headers });
        setHealthSummary(summaryResponse.data);
        console.log('✅ Health summary loaded:', summaryResponse.data);
      } catch (error) {
        console.error('❌ Health summary error:', error.response?.status, error.response?.data);
        if (error.response?.status === 403 || error.response?.status === 401) {
          // Token expired or invalid, clear auth and redirect
          localStorage.removeItem('healthToken');
          localStorage.removeItem('user');
          window.location.href = '/';
          return;
        }
        if (error.response?.status !== 404) {
          console.error('Error fetching health summary:', error);
        }
      }

      // Fetch recent metrics
      try {
        const metricsResponse = await axios.get('http://localhost:5000/api/health-metrics?limit=5', { headers });
        setRecentMetrics(metricsResponse.data);
      } catch (error) {
        console.error('Error fetching health metrics:', error);
      }

    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBMIColor = (bmi) => {
    if (!bmi) return 'text-gray-400';
    if (bmi < 18.5) return 'text-blue-400';
    if (bmi <= 24.9) return 'text-green-400';
    if (bmi <= 29.9) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBPStatus = (systolic, diastolic) => {
    if (!systolic || !diastolic) return { status: 'ไม่มีข้อมูล', color: 'text-gray-400' };
    
    if (systolic >= 140 || diastolic >= 90) {
      return { status: 'สูง', color: 'text-red-400' };
    } else if (systolic >= 120 || diastolic >= 80) {
      return { status: 'ค่อนข้างสูง', color: 'text-yellow-400' };
    } else {
      return { status: 'ปกติ', color: 'text-green-400' };
    }
  };

  // Handle form input changes
  const handleMetricsInputChange = (e) => {
    const { name, value } = e.target;
    setMetricsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate health metrics form
  const validateMetricsForm = () => {
    const errors = [];
    
    // Date validation
    if (!metricsForm.measurement_date) {
      errors.push('กรุณาเลือกวันที่วัด');
    }
    
    // Blood pressure validation
    if (metricsForm.systolic_bp && (metricsForm.systolic_bp < 70 || metricsForm.systolic_bp > 300)) {
      errors.push('ความดันโลหิตตัวบน (70-300 mmHg)');
    }
    if (metricsForm.diastolic_bp && (metricsForm.diastolic_bp < 40 || metricsForm.diastolic_bp > 200)) {
      errors.push('ความดันโลหิตตัวล่าง (40-200 mmHg)');
    }
    
    // Heart rate validation
    if (metricsForm.heart_rate && (metricsForm.heart_rate < 30 || metricsForm.heart_rate > 250)) {
      errors.push('อัตราการเต้นหัวใจ (30-250 bpm)');
    }
    
    // Blood sugar validation
    if (metricsForm.blood_sugar_mg && (metricsForm.blood_sugar_mg < 20 || metricsForm.blood_sugar_mg > 600)) {
      errors.push('ระดับน้ำตาลในเลือด (20-600 mg/dL)');
    }
    
    // Cholesterol validation
    if (metricsForm.cholesterol_total && (metricsForm.cholesterol_total < 100 || metricsForm.cholesterol_total > 500)) {
      errors.push('คอเลสเตอรอลรวม (100-500 mg/dL)');
    }
    
    return errors;
  };

  // Submit health metrics
  const handleMetricsSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    // Validate form
    const errors = validateMetricsForm();
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

      // Prepare data (only send non-empty values)
      const metricsData = {};
      Object.keys(metricsForm).forEach(key => {
        if (metricsForm[key] !== '' && metricsForm[key] !== null) {
          metricsData[key] = metricsForm[key];
        }
      });

      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('📤 Submitting health metrics:', metricsData);
      
      await axios.post('http://localhost:5000/api/health-metrics', metricsData, { headers });
      
      console.log('✅ Health metrics submitted successfully');
      setSubmitMessage({ type: 'success', text: 'บันทึกข้อมูลสำเร็จ!' });
      
      // Reset form
      setMetricsForm({
        measurement_date: new Date().toISOString().split('T')[0],
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        blood_sugar_mg: '',
        cholesterol_total: '',
        cholesterol_hdl: '',
        cholesterol_ldl: '',
        triglycerides: '',
        hba1c: '',
        body_fat_percentage: '',
        muscle_mass_kg: '',
        notes: ''
      });
      
      // Refresh data
      console.log('🔄 Refreshing health data...');
      await fetchHealthData();
      console.log('✅ Health data refreshed');
      
      // Auto switch to overview after 2 seconds
      setTimeout(() => {
        setActiveTab('overview');
        setSubmitMessage({ type: '', text: '' });
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting health metrics:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Health Dashboard
              </h1>
              <p className="text-gray-300">
                สวัสดี, {healthSummary?.first_name || user?.username || 'ผู้ใช้'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-medium">{user?.username}</p>
                <p className="text-gray-300 text-sm">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg border border-red-500/50"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'overview', label: 'ภาพรวม', icon: '📊' },
            { id: 'analytics', label: 'การวิเคราะห์ AI', icon: '🧠' },
            { id: 'metrics', label: 'ค่าตรวจสุขภาพ', icon: '🩺' },
            { id: 'behaviors', label: 'พฤติกรรม', icon: '🏃' },
            { id: 'profile', label: 'โปรไฟล์', icon: '👤' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* BMI Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">BMI</p>
                    <p className={`text-2xl font-bold ${getBMIColor(healthSummary?.bmi)}`}>
                      {healthSummary?.bmi?.toFixed(1) || '--'}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {healthSummary?.bmi_category || 'ไม่มีข้อมูล'}
                    </p>
                  </div>
                  <div className="text-3xl">⚖️</div>
                </div>
              </div>

              {/* Blood Pressure Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">ความดันโลหิต</p>
                    <p className="text-2xl font-bold text-white">
                      {healthSummary?.systolic_bp && healthSummary?.diastolic_bp
                        ? `${healthSummary.systolic_bp}/${healthSummary.diastolic_bp}`
                        : '--/--'
                      }
                    </p>
                    <p className={`text-sm ${getBPStatus(healthSummary?.systolic_bp, healthSummary?.diastolic_bp).color}`}>
                      {getBPStatus(healthSummary?.systolic_bp, healthSummary?.diastolic_bp).status}
                    </p>
                  </div>
                  <div className="text-3xl">💓</div>
                </div>
              </div>

              {/* Heart Rate Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">อัตราการเต้นหัวใจ</p>
                    <p className="text-2xl font-bold text-white">
                      {healthSummary?.heart_rate || '--'}
                      {healthSummary?.heart_rate && <span className="text-sm"> bpm</span>}
                    </p>
                  </div>
                  <div className="text-3xl">💗</div>
                </div>
              </div>

              {/* Last Checkup Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">ตรวจล่าสุด</p>
                    <p className="text-lg font-bold text-white">
                      {healthSummary?.last_checkup 
                        ? new Date(healthSummary.last_checkup).toLocaleDateString('th-TH')
                        : 'ยังไม่มีข้อมูล'
                      }
                    </p>
                  </div>
                  <div className="text-3xl">📅</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">⚡</span>
                บันทึกข้อมูลสุขภาพ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Record Vitals Card */}
                <button 
                  onClick={() => setActiveTab('metrics')}
                  className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 backdrop-blur-lg rounded-lg p-6 border border-green-500/30 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🩺</div>
                    <h4 className="text-white font-semibold mb-2">บันทึกค่าตรวจ</h4>
                    <p className="text-green-200 text-sm">ความดัน, น้ำตาล, คอเลสเตอรอล</p>
                  </div>
                </button>

                {/* Record Exercise Card */}
                <button 
                  onClick={() => setActiveTab('behaviors')}
                  className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 hover:from-blue-500/30 hover:to-cyan-600/30 backdrop-blur-lg rounded-lg p-6 border border-blue-500/30 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🏃</div>
                    <h4 className="text-white font-semibold mb-2">บันทึกกิจกรรม</h4>
                    <p className="text-blue-200 text-sm">การออกกำลังกาย, การนอน</p>
                  </div>
                </button>

                {/* View Analytics Card */}
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 hover:from-purple-500/30 hover:to-violet-600/30 backdrop-blur-lg rounded-lg p-6 border border-purple-500/30 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🧠</div>
                    <h4 className="text-white font-semibold mb-2">วิเคราะห์ AI</h4>
                    <p className="text-purple-200 text-sm">แนวโน้มและคำแนะนำ</p>
                  </div>
                </button>

                {/* Update Profile Card */}
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="bg-gradient-to-br from-orange-500/20 to-red-600/20 hover:from-orange-500/30 hover:to-red-600/30 backdrop-blur-lg rounded-lg p-6 border border-orange-500/30 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">👤</div>
                    <h4 className="text-white font-semibold mb-2">อัปเดตโปรไฟล์</h4>
                    <p className="text-orange-200 text-sm">ข้อมูลส่วนตัวและการติดต่อ</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Health Summary Section */}
        {activeTab === 'overview' && healthSummary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">ข้อมูลส่วนตัว</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">ชื่อ-นามสกุล:</span>
                  <span className="text-white">
                    {healthSummary.first_name && healthSummary.last_name 
                      ? `${healthSummary.first_name} ${healthSummary.last_name}`
                      : 'ยังไม่ได้กรอก'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">อายุ:</span>
                  <span className="text-white">{healthSummary.age || '--'} ปี</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">เพศ:</span>
                  <span className="text-white">
                    {healthSummary.gender === 'male' ? 'ชาย' : 
                     healthSummary.gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">ส่วนสูง:</span>
                  <span className="text-white">{healthSummary.height_cm || '--'} ซม.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">น้ำหนัก:</span>
                  <span className="text-white">{healthSummary.weight_kg || '--'} กก.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">กรุ๊ปเลือด:</span>
                  <span className="text-white">{healthSummary.blood_group || 'ไม่ทราบ'}</span>
                </div>
              </div>
            </div>

            {/* Recent Health Records */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">บันทึกล่าสุด</h3>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  ดูทั้งหมด →
                </button>
              </div>
              <div className="space-y-3">
                {recentMetrics.length > 0 ? (
                  recentMetrics.slice(0, 5).map((record, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {record.record_type === 'metric' ? '🩺 ค่าตรวจสุขภาพ' : '🏃 พฤติกรรม'}
                          </p>
                          <p className="text-gray-300 text-xs mt-1">
                            {record.systolic_bp && record.diastolic_bp && 
                              `ความดัน: ${record.systolic_bp}/${record.diastolic_bp} mmHg`
                            }
                            {record.heart_rate && ` | ชีพจร: ${record.heart_rate} bpm`}
                            {record.exercise_duration_minutes && 
                              `ออกกำลังกาย: ${record.exercise_duration_minutes} นาที`
                            }
                            {record.sleep_hours_per_night && 
                              ` | นอน: ${record.sleep_hours_per_night} ชั่วโมง`
                            }
                          </p>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(record.date).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-300 text-sm">ยังไม่มีข้อมูลสุขภาพ</p>
                    <button
                      onClick={() => setActiveTab('metrics')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs mt-1"
                    >
                      เริ่มบันทึกข้อมูล
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Health Recommendations */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">คำแนะนำด้านสุขภาพ</h3>
              <div className="space-y-4">
                {healthSummary.lifestyle_recommendations ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-2xl mr-3">💡</div>
                      <div>
                        <h4 className="text-blue-200 font-medium mb-2">คำแนะนำส่วนบุคคล</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {healthSummary.lifestyle_recommendations}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-gray-300 text-sm">กรอกข้อมูลสุขภาพเพื่อรับคำแนะนำที่เหมาะสม</p>
                  </div>
                )}

                {/* Quick Health Tips */}
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">เคล็ดลับสุขภาพ</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                      <p className="text-green-200 text-xs">🥗 กินผัก-ผลไม้ให้หลากหลาย</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                      <p className="text-blue-200 text-xs">💧 ดื่มน้ำอย่างน้อย 8 แก้วต่อวัน</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
                      <p className="text-purple-200 text-xs">😴 นอนหลับ 7-9 ชั่วโมงต่อคืน</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && <HealthAnalytics />}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-3">🩺</span>
                  บันทึกค่าตรวจสุขภาพ
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`mb-6 p-4 rounded-lg border animate-fade-in ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-500/20 border-green-500/50 text-green-200' 
                    : 'bg-red-500/20 border-red-500/50 text-red-200'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {submitMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">{submitMessage.text}</span>
                    {submitMessage.type === 'success' && (
                      <span className="ml-2 text-sm text-green-300">กำลังกลับไปหน้าหลัก...</span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleMetricsSubmit} className="space-y-6">
                {/* Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      วันที่วัด <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="measurement_date"
                      value={metricsForm.measurement_date}
                      onChange={handleMetricsInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                {/* Vital Signs */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">💓</span>
                    สัญญาณชีพ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        ความดันโลหิตตัวบน (mmHg)
                      </label>
                      <input
                        type="number"
                        name="systolic_bp"
                        value={metricsForm.systolic_bp}
                        onChange={handleMetricsInputChange}
                        min="70"
                        max="300"
                        placeholder="เช่น 120"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        ความดันโลหิตตัวล่าง (mmHg)
                      </label>
                      <input
                        type="number"
                        name="diastolic_bp"
                        value={metricsForm.diastolic_bp}
                        onChange={handleMetricsInputChange}
                        min="40"
                        max="200"
                        placeholder="เช่น 80"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        อัตราการเต้นหัวใจ (bpm)
                      </label>
                      <input
                        type="number"
                        name="heart_rate"
                        value={metricsForm.heart_rate}
                        onChange={handleMetricsInputChange}
                        min="30"
                        max="250"
                        placeholder="เช่น 72"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Blood Tests */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">🩸</span>
                    การตรวจเลือด
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        ระดับน้ำตาลในเลือด (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="blood_sugar_mg"
                        value={metricsForm.blood_sugar_mg}
                        onChange={handleMetricsInputChange}
                        min="20"
                        max="600"
                        placeholder="เช่น 100"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        คอเลสเตอรอลรวม (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="cholesterol_total"
                        value={metricsForm.cholesterol_total}
                        onChange={handleMetricsInputChange}
                        min="100"
                        max="500"
                        placeholder="เช่น 200"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        HDL (Good Cholesterol) (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="cholesterol_hdl"
                        value={metricsForm.cholesterol_hdl}
                        onChange={handleMetricsInputChange}
                        min="10"
                        max="150"
                        placeholder="เช่น 50"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        LDL (Bad Cholesterol) (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="cholesterol_ldl"
                        value={metricsForm.cholesterol_ldl}
                        onChange={handleMetricsInputChange}
                        min="10"
                        max="300"
                        placeholder="เช่น 100"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        ไตรกลีเซอไรด์ (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="triglycerides"
                        value={metricsForm.triglycerides}
                        onChange={handleMetricsInputChange}
                        min="10"
                        max="1000"
                        placeholder="เช่น 150"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        HbA1c (%)
                      </label>
                      <input
                        type="number"
                        name="hba1c"
                        value={metricsForm.hba1c}
                        onChange={handleMetricsInputChange}
                        min="3"
                        max="20"
                        step="0.1"
                        placeholder="เช่น 5.5"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Composition */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">⚖️</span>
                    องค์ประกอบของร่างกาย
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        เปอร์เซ็นต์ไขมัน (%)
                      </label>
                      <input
                        type="number"
                        name="body_fat_percentage"
                        value={metricsForm.body_fat_percentage}
                        onChange={handleMetricsInputChange}
                        min="2"
                        max="60"
                        step="0.1"
                        placeholder="เช่น 15.5"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        มวลกล้ามเนื้อ (kg)
                      </label>
                      <input
                        type="number"
                        name="muscle_mass_kg"
                        value={metricsForm.muscle_mass_kg}
                        onChange={handleMetricsInputChange}
                        min="10"
                        max="100"
                        step="0.1"
                        placeholder="เช่น 45.5"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-300 font-medium mb-2">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    name="notes"
                    value={metricsForm.notes}
                    onChange={handleMetricsInputChange}
                    rows="3"
                    placeholder="เช่น อาการผิดปกติ, ยาที่รับประทาน, สภาพแวดล้อมในการตรวจ..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💾</span>
                        บันทึกข้อมูล
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMetricsForm({
                        measurement_date: new Date().toISOString().split('T')[0],
                        systolic_bp: '',
                        diastolic_bp: '',
                        heart_rate: '',
                        blood_sugar_mg: '',
                        cholesterol_total: '',
                        cholesterol_hdl: '',
                        cholesterol_ldl: '',
                        triglycerides: '',
                        hba1c: '',
                        body_fat_percentage: '',
                        muscle_mass_kg: '',
                        notes: ''
                      });
                      setSubmitMessage({ type: '', text: '' });
                    }}
                    className="px-6 py-3 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 hover:text-white border border-gray-500/50 rounded-lg transition-all duration-300"
                  >
                    เริ่มใหม่
                  </button>
                </div>
              </form>

              {/* Safety Notice */}
              <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">⚠️</div>
                  <div>
                    <h5 className="text-yellow-200 font-medium mb-2">ข้อควรระวัง</h5>
                    <ul className="text-yellow-100 text-sm space-y-1">
                      <li>• ข้อมูลที่บันทึกควรมาจากการตรวจโดยเครื่องมือที่ถูกต้องและแม่นยำ</li>
                      <li>• หากพบค่าผิดปกติ กรุณาปรึกษาแพทย์โดยทันที</li>
                      <li>• ระบบนี้ไม่สามารถทดแทนการวินิจฉัยโดยแพทย์ได้</li>
                      <li>• ข้อมูลจะถูกเข้ารหัสและเก็บรักษาตามมาตรฐาน HIPAA และ PDPA</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Behaviors Tab */}
        {activeTab === 'behaviors' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">พฤติกรรมสุขภาพ</h3>
            <p className="text-gray-300 text-center py-12">
              🔧 กำลังพัฒนาฟอร์มบันทึกพฤติกรรมสุขภาพ
            </p>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">โปรไฟล์ส่วนตัว</h3>
            <p className="text-gray-300 text-center py-12">
              🔧 กำลังพัฒนาฟอร์มแก้ไขโปรไฟล์
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
