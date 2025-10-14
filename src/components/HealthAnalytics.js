import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// ฟังก์ชันดึงค่าล่าสุดที่ไม่เป็น null สำหรับค่าใดค่าหนึ่ง
const getLatestValidValue = (metrics, fieldName) => {
  if (!metrics || metrics.length === 0) return null;
  
  // เรียงจากวันที่ล่าสุดก่อน และหาค่าที่ไม่เป็น null/undefined/0
  const sortedMetrics = [...metrics].sort((a, b) => 
    new Date(b.measurement_date) - new Date(a.measurement_date)
  );
  
  for (const metric of sortedMetrics) {
    const value = metric[fieldName];
    if (value !== null && value !== undefined && value !== 0 && value !== '') {
      return value;
    }
  }
  return null;
};

// เพิ่มฟังก์ชันการวิเคราะห์ค่าตรวจใหม่
const getUricAcidStatus = (value) => {
  if (!value) return { status: 'ไม่มีข้อมูล', color: 'text-gray-400', emoji: '❓' };
  if (value < 2.5) return { status: 'ต่ำ', color: 'text-blue-600', emoji: '🔵' };
  if (value <= 6.0) return { status: 'ปกติ', color: 'text-green-600', emoji: '✅' };
  if (value <= 7.0) return { status: 'สูงเล็กน้อย', color: 'text-yellow-600', emoji: '⚠️' };
  return { status: 'สูง (เสี่ยงเก๊าต์)', color: 'text-red-600', emoji: '🚨' };
};

const getLiverFunctionStatus = (alt, ast) => {
  if (!alt && !ast) return { status: 'ไม่มีข้อมูล', color: 'text-gray-400', emoji: '❓' };
  
  const altNormal = alt <= 40;
  const astNormal = ast <= 40;
  
  if (altNormal && astNormal) return { status: 'ปกติ', color: 'text-green-600', emoji: '✅' };
  if ((alt > 40 && alt <= 80) || (ast > 40 && ast <= 80)) {
    return { status: 'สูงเล็กน้อย', color: 'text-yellow-600', emoji: '⚠️' };
  }
  return { status: 'ผิดปกติ (ตรวจเพิ่มเติม)', color: 'text-red-600', emoji: '🚨' };
};

const getHemoglobinStatus = (value, gender) => {
  if (!value) return { status: 'ไม่มีข้อมูล', color: 'text-gray-400', emoji: '❓' };
  
  const maleNormal = value >= 13.5 && value <= 17.5;
  const femaleNormal = value >= 12.0 && value <= 15.5;
  
  if (gender === 'male' && maleNormal) return { status: 'ปกติ', color: 'text-green-600', emoji: '✅' };
  if (gender === 'female' && femaleNormal) return { status: 'ปกติ', color: 'text-green-600', emoji: '✅' };
  
  if (value < (gender === 'male' ? 13.5 : 12.0)) {
    return { status: 'โลหิตจาง', color: 'text-red-600', emoji: '🩸' };
  }
  
  if (value > (gender === 'male' ? 17.5 : 15.5)) {
    return { status: 'สูงเกิน', color: 'text-orange-600', emoji: '⚠️' };
  }
  
  return { status: 'ตรวจสอบ', color: 'text-yellow-600', emoji: '🔍' };
};

const getIronStatus = (iron, tibc) => {
  if (!iron && !tibc) return { status: 'ไม่มีข้อมูล', color: 'text-gray-400', emoji: '❓' };
  
  if (iron && iron >= 60 && iron <= 170) {
    return { status: 'ปกติ', color: 'text-green-600', emoji: '✅' };
  }
  
  if (iron && iron < 60) {
    return { status: 'ธาตุเหล็กต่ำ', color: 'text-red-600', emoji: '🔴' };
  }
  
  if (iron && iron > 170) {
    return { status: 'ธาตุเหล็กสูง', color: 'text-orange-600', emoji: '⚠️' };
  }
  
  return { status: 'ตรวจสอบ', color: 'text-yellow-600', emoji: '🔍' };
};

const HealthAnalytics = ({ 
  userProfile, 
  recentMetrics, 
  healthSummary, 
  getCurrentBMI, 
  getCurrentWeight, 
  getBMICategory, 
  getBMIColor,
  calculateHealthScore,
  generateHealthInsights
}) => {
  const { user } = useAuth();
  const [trends, setTrends] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('trends');
  const [apiStatus, setApiStatus] = useState({ connected: false, aiActive: false });

  // ฟังก์ชันคำนวณค่าเฉลี่ยที่กรอง null/0 ออก
  const calculateValidAverage = (fieldName) => {
    if (!recentMetrics || recentMetrics.length === 0) return null;
    
    const validValues = recentMetrics
      .map(m => m[fieldName])
      .filter(v => v != null && v !== undefined && v !== '' && v !== 0)
      .map(v => {
        const num = typeof v === 'string' ? parseFloat(v) : Number(v);
        return isNaN(num) || num <= 0 ? null : num;
      })
      .filter(v => v !== null);
    
    if (validValues.length === 0) return null;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  };

  // ฟังก์ชันดึงค่าล่าสุดที่ถูกต้อง
  const getLatestValidValue = (fieldName) => {
    if (!recentMetrics || recentMetrics.length === 0) return null;
    
    const validMetrics = recentMetrics
      .filter(metric => metric.measurement_date && metric.measurement_date !== 'undefined')
      .sort((a, b) => new Date(b.measurement_date) - new Date(a.measurement_date));
    
    for (const metric of validMetrics) {
      const value = metric[fieldName];
      if (['systolic_bp', 'diastolic_bp', 'heart_rate'].includes(fieldName)) {
        if (value !== null && value !== undefined && value > 0 && value !== '') {
          return value;
        }
      } else {
        if (value !== null && value !== undefined && value !== '' && (typeof value === 'number' ? value >= 0 : true)) {
          return value;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    console.log('🔄 HealthAnalytics useEffect triggered');
    console.log('👤 User state:', user ? user.username : 'No user');
    console.log('🔑 Token state:', localStorage.getItem('healthToken') ? 'Token exists' : 'No token');
    
    if (user && localStorage.getItem('healthToken')) {
      fetchHealthAnalytics();
    } else {
      console.warn('⚠️ HealthAnalytics: User or token not available');
      setLoading(false);
    }
  }, [selectedTimeRange, user]);

  const fetchHealthAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('healthToken');
      console.log('🔑 HealthAnalytics token found:', token ? 'Yes' : 'No');
      console.log('👤 HealthAnalytics user:', user ? user.username : 'No user');
      
      if (!token || !user) {
        console.error('❌ No token or user found for health analytics');
        setTrends(null);
        setPredictions(null);
        setInsights(null);
        setApiStatus({ connected: false, aiActive: false });
        setLoading(false);
        return;
      }
      
      // Check if it's a mock token - don't send to backend
      if (token.startsWith('mock-jwt-token-')) {
        console.log('🎭 Mock token detected - using mock data instead of API');
        // Set mock data for demo
        setTrends({
          trends: {
            bmi: { 
              trend: 'stable', 
              change: 0.1,
              average: getCurrentBMI ? getCurrentBMI() : 22.5
            },
            weight: { 
              trend: 'decreasing', 
              change: -1.2,
              average: getCurrentWeight ? getCurrentWeight() : 65
            },
            bloodPressure: { 
              trend: 'improving', 
              change: -5,
              averages: {
                systolic: 120,
                diastolic: 80
              },
              riskLevel: 'low'
            },
            bloodSugar: {
              trend: 'stable',
              change: 2,
              average: 95,
              diabetesRisk: 'low'
            },
            cholesterol: {
              trend: 'improving',
              change: -10,
              average: 180
            }
          }
        });
        setPredictions({
          nextMonthBMI: getCurrentBMI ? getCurrentBMI() + 0.1 : 22.5,
          weightGoal: 'On track',
          healthScore: calculateHealthScore ? calculateHealthScore() : 85
        });
        setInsights({
          recommendations: generateHealthInsights ? generateHealthInsights() : ['ออกกำลังกายสม่ำเสมอ', 'ดื่มน้ำให้เพียงพอ'],
          alerts: []
        });
        setApiStatus({ connected: false, aiActive: true }); // AI active but not connected to real API
        setLoading(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const [trendsRes, predictionsRes, insightsRes] = await Promise.all([
  axios.get(`/api/health-analytics/trends/${selectedTimeRange}`, { headers }),
  axios.get('/api/health-analytics/predictions', { headers }),
  axios.get('/api/health-analytics/insights', { headers })
      ]);

      console.log('✅ HealthAnalytics API responses:');
      console.log('📈 Trends:', trendsRes.data);
      console.log('🔮 Predictions:', predictionsRes.data);
      console.log('💡 Insights:', insightsRes.data);

      setTrends(trendsRes.data.data);
      setPredictions(predictionsRes.data.data);
      setInsights(insightsRes.data.data);
      setApiStatus({ connected: true, aiActive: true });
    } catch (error) {
      console.error('Error fetching health analytics:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('❌ Authentication failed in HealthAnalytics');
        // Clear invalid token and reload
        localStorage.removeItem('healthToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
      }
      
      // Set empty data for other errors to prevent crash
      setTrends(null);
      setPredictions(null);
      setInsights(null);
      setApiStatus({ connected: false, aiActive: false });
    } finally {
      setLoading(false);
    }
  };

  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex space-x-2 mb-6">
        {['1month', '3months', '6months', '1year'].map((range) => (
          <button
            key={range}
            onClick={() => setSelectedTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
              selectedTimeRange === range
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
            }`}
          >
            {range === '1month' ? '1 เดือน' : 
             range === '3months' ? '3 เดือน' :
             range === '6months' ? '6 เดือน' : '1 ปี'}
          </button>
        ))}
      </div>

      {trends ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BMI Trend */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-emerald-300 shadow-lg">
            <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center border-b-2 border-emerald-200 pb-2">
              <span className="text-2xl mr-2">⚖️</span>
              แนวโน้ม BMI
            </h3>
            {(() => {
              const currentBMI = getCurrentBMI ? getCurrentBMI() : null;
              const currentWeight = getCurrentWeight ? getCurrentWeight() : null;
              const bmiCategory = getBMICategory && currentBMI ? getBMICategory(currentBMI) : 'ไม่มีข้อมูล';
              const bmiColor = getBMIColor && currentBMI ? getBMIColor(currentBMI) : 'text-gray-400';
              
              return currentBMI ? (
                <div>
                  <div className="flex items-center justify-between mb-2 py-2 border-b border-emerald-100">
                    <span className="text-emerald-700 font-medium">BMI ปัจจุบัน</span>
                    <span className={`text-2xl font-bold ${bmiColor}`}>
                      {currentBMI.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2 py-2 border-b border-emerald-100">
                    <span className="text-emerald-700 font-medium">หมวดหมู่</span>
                    <span className={`font-semibold ${bmiColor}`}>{bmiCategory}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2 py-2 border-b border-emerald-100">
                    <span className="text-emerald-700 font-medium">น้ำหนักปัจจุบัน</span>
                    <span className="text-emerald-900 font-semibold">{currentWeight ? `${currentWeight} กก.` : 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-emerald-700 font-medium">แนวโน้ม</span>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                        trends?.trends?.bmi?.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-300' :
                        trends?.trends?.bmi?.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-300' :
                        'bg-blue-50 text-blue-800 border-blue-300'
                      }`}>
                        {trends?.trends?.bmi?.trend === 'increasing' ? 'เพิ่มขึ้น' :
                         trends?.trends?.bmi?.trend === 'decreasing' ? 'ลดลง' : 
                         trends?.trends?.bmi?.trend ? 'คงที่' : 'ไม่มีข้อมูลเปรียบเทียบ'}
                      </span>
                      <div className="text-xs text-gray-600 mt-1">
                        {trends?.trends?.bmi?.trend === 'increasing' ? 
                          (currentBMI > 24.9 ? 'น้ำหนักเพิ่ม ควรควบคุม' : 'น้ำหนักเพิ่มขึ้น ติดตาม') :
                         trends?.trends?.bmi?.trend === 'decreasing' ? 
                          (currentBMI < 18.5 ? 'น้ำหนักลดเกิน ควรเพิ่ม' : 'น้ำหนักลดลง เป็นสิ่งดี 👍') : 
                         trends?.trends?.bmi?.trend ? 'น้ำหนักเสถียร ดีมาก 👌' : 'ยังไม่มีข้อมูลเปรียบเทียบ'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">
                  ไม่มีข้อมูลส่วนสูงและน้ำหนัก<br/>
                  <span className="text-sm">กรุณากรอกข้อมูลในหน้าโปรไฟล์</span>
                </p>
              );
            })()}
          </div>

          {/* Blood Pressure Trend */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-red-300 shadow-lg">
            <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center border-b-2 border-red-200 pb-2">
              <span className="text-2xl mr-2">💓</span>
              แนวโน้มความดันโลหิต
            </h3>
            {trends.trends?.bloodPressure?.trend !== 'insufficient_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-red-100">
                  <span className="text-red-700 font-medium">ค่าเฉลี่ย</span>
                  <span className="text-red-900 font-semibold">
                    {(() => {
                      const avgSystolic = calculateValidAverage('systolic_bp');
                      const avgDiastolic = calculateValidAverage('diastolic_bp');
                      const systolicText = avgSystolic ? Math.round(avgSystolic) : '--';
                      const diastolicText = avgDiastolic ? Math.round(avgDiastolic) : '--';
                      return `${systolicText}/${diastolicText}`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-red-100">
                  <span className="text-red-700 font-medium">ระดับความเสี่ยง</span>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      trends?.trends?.bloodPressure?.riskLevel === 'high' ? 'bg-red-50 text-red-800 border-red-400' :
                      trends?.trends?.bloodPressure?.riskLevel === 'moderate' ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                      'bg-green-50 text-green-800 border-green-400'
                    }`}>
                      {trends?.trends?.bloodPressure?.riskLevel === 'high' ? 'สูง' :
                       trends?.trends?.bloodPressure?.riskLevel === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {trends?.trends?.bloodPressure?.riskLevel === 'high' ? 
                        'ควรปรึกษาแพทย์เร่งด่วน' :
                       trends?.trends?.bloodPressure?.riskLevel === 'moderate' ? 
                        'ควรติดตามและปรับพฤติกรรม' : 
                        'ความดันอยู่ในเกณฑ์ปกติ 👍'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-red-700 font-medium">แนวโน้ม</span>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      trends?.trends?.bloodPressure?.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-400' :
                      trends?.trends?.bloodPressure?.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-400' :
                      'bg-blue-50 text-blue-800 border-blue-400'
                    }`}>
                      {trends?.trends?.bloodPressure?.trend === 'increasing' ? 'เพิ่มขึ้น' :
                       trends?.trends?.bloodPressure?.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {trends?.trends?.bloodPressure?.trend === 'increasing' ? 
                        'ความดันเพิ่มขึ้น ควรระวัง' :
                       trends?.trends?.bloodPressure?.trend === 'decreasing' ? 
                        'ความดันลดลง เป็นสิ่งดี 👍' : 
                        'ความดันเสถียร แต่ควรติดตาม'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Blood Sugar Trend */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-amber-300 shadow-lg">
            <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center border-b-2 border-amber-200 pb-2">
              <span className="text-2xl mr-2">🍯</span>
              แนวโน้มน้ำตาลในเลือด
            </h3>
            {trends?.trends?.bloodSugar?.trend !== 'insufficient_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-amber-100">
                  <span className="text-amber-700 font-medium">ค่าเฉลี่ย</span>
                  <span className="text-amber-900 font-semibold">
                    {(() => {
                      const average = calculateValidAverage('blood_sugar_mg');
                      return average ? `${Math.round(average)} mg/dL` : 'ไม่มีข้อมูล';
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-amber-100">
                  <span className="text-amber-700 font-medium">ความเสี่ยงเบาหวาน</span>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      trends?.trends?.bloodSugar?.diabetesRisk === 'high' ? 'bg-red-50 text-red-800 border-red-400' :
                      trends?.trends?.bloodSugar?.diabetesRisk === 'moderate' ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                      'bg-green-50 text-green-800 border-green-400'
                    }`}>
                      {trends?.trends?.bloodSugar?.diabetesRisk === 'high' ? 'สูง' :
                       trends?.trends?.bloodSugar?.diabetesRisk === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {trends?.trends?.bloodSugar?.diabetesRisk === 'high' ? 
                        'ควรปรึกษาแพทย์เร่งด่วน' :
                       trends?.trends?.bloodSugar?.diabetesRisk === 'moderate' ? 
                        'ควรลดของหวานและออกกำลังกาย' : 
                        'ค่าน้ำตาลปกติ 👍'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3 py-2 border-b border-amber-100">
                  <span className="text-amber-700 font-medium">แนวโน้ม</span>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      trends?.trends?.bloodSugar?.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-400' :
                      trends?.trends?.bloodSugar?.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-400' :
                      'bg-blue-50 text-blue-800 border-blue-400'
                    }`}>
                      {trends?.trends?.bloodSugar?.trend === 'increasing' ? 'เพิ่มขึ้น' :
                       trends?.trends?.bloodSugar?.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {trends?.trends?.bloodSugar?.trend === 'increasing' ? 
                        'น้ำตาลเพิ่มขึ้น ควรระวัง' :
                       trends?.trends?.bloodSugar?.trend === 'decreasing' ? 
                        'น้ำตาลลดลง เป็นสิ่งดี 👍' : 
                        'น้ำตาลเสถียร ดีมาก 👌'}
                    </div>
                  </div>
                </div>

                {/* เพิ่มการเตือนโรคที่อาจเกิดขึ้น */}
                {(trends?.trends?.bloodSugar?.diabetesRisk === 'high' || 
                  trends?.trends?.bloodSugar?.trend === 'increasing') && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mt-4">
                    <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center">
                      <span className="text-lg mr-2">⚠️</span>
                      โรคที่อาจเกิดขึ้นในอนาคต
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center">
                        <span className="text-red-600 mr-2">🔹</span>
                        <span className="text-red-700">
                          <strong>เบาหวานชนิดที่ 2:</strong> เสี่ยงสูงหากไม่ควบคุมน้ำตาล
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-red-600 mr-2">🔹</span>
                        <span className="text-red-700">
                          <strong>โรคหัวใจและหลอดเลือด:</strong> จากระดับน้ำตาลสูงเรื้อรัง
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-red-600 mr-2">🔹</span>
                        <span className="text-red-700">
                          <strong>โรคไต:</strong> เสี่ยงต่อไตเสื่อมจากเบาหวาน
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-red-600 mr-2">🔹</span>
                        <span className="text-red-700">
                          <strong>ตาเสื่อม:</strong> เสี่ยงต่อจอประสาทตาเสื่อม
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-2">
                      <p className="text-yellow-800 text-xs font-medium">
                        💡 <strong>การป้องกัน:</strong> ควบคุมอาหาร ออกกำลังกายสม่ำเสมอ ตรวจสุขภาพประจำปี
                      </p>
                    </div>
                  </div>
                )}

                {trends?.trends?.bloodSugar?.diabetesRisk === 'moderate' && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mt-4">
                    <h4 className="text-yellow-800 font-bold text-sm mb-2 flex items-center">
                      <span className="text-lg mr-2">⚡</span>
                      ข้อควรระวัง
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">🔸</span>
                        <span className="text-yellow-700">
                          <strong>ความดันสูง:</strong> อาจเกิดตามมาหากไม่ดูแล
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">🔸</span>
                        <span className="text-yellow-700">
                          <strong>โรคอ้วน:</strong> เสี่ยงจากการกินหวานมากเกินไป
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Overall Health Score */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
            <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center border-b-2 border-blue-200 pb-2">
              <span className="text-2xl mr-2">🎯</span>
              คะแนนสุขภาพรวม (ข้อมูลจริง)
            </h3>
            {(() => {
              const healthScore = calculateHealthScore ? calculateHealthScore() : null;
              const healthInsights = generateHealthInsights ? generateHealthInsights() : null;
              
              return healthScore ? (
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    healthScore.score >= 80 ? 'text-green-600' : 
                    healthScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthScore.score}/100
                  </div>
                  <div className="text-lg text-blue-800 mb-2 font-semibold">
                    เกรด {healthScore.grade}
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border-2 mb-3 ${
                    healthScore.score >= 80 ? 'bg-green-50 text-green-800 border-green-400' :
                    healthScore.score >= 60 ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                    'bg-red-50 text-red-800 border-red-400'
                  }`}>
                    {healthScore.status}
                  </div>
                  
                  {/* คำอธิบายที่เข้าใจง่าย */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="text-sm text-blue-800 font-medium mb-1">
                      {healthScore.score >= 80 ? '🎉 ยอดเยี่ยม!' : 
                       healthScore.score >= 60 ? '👍 ดี!' : '⚠️ ควรปรับปรุง'}
                    </div>
                    <div className="text-xs text-blue-700">
                      {healthScore.score >= 80 ? 
                        'สุขภาพดีมาก รักษาสิ่งที่ทำอยู่ต่อไป' :
                       healthScore.score >= 60 ? 
                        'สุขภาพอยู่ในเกณฑ์ดี แต่ยังปรับปรุงได้อีก' :
                        'ควรใส่ใจสุขภาพมากขึ้น เริ่มจากการออกกำลังกายและกินผักผลไม้'}
                    </div>
                  </div>
                  
                  {/* วิธีการคิดคะแนน */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-left">
                    <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                      <span className="mr-2">📋</span>
                      วิธีการคิดคะแนน (คลิกเพื่อดูรายละเอียด)
                    </div>
                    <details className="text-xs text-gray-700">
                      <summary className="cursor-pointer hover:text-blue-600 font-medium">
                        คะแนนแบ่งเป็น 4 หมวด ๆ ละ 25 คะแนน
                      </summary>
                      <div className="mt-2 space-y-1 pl-4">
                        <div className="flex justify-between">
                          <span>💪 ดัชนีมวลกาย (BMI)</span>
                          <span className="font-medium">25 คะแนน</span>
                        </div>
                        <div className="text-xs text-gray-500 pl-4">
                          • 18.5-24.9: 25 คะแนน (ปกติ)
                          • 25-29.9: 15 คะแนน (เกิน)
                          • อื่นๆ: 5 คะแนน (ผิดปกติ)
                        </div>
                        <div className="flex justify-between">
                          <span>💗 ความดันโลหิต</span>
                          <span className="font-medium">25 คะแนน</span>
                        </div>
                        <div className="text-xs text-gray-500 pl-4">
                          • น้อยกว่า 120/80: 25 คะแนน (ปกติ)
                          • 120-139/80-89: 15 คะแนน (เฝ้าระวัง)
                          • 140/90 ขึ้นไป: 5 คะแนน (สูง)
                        </div>
                        <div className="flex justify-between">
                          <span>🍯 น้ำตาลในเลือด</span>
                          <span className="font-medium">25 คะแนน</span>
                        </div>
                        <div className="text-xs text-gray-500 pl-4">
                          • น้อยกว่า 100: 25 คะแนน (ปกติ)
                          • 100-125: 15 คะแนน (เฝ้าระวัง)
                          • 126 ขึ้นไป: 5 คะแนน (เบาหวาน)
                        </div>
                        <div className="flex justify-between">
                          <span>💓 อัตราการเต้นหัวใจ</span>
                          <span className="font-medium">25 คะแนน</span>
                        </div>
                        <div className="text-xs text-gray-500 pl-4">
                          • 60-100: 25 คะแนน (ปกติ)
                          • 50-59, 101-110: 15 คะแนน (เฝ้าระวัง)
                          • อื่นๆ: 5 คะแนน (ผิดปกติ)
                        </div>
                      </div>
                    </details>
                  </div>
                  
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    ประเมินจาก {healthScore.factors}/4 ตัวชี้วัด • ข้อมูลครบ {Math.round(healthInsights?.dataCompleteness || 0)}%
                  </div>

                  {/* แสดงปัจจัยเสี่ยง */}
                  {healthInsights && healthInsights.riskFactors > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 mb-2">
                        ⚠️ พบปัจจัยเสี่ยง {healthInsights.riskFactors} ด้าน - ควรปรึกษาแพทย์
                      </div>
                      
                      {/* รายละเอียดความเสี่ยง */}
                      <details className="text-left bg-red-50 border border-red-200 rounded p-3">
                        <summary className="cursor-pointer text-red-800 font-medium text-sm hover:text-red-600">
                          🔍 คลิกดูรายละเอียดปัจจัยเสี่ยง
                        </summary>
                        <div className="mt-2 space-y-2 text-xs">
                          {/* ตรวจสอบ BMI */}
                          {(() => {
                            const latestWeight = recentMetrics?.find(m => m.weight_kg);
                            const bmi = latestWeight && userProfile?.height_cm ? 
                              (latestWeight.weight_kg / Math.pow(userProfile.height_cm / 100, 2)) : null;
                            
                            if (bmi && (bmi < 18.5 || bmi >= 25)) {
                              return (
                                <div className="flex items-start">
                                  <span className="text-red-500 mr-2 mt-0.5">🔸</span>
                                  <div>
                                    <div className="font-medium text-red-700">
                                      ดัชนีมวลกาย (BMI: {bmi.toFixed(1)})
                                    </div>
                                    <div className="text-red-600">
                                      {bmi < 18.5 ? 'น้ำหนักต่ำ - เสี่ยงต่อการขาดสารอาหาร' :
                                       bmi >= 30 ? 'อ้วนมาก - เสี่ยงต่อโรคหัวใจ เบาหวาน' :
                                       'น้ำหนักเกิน - เสี่ยงต่อความดันสูง'}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* ตรวจสอบความดัน */}
                          {(() => {
                            const latestBP = recentMetrics?.find(m => m.systolic_bp && m.diastolic_bp);
                            if (latestBP && (latestBP.systolic_bp >= 140 || latestBP.diastolic_bp >= 90)) {
                              return (
                                <div className="flex items-start">
                                  <span className="text-red-500 mr-2 mt-0.5">🔸</span>
                                  <div>
                                    <div className="font-medium text-red-700">
                                      ความดันโลหิตสูง ({latestBP.systolic_bp}/{latestBP.diastolic_bp})
                                    </div>
                                    <div className="text-red-600">
                                      เสี่ยงต่อโรคหัวใจ โรคหลอดเลือดสมอง ไตเสื่อม
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* ตรวจสอบน้ำตาล */}
                          {(() => {
                            const latestSugar = getLatestValidValue('blood_sugar_mg');
                            if (latestSugar && latestSugar >= 126) {
                              return (
                                <div className="flex items-start">
                                  <span className="text-red-500 mr-2 mt-0.5">🔸</span>
                                  <div>
                                    <div className="font-medium text-red-700">
                                      น้ำตาลในเลือดสูง ({latestSugar} mg/dL)
                                    </div>
                                    <div className="text-red-600">
                                      เสี่ยงต่อเบาหวาน โรคหัวใจ ไตเสื่อม ตาบอด
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* ตรวจสอบอัตราการเต้นหัวใจ */}
                          {(() => {
                            const latestHR = recentMetrics?.find(m => m.heart_rate);
                            if (latestHR && (latestHR.heart_rate < 60 || latestHR.heart_rate > 100)) {
                              return (
                                <div className="flex items-start">
                                  <span className="text-red-500 mr-2 mt-0.5">🔸</span>
                                  <div>
                                    <div className="font-medium text-red-700">
                                      อัตราการเต้นหัวใจผิดปกติ ({latestHR.heart_rate} ครั้ง/นาที)
                                    </div>
                                    <div className="text-red-600">
                                      {latestHR.heart_rate < 60 ? 
                                        'เต้นช้า - อาจมีปัญหาระบบนำไฟฟ้าหัวใจ' :
                                        'เต้นเร็ว - เสี่ยงต่อหัวใจล้มเหลว'}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* ข้อแนะนำ */}
                          <div className="mt-3 pt-2 border-t border-red-300">
                            <div className="font-medium text-red-700 mb-1">💡 ข้อแนะนำ:</div>
                            <div className="text-red-600">
                              • ปรึกษาแพทย์เพื่อประเมินความเสี่ยงโดยละเอียด
                              • ตรวจสุขภาพประจำปีสม่ำเสมอ
                              • ปรับเปลี่ยนวิถีชีวิตให้ดีขึ้น
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-400 mb-2">--</div>
                  <div className="text-lg text-gray-600 mb-2 font-semibold">ไม่มีข้อมูล</div>
                  <div className="text-gray-500 text-sm">
                    กรุณากรอกข้อมูลสุขภาพเพื่อรับคะแนนประเมิน
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-blue-800 mb-2">ไม่มีข้อมูลการวิเคราะห์</h3>
          <p className="text-blue-600 mb-4 font-medium">
            กรุณาบันทึกข้อมูลสุขภาพเพิ่มเติมเพื่อดูการวิเคราะห์แนวโน้ม
          </p>
          <p className="text-blue-500 text-sm">
            ต้องมีข้อมูลอย่างน้อย 2-3 ครั้งในช่วงเวลาที่เลือก
          </p>
        </div>
      )}
    </div>
  );

  const renderPredictionsTab = () => {
    // วิเคราะห์ข้อมูลโรคประจำตัวและยา
    const medicalConditions = userProfile?.medical_conditions?.toLowerCase() || '';
    const medications = userProfile?.medications?.toLowerCase() || '';
    
    const hasHypertension = medicalConditions.includes('ความดันสูง') || 
                           medicalConditions.includes('hypertension') ||
                           medications.includes('amlodipine') || 
                           medications.includes('amlopine') ||
                           medications.includes('แอมโลดิปีน');
                           
    const hasDiabetes = medicalConditions.includes('เบาหวาน') || 
                       medicalConditions.includes('diabetes') ||
                       medications.includes('metformin') || 
                       medications.includes('เมตฟอร์มิน');
                       
    const hasHeartDisease = medicalConditions.includes('หัวใจ') || 
                           medicalConditions.includes('heart') ||
                           medicalConditions.includes('โรคหัวใจ');

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-800 mb-6">การพยากรณ์สุขภาพ (รวมข้อมูลโรคประจำตัว)</h2>
        
        {/* แสดงข้อมูลโรคประจำตัวและยา */}
        {(userProfile?.medical_conditions || userProfile?.medications) && (
          <div className="bg-amber-50 backdrop-blur-lg rounded-lg p-6 border-2 border-amber-300 shadow-lg">
            <h3 className="text-lg font-bold text-amber-800 mb-4 border-b-2 border-amber-200 pb-2 flex items-center">
              <span className="mr-2">🏥</span>
              ข้อมูลการรักษาของคุณ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userProfile?.medical_conditions && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-bold text-amber-700 mb-2 flex items-center">
                    <span className="mr-2">📋</span>
                    โรคประจำตัว
                  </h4>
                  <p className="text-amber-800 text-sm">{userProfile.medical_conditions}</p>
                  
                  {/* แสดงการวิเคราะห์โรค */}
                  <div className="mt-3 space-y-1 text-xs">
                    {hasHypertension && (
                      <div className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                        🔍 ตรวจพบ: ความดันโลหิตสูง - ติดตามความดันสม่ำเสมอ
                      </div>
                    )}
                    {hasDiabetes && (
                      <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200">
                        🔍 ตรวจพบ: เบาหวาน - ควบคุมน้ำตาลในเลือด
                      </div>
                    )}
                    {hasHeartDisease && (
                      <div className="bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-200">
                        🔍 ตรวจพบ: โรคหัวใจ - ติดตามอัตราการเต้นหัวใจ
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {userProfile?.medications && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-bold text-amber-700 mb-2 flex items-center">
                    <span className="mr-2">💊</span>
                    ยาที่ทาน
                  </h4>
                  <p className="text-amber-800 text-sm">{userProfile.medications}</p>
                  
                  {/* แสดงข้อมูลยา */}
                  <div className="mt-3 space-y-1 text-xs">
                    {medications.includes('amlodipine') || medications.includes('แอมโลดิปีน') && (
                      <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                        💊 Amlodipine - ยาลดความดัน (ระวังข้อเท้าบวม)
                      </div>
                    )}
                    {medications.includes('metformin') || medications.includes('เมตฟอร์มิน') && (
                      <div className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                        💊 Metformin - ยาเบาหวาน (ทานหลังอาหาร)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {predictions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BMI Prediction with Medical Context */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-emerald-300 shadow-lg">
              <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b-2 border-emerald-200 pb-2">พยากรณ์ BMI (6 เดือนข้างหน้า)</h3>
              {predictions.bmi?.prediction !== 'insufficient_data' ? (
                <div>
                  <div className="text-2xl font-bold text-emerald-900 mb-2">
                    {predictions.bmi.prediction || '--'}
                  </div>
                  <p className="text-emerald-700 text-sm font-medium mb-3">{predictions.bmi.recommendation || 'ไม่มีคำแนะนำ'}</p>
                  
                  {/* คำแนะนำเฉพาะโรค */}
                  {(hasHypertension || hasDiabetes || hasHeartDisease) && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs">
                      <div className="font-bold text-emerald-800 mb-1">🏥 คำแนะนำพิเศษสำหรับโรคของคุณ:</div>
                      {hasHypertension && (
                        <div className="text-emerald-700 mb-1">• ควบคุมน้ำหนักช่วยลดความดันโลหิต</div>
                      )}
                      {hasDiabetes && (
                        <div className="text-emerald-700 mb-1">• น้ำหนักเหมาะสมช่วยควบคุมน้ำตาลได้ดีขึ้น</div>
                      )}
                      {hasHeartDisease && (
                        <div className="text-emerald-700">• น้ำหนักปกติลดภาระหัวใจ</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
              )}
            </div>

            {/* Blood Pressure Prediction with Medical Context */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-red-300 shadow-lg">
              <h3 className="text-lg font-bold text-red-800 mb-4 border-b-2 border-red-200 pb-2">พยากรณ์ความดันโลหิต</h3>
              {predictions.bloodPressure?.prediction !== 'insufficient_data' ? (
                <div>
                  <div className="text-xl font-bold text-red-900 mb-2">
                    {predictions.bloodPressure.prediction?.systolic || '--'}/
                    {predictions.bloodPressure.prediction?.diastolic || '--'}
                  </div>
                  <div className="text-sm text-red-700 mb-2 font-medium">
                    ระดับความเสี่ยง: {predictions.bloodPressure.riskLevel === 'high' ? 'สูง' : 'ปานกลาง'}
                  </div>
                  <p className="text-red-700 text-sm font-medium mb-3">{predictions.bloodPressure.recommendation || 'ไม่มีคำแนะนำ'}</p>
                  
                  {/* คำแนะนำเฉพาะสำหรับผู้ป่วยความดันสูง */}
                  {hasHypertension && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-xs">
                      <div className="font-bold text-red-800 mb-1">🏥 สำหรับผู้ป่วยความดันสูง:</div>
                      <div className="text-red-700 space-y-1">
                        <div>• ทานยาตามเวลาที่แพทย์กำหนด</div>
                        <div>• วัดความดันวันละ 2 ครั้ง (เช้า-เย็น)</div>
                        <div>• หลีกเลี่ยงอาหารเค็ม น้ำตาลสูง</div>
                        {medications.includes('amlodipine') && (
                          <div>• ระวังข้อเท้าบวมจากยา Amlodipine</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
              )}
            </div>

            {/* Enhanced Diabetes Risk with Medical Context */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-amber-300 shadow-lg">
              <h3 className="text-lg font-bold text-amber-800 mb-4 border-b-2 border-amber-200 pb-2 flex items-center">
                <span className="mr-2">🍯</span>
                ความเสี่ยงเบาหวาน
                <span className="ml-2 text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded">(ในอนาคต)</span>
              </h3>
              {predictions.diabetesRisk?.prediction !== 'insufficient_data' ? (
                <div>
                  <div className="text-2xl font-bold text-amber-900 mb-2">
                    {predictions.diabetesRisk.riskPercentage || '--'}
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm mb-3">
                    <div className="font-medium text-gray-700 mb-1">🔍 หมายความว่า:</div>
                    <div className="text-gray-600">
                      ตัวเลขนี้แสดงโอกาสที่คุณอาจเป็นเบาหวานในอนาคต ยิ่งต่ำยิ่งดี
                    </div>
                  </div>
                  <p className="text-amber-700 text-sm font-medium mb-3">{predictions.diabetesRisk.recommendation || 'ไม่มีคำแนะนำ'}</p>
                  
                  {/* คำแนะนำเฉพาะสำหรับผู้ป่วยเบาหวาน */}
                  {hasDiabetes && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs">
                      <div className="font-bold text-amber-800 mb-1">🏥 สำหรับผู้ป่วยเบาหวาน:</div>
                      <div className="text-amber-700 space-y-1">
                        <div>• ตรวจน้ำตาลก่อนอาหารและหลังอาหาร 2 ชม.</div>
                        <div>• ทานยาเบาหวานตามเวลา หลังอาหาร</div>
                        <div>• หลีกเลี่ยงขนมหวาน อาหารแป้ง</div>
                        <div>• ตรวจ HbA1c ทุก 3 เดือน</div>
                        {medications.includes('metformin') && (
                          <div>• Metformin ช่วยควบคุมน้ำตาล ทานหลังอาหาร</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการประเมิน</p>
              )}
            </div>

            {/* Overall Health Prediction with Medical Context */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2 flex items-center">
                <span className="mr-2">📈</span>
                แนวโน้มสุขภาพโดยรวม
                <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">(6 เดือนข้างหน้า)</span>
              </h3>
              <div>
                <div className={`text-2xl font-bold mb-2 ${
                  predictions.overallHealth?.prediction === 'improving' ? 'text-green-800' :
                  predictions.overallHealth?.prediction === 'stable' ? 'text-blue-800' :
                  'text-red-800'
                }`}>
                  {predictions.overallHealth?.prediction === 'improving' ? '📈 ดีขึ้น' :
                   predictions.overallHealth?.prediction === 'stable' ? '➡️ คงที่' : 
                   predictions.overallHealth?.prediction === 'declining' ? '📉 แย่ลง' : '--'}
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm mb-3">
                  <div className="font-medium text-gray-700 mb-1">🔍 หมายความว่า:</div>
                  <div className="text-gray-600">
                    {predictions.overallHealth?.prediction === 'improving' ? 
                      'สุขภาพของคุณมีแนวโน้มดีขึ้น ถ้าคุณรักษาพฤติกรรมดีๆ ต่อไป' :
                     predictions.overallHealth?.prediction === 'stable' ? 
                      'สุขภาพจะคงที่ ควรพยายามปรับปรุงให้ดีขึ้น' : 
                      'สุขภาพอาจแย่ลง ควรเปลี่ยนพฤติกรรมเร่งด่วน'}
                  </div>
                </div>
                <p className="text-blue-700 text-sm font-medium mb-3">{predictions.overallHealth?.recommendation || 'ไม่มีคำแนะนำ'}</p>
                
                {/* คำแนะนำเฉพาะโรค */}
                {(hasHypertension || hasDiabetes || hasHeartDisease) && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                    <div className="font-bold text-blue-800 mb-1">🏥 ติดตามพิเศษสำหรับโรคของคุณ:</div>
                    <div className="text-blue-700 space-y-1">
                      {hasHypertension && (
                        <div>• ความดันโลหิต: เป้าหมาย น้อยกว่า 130/80</div>
                      )}
                      {hasDiabetes && (
                        <div>• น้ำตาลในเลือด: เป้าหมาย 80-130 mg/dL (ก่อนอาหาร)</div>
                      )}
                      {hasHeartDisease && (
                        <div>• อัตราการเต้นหัวใจ: เป้าหมาย 60-100 ครั้ง/นาที</div>
                      )}
                      <div className="mt-2 pt-2 border-t border-blue-300">
                        <div>📅 นัดตรวจติดตามสม่ำเสมอทุก 3-6 เดือน</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">ไม่มีข้อมูลการพยากรณ์</h3>
            <p className="text-blue-600 font-medium">กรุณาบันทึกข้อมูลสุขภาพเพิ่มเติมเพื่อรับการพยากรณ์</p>
            {(userProfile?.medical_conditions || userProfile?.medications) && (
              <p className="text-blue-500 text-sm mt-2">
                💡 เนื่องจากคุณมีโรคประจำตัว การพยากรณ์จะแม่นยำยิ่งขึ้นเมื่อมีข้อมูลสุขภาพเพิ่มเติม
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderInsightsTab = () => {
    const healthInsights = generateHealthInsights ? generateHealthInsights() : null;
    
    // วิเคราะห์ข้อมูลโรคประจำตัวและยา
    const medicalConditions = userProfile?.medical_conditions?.toLowerCase() || '';
    const medications = userProfile?.medications?.toLowerCase() || '';
    
    const hasHypertension = medicalConditions.includes('ความดันสูง') || 
                           medicalConditions.includes('hypertension') ||
                           medications.includes('amlodipine') || 
                           medications.includes('amlopine') ||
                           medications.includes('แอมโลดิปีน');
                           
    const hasDiabetes = medicalConditions.includes('เบาหวาน') || 
                       medicalConditions.includes('diabetes') ||
                       medications.includes('metformin') || 
                       medications.includes('เมตฟอร์มิน');
                       
    const hasHeartDisease = medicalConditions.includes('หัวใจ') || 
                           medicalConditions.includes('heart') ||
                           medicalConditions.includes('โรคหัวใจ');

    // สร้างข้อมูลเชิงลึกเฉพาะโรค
    const generateMedicalInsights = () => {
      const insights = [];
      
      if (hasHypertension) {
        // วิเคราะห์ความดันล่าสุด
        const latestSystolic = getLatestValidValue('systolic_bp');
        const latestDiastolic = getLatestValidValue('diastolic_bp');
        if (latestSystolic && latestDiastolic) {
          if (latestSystolic >= 140 || latestDiastolic >= 90) {
            insights.push({
              type: 'warning',
              condition: 'ความดันสูง',
              message: `ความดันปัจจุบัน ${latestSystolic}/${latestDiastolic} สูงกว่าเป้าหมาย (<130/80)`,
              advice: 'ควรปรับยาหรือปรึกษาแพทย์'
            });
          } else {
            insights.push({
              type: 'good',
              condition: 'ความดันสูง',
              message: `ความดันปัจจุบัน ${latestSystolic}/${latestDiastolic} ควบคุมได้ดี`,
              advice: 'รักษาการทานยาและวิถีชีวิตดี ๆ ต่อไป'
            });
          }
        }
      }
      
      if (hasDiabetes) {
        // วิเคราะห์น้ำตาลล่าสุด
        const latestSugar = getLatestValidValue('blood_sugar_mg');
        if (latestSugar) {
          if (latestSugar >= 130) {
            insights.push({
              type: 'warning',
              condition: 'เบาหวาน',
              message: `น้ำตาลในเลือด ${latestSugar} mg/dL สูงกว่าเป้าหมาย (80-130)`,
              advice: 'ควรปรับอาหารและการทานยา'
            });
          } else if (latestSugar < 80) {
            insights.push({
              type: 'warning',
              condition: 'เบาหวาน',
              message: `น้ำตาลในเลือด ${latestSugar} mg/dL ต่ำเกินไป`,
              advice: 'ระวังน้ำตาลต่ำ ควรรับประทานอาหารเพิ่ม'
            });
          } else {
            insights.push({
              type: 'good',
              condition: 'เบาหวาน',
              message: `น้ำตาลในเลือด ${latestSugar} mg/dL อยู่ในเป้าหมาย`,
              advice: 'ควบคุมได้ดี รักษาระบบการทานยาต่อไป'
            });
          }
        }
      }
      
      if (hasHeartDisease) {
        // วิเคราะห์อัตราการเต้นหัวใจ
        const latestHR = recentMetrics?.find(m => m.heart_rate);
        if (latestHR) {
          if (latestHR.heart_rate < 60) {
            insights.push({
              type: 'info',
              condition: 'โรคหัวใจ',
              message: `อัตราการเต้นหัวใจ ${latestHR.heart_rate} ครั้ง/นาที ช้ากว่าปกติ`,
              advice: 'ควรติดตามอาการและปรึกษาแพทย์'
            });
          } else if (latestHR.heart_rate > 100) {
            insights.push({
              type: 'warning',
              condition: 'โรคหัวใจ',
              message: `อัตราการเต้นหัวใจ ${latestHR.heart_rate} ครั้ง/นาที เร็วกว่าปกติ`,
              advice: 'ควรพักผ่อนและหลีกเลี่ยงความเครียด'
            });
          } else {
            insights.push({
              type: 'good',
              condition: 'โรคหัวใจ',
              message: `อัตราการเต้นหัวใจ ${latestHR.heart_rate} ครั้ง/นาที อยู่ในเกณฑ์ปกติ`,
              advice: 'สุขภาพหัวใจดี รักษาต่อไป'
            });
          }
        }
      }
      
      return insights;
    };

    const medicalInsights = generateMedicalInsights();
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-800 mb-6">ข้อมูลเชิงลึกสุขภาพ (รวมข้อมูลโรคประจำตัว)</h2>
        
        {healthInsights ? (
          <div className="space-y-6">
            {/* Health Score Summary */}
            <div className="bg-blue-50 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2">
                <span className="mr-2">📊</span>
                สรุปคะแนนสุขภาพ
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    healthInsights.score >= 80 ? 'text-green-600' : 
                    healthInsights.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthInsights.score}/100
                  </div>
                  <div className="text-sm text-blue-700">คะแนนรวม</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800">{healthInsights.grade}</div>
                  <div className="text-sm text-blue-700">เกรด</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{healthInsights.riskFactors}</div>
                  <div className="text-sm text-blue-700">ปัจจัยเสี่ยง</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(healthInsights.dataCompleteness)}%</div>
                  <div className="text-sm text-blue-700">ความครบถ้วน</div>
                </div>
              </div>
            </div>

            {/* Medical Condition-Specific Insights */}
            {medicalInsights.length > 0 && (
              <div className="bg-purple-50 backdrop-blur-lg rounded-lg p-6 border-2 border-purple-300 shadow-lg">
                <h3 className="text-lg font-bold text-purple-800 mb-4 border-b-2 border-purple-200 pb-2">
                  <span className="mr-2">🏥</span>
                  ข้อมูลเชิงลึกเฉพาะโรคของคุณ
                </h3>
                <div className="space-y-4">
                  {medicalInsights.map((insight, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      insight.type === 'warning' ? 'bg-red-50 border-red-200' :
                      insight.type === 'good' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start">
                        <span className="mr-3 mt-0.5">
                          {insight.type === 'warning' ? '⚠️' : 
                           insight.type === 'good' ? '✅' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <div className={`font-bold mb-1 ${
                            insight.type === 'warning' ? 'text-red-800' :
                            insight.type === 'good' ? 'text-green-800' :
                            'text-blue-800'
                          }`}>
                            {insight.condition}
                          </div>
                          <div className={`text-sm mb-2 ${
                            insight.type === 'warning' ? 'text-red-700' :
                            insight.type === 'good' ? 'text-green-700' :
                            'text-blue-700'
                          }`}>
                            {insight.message}
                          </div>
                          <div className={`text-xs font-medium ${
                            insight.type === 'warning' ? 'text-red-600' :
                            insight.type === 'good' ? 'text-green-600' :
                            'text-blue-600'
                          }`}>
                            💡 {insight.advice}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Health Insights */}
            {healthInsights.insights && healthInsights.insights.length > 0 && (
              <div className="bg-red-50 backdrop-blur-lg rounded-lg p-6 border-2 border-red-300 shadow-lg">
                <h3 className="text-lg font-bold text-red-800 mb-4 border-b-2 border-red-200 pb-2">
                  <span className="mr-2">⚠️</span>
                  ประเด็นทั่วไปที่ควรให้ความสำคัญ
                </h3>
                <div className="space-y-3">
                  {healthInsights.insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-white rounded-lg border-2 border-red-200">
                      <div className="text-red-800 font-medium">{insight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Recommendations with Medical Context */}
            <div className="bg-green-50 backdrop-blur-lg rounded-lg p-6 border-2 border-green-300 shadow-lg">
              <h3 className="text-lg font-bold text-green-800 mb-4 border-b-2 border-green-200 pb-2">
                <span className="mr-2">💡</span>
                คำแนะนำเฉพาะบุคคล (รวมข้อมูลโรคประจำตัว)
              </h3>
              <div className="space-y-4">
                {/* Medical-Specific Recommendations */}
                {(hasHypertension || hasDiabetes || hasHeartDisease) && (
                  <div className="p-4 bg-white rounded-lg border-2 border-indigo-200">
                    <h4 className="font-bold text-indigo-800 mb-3 flex items-center">
                      <span className="mr-2">🏥</span>
                      คำแนะนำเฉพาะโรคประจำตัว
                    </h4>
                    <div className="space-y-3">
                      {hasHypertension && (
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <div className="font-medium text-red-800 mb-1">ความดันโลหิตสูง</div>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• ทานยาตามเวลาที่แพทย์กำหนดเสมอ</li>
                            <li>• วัดความดัน 2 ครั้ง/วัน บันทึกผล</li>
                            <li>• หลีกเลี่ยงอาหารเค็ม น้ำตาลสูง เครื่องดื่มแอลกอฮอล์</li>
                            <li>• ออกกำลังกายแบบแอโรบิก 30 นาที/วัน</li>
                            {medications.includes('amlodipine') && (
                              <li>• ระวังข้อเท้าบวมจาก Amlodipine หากมีอาการรุนแรงแจ้งแพทย์</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {hasDiabetes && (
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                          <div className="font-medium text-yellow-800 mb-1">เบาหวาน</div>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• ตรวจน้ำตาลก่อนอาหาร (เป้าหมาย 80-130 mg/dL)</li>
                            <li>• ทานยาเบาหวานหลังอาหารเสมอ</li>
                            <li>• กินอาหารตามเวลา หลีกเลี่ยงขนมหวาน</li>
                            <li>• ตรวจ HbA1c ทุก 3 เดือน (เป้าหมาย น้อยกว่า 7%)</li>
                            <li>• ดูแลเท้า ตรวจสายตาประจำปี</li>
                            {medications.includes('metformin') && (
                              <li>• Metformin ช่วยควบคุมน้ำตาล ทานหลังอาหารเพื่อลดผลข้างเคียง</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {hasHeartDisease && (
                        <div className="bg-pink-50 p-3 rounded border border-pink-200">
                          <div className="font-medium text-pink-800 mb-1">โรคหัวใจ</div>
                          <ul className="text-pink-700 text-sm space-y-1">
                            <li>• ติดตามอัตราการเต้นหัวใจสม่ำเสมอ</li>
                            <li>• หลีกเลี่ยงกิจกรรมหนักเกินไป หากมีอาการเจ็บหน้าอกหยุดทันที</li>
                            <li>• ลดเกลือ ไขมันอิ่มตัว เพิ่มผักผลไม้</li>
                            <li>• นัดตรวจติดตามกับแพทย์หัวใจตามกำหนด</li>
                            <li>• เตรียมยาแก้เจ็บหน้าอกฉุกเฉินติดตัวเสมอ</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* General Recommendations */}
                {healthInsights.recommendations?.diet && healthInsights.recommendations.diet.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center">
                      <span className="mr-2">🍎</span>
                      อาหาร
                      {(hasHypertension || hasDiabetes) && (
                        <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                          ปรับแต่งสำหรับโรคของคุณ
                        </span>
                      )}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-green-700 text-sm font-medium">
                      {healthInsights.recommendations.diet.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {healthInsights.recommendations?.exercise && healthInsights.recommendations.exercise.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center">
                      <span className="mr-2">🏃‍♂️</span>
                      การออกกำลังกาย
                      {(hasHeartDisease || hasHypertension) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          ปรับแต่งสำหรับโรคของคุณ
                        </span>
                      )}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm font-medium">
                      {healthInsights.recommendations.exercise.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                    {(hasHeartDisease || hasHypertension) && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
                        ⚠️ หยุดออกกำลังกายทันทีหากมีอาการเจ็บหน้าอก เหนื่อยผิดปกติ หรือใจสั่น
                      </div>
                    )}
                  </div>
                )}
                
                {healthInsights.recommendations?.lifestyle && healthInsights.recommendations.lifestyle.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                    <h4 className="font-bold text-purple-800 mb-2 flex items-center">
                      <span className="mr-2">🌱</span>
                      วิถีชีวิต
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-purple-700 text-sm font-medium">
                      {healthInsights.recommendations.lifestyle.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {healthInsights.recommendations?.medical && healthInsights.recommendations.medical.length > 0 && (
                  <div className="p-4 bg-white rounded-lg border-2 border-red-200">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center">
                      <span className="mr-2">🏥</span>
                      การรักษาพยาบาล
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-red-700 text-sm font-medium">
                      {healthInsights.recommendations.medical.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Medication Monitoring */}
            {userProfile?.medications && (
              <div className="bg-orange-50 backdrop-blur-lg rounded-lg p-6 border-2 border-orange-300 shadow-lg">
                <h3 className="text-lg font-bold text-orange-800 mb-4 border-b-2 border-orange-200 pb-2">
                  <span className="mr-2">💊</span>
                  การติดตามผลข้างเคียงยา
                </h3>
                <div className="space-y-3">
                  {medications.includes('amlodipine') && (
                    <div className="p-3 bg-white rounded border border-orange-200">
                      <div className="font-medium text-orange-800 mb-1">Amlodipine (ยาลดความดัน)</div>
                      <div className="text-orange-700 text-sm">
                        <div className="mb-1">🔍 ติดตามอาการ: ข้อเท้าบวม, วิงเวียน, ใจสั่น</div>
                        <div>💡 คำแนะนำ: ทานก่อนอาหาร ดื่มน้ำเพียงพอ หากบวมมากแจ้งแพทย์</div>
                      </div>
                    </div>
                  )}
                  
                  {medications.includes('metformin') && (
                    <div className="p-3 bg-white rounded border border-orange-200">
                      <div className="font-medium text-orange-800 mb-1">Metformin (ยาเบาหวาน)</div>
                      <div className="text-orange-700 text-sm">
                        <div className="mb-1">🔍 ติดตามอาการ: ท้องเสีย, คลื่นไส้, ปวดท้อง</div>
                        <div>💡 คำแนะนำ: ทานหลังอาหาร ดื่มน้ำมาก หากอาการรุนแรงแจ้งแพทย์</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">ไม่มีข้อมูลเชิงลึก</h3>
            <p className="text-blue-600 font-medium">กรุณาบันทึกข้อมูลสุขภาพเพิ่มเติมเพื่อรับข้อมูลเชิงลึก</p>
            <p className="text-blue-500 text-sm mt-2">ต้องมีข้อมูลอย่างน้อย BMI, ความดันโลหิต, น้ำตาลในเลือด หรืออัตราการเต้นหัวใจ</p>
            {(userProfile?.medical_conditions || userProfile?.medications) && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm font-medium">
                  💡 ข้อมูลโรคประจำตัวและยาของคุณพร้อมแล้ว<br/>
                  เมื่อเพิ่มข้อมูลสุขภาพ จะได้รับคำแนะนำเฉพาะโรคที่แม่นยำยิ่งขึ้น
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // เพิ่มฟังก์ชันใหม่สำหรับแสดงผลการตรวจเลือด
  const renderLaboratoryTab = () => {
    // ใช้ getLatestValidValue เพื่อดึงค่าล่าสุดที่ไม่เป็น null
    const latestMetrics = {
      uric_acid: getLatestValidValue('uric_acid'),
      alt: getLatestValidValue('alt'),
      ast: getLatestValidValue('ast'),
      hemoglobin: getLatestValidValue('hemoglobin'),
      hematocrit: getLatestValidValue('hematocrit'),
      iron: getLatestValidValue('iron'),
      tibc: getLatestValidValue('tibc')
    };
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-blue-800 mb-2">🧪 การตรวจเลือดครบถ้วน</h3>
          <p className="text-blue-600">วิเคราะห์ค่าตรวจเลือดเพิ่มเติมเพื่อการดูแลสุขภาพที่ครอบคลุม</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* กรดยูริก */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-yellow-300 shadow-lg">
            <h4 className="text-lg font-bold text-yellow-800 mb-4 flex items-center border-b-2 border-yellow-200 pb-2">
              <span className="text-2xl mr-2">💎</span>
              กรดยูริก (Uric Acid)
            </h4>
            {(() => {
              const status = getUricAcidStatus(latestMetrics.uric_acid);
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-yellow-700 font-medium">ค่าปัจจุบัน</span>
                    <span className="text-2xl font-bold text-yellow-900">
                      {latestMetrics.uric_acid ? `${latestMetrics.uric_acid} mg/dL` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-yellow-700 font-medium">สถานะ</span>
                    <div className="flex items-center">
                      <span className="mr-1">{status.emoji}</span>
                      <span className={`font-semibold ${status.color}`}>{status.status}</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <div className="text-xs text-yellow-700">
                      <strong>ค่าปกติ:</strong> 2.5-6.0 mg/dL<br/>
                      <strong>หมายเหตุ:</strong> ค่าสูงเสี่ยงโรคเก๊าต์
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* การทำงานของตับ */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-orange-300 shadow-lg">
            <h4 className="text-lg font-bold text-orange-800 mb-4 flex items-center border-b-2 border-orange-200 pb-2">
              <span className="text-2xl mr-2">🫁</span>
              การทำงานตับ (Liver)
            </h4>
            {(() => {
              const status = getLiverFunctionStatus(latestMetrics.alt, latestMetrics.ast);
              return (
                <div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-orange-700 font-medium">ALT</span>
                      <span className="text-lg font-bold text-orange-900">
                        {latestMetrics.alt ? `${latestMetrics.alt} U/L` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-700 font-medium">AST</span>
                      <span className="text-lg font-bold text-orange-900">
                        {latestMetrics.ast ? `${latestMetrics.ast} U/L` : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-orange-700 font-medium">สถานะ</span>
                    <div className="flex items-center">
                      <span className="mr-1">{status.emoji}</span>
                      <span className={`font-semibold ${status.color}`}>{status.status}</span>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <div className="text-xs text-orange-700">
                      <strong>ค่าปกติ:</strong> ALT ≤40, AST ≤40 U/L<br/>
                      <strong>หมายเหตุ:</strong> ตรวจสอบการทำงานของตับ
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ฮีโมโกลบิน */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-red-300 shadow-lg">
            <h4 className="text-lg font-bold text-red-800 mb-4 flex items-center border-b-2 border-red-200 pb-2">
              <span className="text-2xl mr-2">🩸</span>
              ฮีโมโกลบิน (Hemoglobin)
            </h4>
            {(() => {
              const status = getHemoglobinStatus(latestMetrics.hemoglobin, userProfile?.gender);
              return (
                <div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-700 font-medium">Hb</span>
                      <span className="text-lg font-bold text-red-900">
                        {latestMetrics.hemoglobin ? `${latestMetrics.hemoglobin} g/dL` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-red-700 font-medium">Hct</span>
                      <span className="text-lg font-bold text-red-900">
                        {latestMetrics.hematocrit ? `${latestMetrics.hematocrit}%` : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-red-700 font-medium">สถานะ</span>
                    <div className="flex items-center">
                      <span className="mr-1">{status.emoji}</span>
                      <span className={`font-semibold ${status.color}`}>{status.status}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <div className="text-xs text-red-700">
                      <strong>ค่าปกติชาย:</strong> 13.5-17.5 g/dL<br/>
                      <strong>ค่าปกติหญิง:</strong> 12.0-15.5 g/dL<br/>
                      <strong>หมายเหตุ:</strong> ตรวจสอบโลหิตจาง
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ธาตุเหล็ก */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-gray-300 shadow-lg">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b-2 border-gray-200 pb-2">
              <span className="text-2xl mr-2">🔗</span>
              ธาตุเหล็ก (Iron)
            </h4>
            {(() => {
              const status = getIronStatus(latestMetrics.iron, latestMetrics.tibc);
              return (
                <div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Iron</span>
                      <span className="text-lg font-bold text-gray-900">
                        {latestMetrics.iron ? `${latestMetrics.iron} μg/dL` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">TIBC</span>
                      <span className="text-lg font-bold text-gray-900">
                        {latestMetrics.tibc ? `${latestMetrics.tibc} μg/dL` : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-700 font-medium">สถานะ</span>
                    <div className="flex items-center">
                      <span className="mr-1">{status.emoji}</span>
                      <span className={`font-semibold ${status.color}`}>{status.status}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-700">
                      <strong>ค่าปกติ:</strong> Iron 60-170 μg/dL<br/>
                      <strong>TIBC:</strong> 250-450 μg/dL<br/>
                      <strong>หมายเหตุ:</strong> ตรวจสอบการขาดธาตุเหล็ก
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* สรุปภาพรวมการตรวจเลือด */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            สรุปผลการตรวจเลือดครบถ้วน
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-700 mb-2">✅ ค่าที่ปกติ</h4>
              <div className="text-sm text-blue-600 space-y-1">
                {latestMetrics.uric_acid && getUricAcidStatus(latestMetrics.uric_acid).status === 'ปกติ' && 
                  <div>• กรดยูริก: ปกติ</div>}
                {(latestMetrics.alt && latestMetrics.ast) && 
                 getLiverFunctionStatus(latestMetrics.alt, latestMetrics.ast).status === 'ปกติ' && 
                  <div>• การทำงานตับ: ปกติ</div>}
                {latestMetrics.hemoglobin && 
                 getHemoglobinStatus(latestMetrics.hemoglobin, userProfile?.gender).status === 'ปกติ' && 
                  <div>• ฮีโมโกลบิน: ปกติ</div>}
                {(latestMetrics.iron && latestMetrics.tibc) && 
                 getIronStatus(latestMetrics.iron, latestMetrics.tibc).status === 'ปกติ' && 
                  <div>• ธาตุเหล็ก: ปกติ</div>}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-700 mb-2">⚠️ ค่าที่ต้องติดตาม</h4>
              <div className="text-sm text-red-600 space-y-1">
                {latestMetrics.uric_acid && getUricAcidStatus(latestMetrics.uric_acid).status !== 'ปกติ' && 
                  <div>• กรดยูริก: {getUricAcidStatus(latestMetrics.uric_acid).status}</div>}
                {(latestMetrics.alt && latestMetrics.ast) && 
                 getLiverFunctionStatus(latestMetrics.alt, latestMetrics.ast).status !== 'ปกติ' && 
                  <div>• การทำงานตับ: {getLiverFunctionStatus(latestMetrics.alt, latestMetrics.ast).status}</div>}
                {latestMetrics.hemoglobin && 
                 getHemoglobinStatus(latestMetrics.hemoglobin, userProfile?.gender).status !== 'ปกติ' && 
                  <div>• ฮีโมโกลบิน: {getHemoglobinStatus(latestMetrics.hemoglobin, userProfile?.gender).status}</div>}
                {(latestMetrics.iron && latestMetrics.tibc) && 
                 getIronStatus(latestMetrics.iron, latestMetrics.tibc).status !== 'ปกติ' && 
                  <div>• ธาตุเหล็ก: {getIronStatus(latestMetrics.iron, latestMetrics.tibc).status}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-blue-800 text-xl font-medium">กำลังวิเคราะห์ข้อมูลสุขภาพ...รอประมาณ 8-9 วินาที</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-blue-800 mb-2">การวิเคราะห์สุขภาพด้วย AI</h1>
              <p className="text-blue-600 mb-2">วิเคราะห์แนวโน้มสุขภาพและรับคำแนะนำเฉพาะบุคคล</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="text-blue-800 font-medium mb-1">💡 คำอธิบาย:</div>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li>• <strong>ความเสี่ยงต่ำ</strong> = ค่าอยู่ในเกณฑ์ปกติ ไม่มีอันตราย</li>
                  <li>• <strong>แนวโน้มคงที่</strong> = ค่าไม่เปลี่ยนแปลงมาก เสถียร</li>
                  <li>• <strong>แนวโน้มเพิ่มขึ้น</strong> = ค่าสูงขึ้นกว่าเดิม ควรระวัง</li>
                  <li>• <strong>แนวโน้มลดลง</strong> = ค่าลดลงจากเดิม (อาจดีหรือไม่ดีขึ้นอยู่กับค่า)</li>
                </ul>
              </div>
            </div>
            
            {/* Status Tags */}
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border-2 flex items-center ${
                apiStatus.connected ? 
                'bg-green-50 text-green-800 border-green-300' : 
                'bg-yellow-50 text-yellow-800 border-yellow-300'
              }`}>
                <span className="mr-1">{apiStatus.connected ? '🟢' : '�'}</span>
                {apiStatus.connected ? 'API เชื่อมต่อแล้ว' : 'โหมด Demo'}
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border-2 flex items-center ${
                apiStatus.aiActive ? 
                'bg-purple-50 text-purple-800 border-purple-300' : 
                'bg-gray-50 text-gray-800 border-gray-300'
              }`}>
                <span className="mr-1">{apiStatus.aiActive ? '🤖' : '🔇'}</span>
                AI {apiStatus.aiActive ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้'}
              </div>
              
              {getCurrentBMI && getCurrentBMI() && (
                <div className="px-3 py-1 rounded-full text-sm font-semibold border-2 bg-blue-50 text-blue-800 border-blue-300 flex items-center">
                  <span className="mr-1">📊</span>
                  BMI: {getCurrentBMI().toFixed(1)}
                </div>
              )}
              
              <div className={`px-3 py-1 rounded-full text-sm font-semibold border-2 flex items-center ${
                user && localStorage.getItem('healthToken') ? 
                'bg-emerald-50 text-emerald-800 border-emerald-300' : 
                'bg-red-50 text-red-800 border-red-300'
              }`}>
                <span className="mr-1">{user && localStorage.getItem('healthToken') ? '🔐' : '🔓'}</span>
                {user && localStorage.getItem('healthToken') ? 'ยืนยันตัวตน' : 'ไม่ได้ยืนยัน'}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Debug Panel */}
        <div className="mb-6 p-4 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
          <div className="text-sm text-blue-800 mb-3 font-semibold flex items-center">
            <span className="mr-2">🔧</span>
            สถานะระบบและข้อมูล (Real-time Analysis)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-blue-700 font-medium mb-1">ผู้ใช้งาน</div>
              <div className="text-blue-900 font-semibold">{user ? user.username : 'ไม่ได้เข้าสู่ระบบ'}</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <div className="text-emerald-700 font-medium mb-1">Token API</div>
              <div className="text-emerald-900 font-semibold">{localStorage.getItem('healthToken') ? 'มีอยู่' : 'ไม่มี'}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="text-purple-700 font-medium mb-1">ข้อมูล AI</div>
              <div className="text-purple-900 font-semibold">{trends ? 'โหลดแล้ว' : 'ไม่มีข้อมูล'}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="text-amber-700 font-medium mb-1">ช่วงเวลา</div>
              <div className="text-amber-900 font-semibold">
                {selectedTimeRange === '1month' ? '1 เดือน' : 
                 selectedTimeRange === '3months' ? '3 เดือน' :
                 selectedTimeRange === '6months' ? '6 เดือน' : '1 ปี'}
              </div>
            </div>
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
              <div className="text-rose-700 font-medium mb-1">BMI ปัจจุบัน</div>
              <div className="text-rose-900 font-semibold">
                {getCurrentBMI && getCurrentBMI() ? getCurrentBMI().toFixed(1) : 'ไม่มีข้อมูล'}
              </div>
            </div>
            <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
              <div className="text-cyan-700 font-medium mb-1">ข้อมูลล่าสุด</div>
              <div className="text-cyan-900 font-semibold">
                {recentMetrics && recentMetrics.length > 0 ? `${recentMetrics.length} รายการ` : 'ไม่มี'}
              </div>
            </div>
          </div>
          
          {/* Real-time Health Score Display */}
          {(() => {
            const healthScore = calculateHealthScore ? calculateHealthScore() : null;
            return healthScore && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-300">
                <div className="text-sm font-semibold text-blue-800 mb-2">⚡ คะแนนสุขภาพแบบ Real-time</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      healthScore.score >= 80 ? 'text-green-600' : 
                      healthScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {healthScore.score}/100
                    </div>
                    <div className="text-blue-700">คะแนน</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-800">{healthScore.grade}</div>
                    <div className="text-blue-700">เกรด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{healthScore.factors}</div>
                    <div className="text-blue-700">ตัวชี้วัด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{healthScore.status}</div>
                    <div className="text-blue-700">สถานะ</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/90 backdrop-blur-lg rounded-lg p-1 border-2 border-blue-200 shadow-lg">
          {[
            { id: 'trends', label: '📈 แนวโน้ม', icon: '📈' },
            { id: 'predictions', label: '🔮 การพยากรณ์', icon: '🔮' },
            { id: 'insights', label: '💡 ข้อมูลเชิงลึก', icon: '💡' },
            { id: 'laboratory', label: '🧪 การตรวจเลือด', icon: '🧪' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-500'
                  : 'text-blue-700 hover:bg-blue-50 border-2 border-transparent'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'predictions' && renderPredictionsTab()}
          {activeTab === 'insights' && renderInsightsTab()}
          {activeTab === 'laboratory' && renderLaboratoryTab()}
        </div>

        {/* Health Education Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center">
            <span className="mr-2">📚</span>
            รู้จักตัวเลขสุขภาพ (สำหรับมือใหม่)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-700 mb-2 flex items-center">
                <span className="mr-1">💓</span>
                ความดันโลหิต
              </h4>
              <ul className="text-purple-600 space-y-1">
                <li>• <strong>ปกติ:</strong> น้อยกว่า 120/80</li>
                <li>• <strong>เสี่ยง:</strong> 120-139/80-89</li>
                <li>• <strong>สูง:</strong> 140/90 ขึ้นไป</li>
                <li className="text-xs text-gray-600 mt-2">💡 ตัวเลขแรก = ขณะหัวใจบีบ, ตัวเลขหลัง = ขณะหัวใจคลาย</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-700 mb-2 flex items-center">
                <span className="mr-1">⚖️</span>
                BMI (ดัชนีมวลกาย)
              </h4>
              <ul className="text-purple-600 space-y-1">
                <li>• <strong>ผอม:</strong> น้อยกว่า 18.5</li>
                <li>• <strong>ปกติ:</strong> 18.5-24.9</li>
                <li>• <strong>เกิน:</strong> 25-29.9</li>
                <li>• <strong>อ้วน:</strong> 30 ขึ้นไป</li>
                <li className="text-xs text-gray-600 mt-2">💡 คำนวณจาก น้ำหนัก(กก.) ÷ ส่วนสูง(ม.)²</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-700 mb-2 flex items-center">
                <span className="mr-1">🍯</span>
                น้ำตาลในเลือด
              </h4>
              <ul className="text-purple-600 space-y-1">
                <li>• <strong>ปกติ:</strong> 70-100 mg/dL</li>
                <li>• <strong>เสี่ยง:</strong> 100-125 mg/dL</li>
                <li>• <strong>เบาหวาน:</strong> 126 ขึ้นไป</li>
                <li className="text-xs text-gray-600 mt-2">💡 วัดตอนท้องว่าง 8-12 ชั่วโมง</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 bg-purple-100 border border-purple-200 rounded-lg p-3">
            <h5 className="font-bold text-purple-800 mb-2">🎯 เป้าหมายสำหรับคนหนุ่มสาว (18-25 ปี):</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-700">
              <div>
                <strong>พฤติกรรมดี:</strong> ออกกำลังกาย 150 นาที/สัปดาห์, นอน 7-9 ชั่วโมง/คืน, ดื่มน้ำ 8-10 แก้ว/วัน
              </div>
              <div>
                <strong>หลีกเลี่ยง:</strong> อาหารหวาน มัน เค็ม, ดื่มแอลกอฮอล์, สูบบุหรี่, นั่งนานเกิน 2 ชั่วโมง
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow-lg">
          <p className="text-yellow-800 text-sm font-medium">
            <strong>ข้อจำกัดความรับผิดชอบ:</strong> การวิเคราะห์นี้เป็นเพียงข้อมูลเบื้องต้นจาก AI เท่านั้น 
            ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้ ควรปรึกษาแพทย์ผู้เชี่ยวชาญสำหรับคำแนะนำที่เฉพาะเจาะจง
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthAnalytics;
