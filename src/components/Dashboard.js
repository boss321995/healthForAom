import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import HealthAnalytics from './HealthAnalytics';
import UpdateProfile from './UpdateProfile';
import axios from 'axios';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [healthSummary, setHealthSummary] = useState(null);
  const [recentMetrics, setRecentMetrics] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // ข้อมูลสถานะระบบ
  const [systemStatus, setSystemStatus] = useState({
    userConnected: false,
    tokenValid: false,
    dataLoaded: false,
    lastUpdate: null
  });

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
    weight_kg: '',
    notes: ''
  });

  useEffect(() => {
    fetchHealthData();
    updateSystemStatus();
  }, []);

  useEffect(() => {
    updateSystemStatus();
  }, [user, loading, healthSummary, userProfile]);

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

      // Fetch user profile
      try {
        const profileResponse = await axios.get('http://localhost:5000/api/profile', { headers });
        setUserProfile(profileResponse.data);
        console.log('✅ User profile loaded:', profileResponse.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
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

  const calculateBMI = (height_cm, weight_kg) => {
    if (!height_cm || !weight_kg || height_cm <= 0 || weight_kg <= 0) {
      return null;
    }
    const heightInMeters = height_cm / 100;
    return weight_kg / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return 'ไม่มีข้อมูล';
    if (bmi < 18.5) return 'น้ำหนักน้อย';
    if (bmi <= 24.9) return 'ปกติ';
    if (bmi <= 29.9) return 'น้ำหนักเกิน';
    if (bmi <= 34.9) return 'อ้วนระดับ 1';
    if (bmi <= 39.9) return 'อ้วนระดับ 2';
    return 'อ้วนระดับ 3';
  };

  const getCurrentBMI = () => {
    // Try to get latest weight from health metrics first
    const latestMetric = recentMetrics?.[0];
    const latestWeight = latestMetric?.weight_kg;
    
    // Use profile weight if no recent metric weight
    const weight = latestWeight || userProfile?.weight_kg;
    const height = userProfile?.height_cm;
    
    return calculateBMI(height, weight);
  };

  const getCurrentWeight = () => {
    // Try to get latest weight from health metrics first
    const latestMetric = recentMetrics?.[0];
    const latestWeight = latestMetric?.weight_kg;
    
    // Use profile weight if no recent metric weight
    return latestWeight || userProfile?.weight_kg;
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
    
    // Weight validation
    if (metricsForm.weight_kg && (metricsForm.weight_kg < 20 || metricsForm.weight_kg > 300)) {
      errors.push('น้ำหนัก (20-300 กก.)');
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

      // Prepare data (only send non-empty values, convert empty strings to null)
      const metricsData = {};
      Object.keys(metricsForm).forEach(key => {
        const value = metricsForm[key];
        if (value !== '' && value !== null && value !== undefined) {
          // Convert numeric strings to numbers for numeric fields
          const numericFields = [
            'systolic_bp', 'diastolic_bp', 'heart_rate', 'blood_sugar_mg',
            'cholesterol_total', 'cholesterol_hdl', 'cholesterol_ldl',
            'triglycerides', 'hba1c', 'body_fat_percentage', 'muscle_mass_kg', 'weight_kg'
          ];
          
          if (numericFields.includes(key) && value !== '') {
            metricsData[key] = parseFloat(value) || null;
          } else {
            metricsData[key] = value;
          }
        }
      });

      console.log('📤 Submitting health metrics:', metricsData);
      
      const headers = { Authorization: `Bearer ${token}` };
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
        weight_kg: '',
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

  // Helper function สำหรับแสดงผลวันที่อย่างปลอดภัย
  const formatSafeDate = (dateValue, options = {}) => {
    if (!dateValue) return 'ยังไม่มีข้อมูล';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'รูปแบบวันที่ไม่ถูกต้อง';
      }
      
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: options.short ? 'short' : 'long',
        day: 'numeric',
        ...options
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'รูปแบบวันที่ไม่ถูกต้อง';
    }
  };

  // Helper function สำหรับตรวจสอบและแสดงข้อมูลที่อาจหายไป
  const safeDisplayValue = (value, fallback = 'ยังไม่มีข้อมูล', formatter = null) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-yellow-600 text-sm">{fallback}</span>;
    }
    
    if (formatter && typeof formatter === 'function') {
      try {
        return formatter(value);
      } catch (error) {
        console.error('Formatter error:', error);
        return <span className="text-red-600 text-sm">ข้อมูลไม่ถูกต้อง</span>;
      }
    }
    
    return value;
  };

  // อัปเดตสถานะระบบ
  const updateSystemStatus = () => {
    const token = localStorage.getItem('healthToken');
    setSystemStatus({
      userConnected: !!user,
      tokenValid: !!token,
      dataLoaded: !loading && (!!healthSummary || !!userProfile),
      lastUpdate: new Date().toLocaleTimeString('th-TH')
    });
  };

  // Update system status on auth/user change
  useEffect(() => {
    updateSystemStatus();
  }, [user, loading, healthSummary, userProfile]);

  // Calculate comprehensive health score
  const calculateHealthScore = () => {
    if (!userProfile || !recentMetrics || recentMetrics.length === 0) {
      return null;
    }

    const latestMetric = recentMetrics[0];
    let totalScore = 0;
    let factors = 0;

    // BMI Score (25 points)
    const currentBMI = getCurrentBMI();
    if (currentBMI) {
      let bmiScore = 0;
      if (currentBMI >= 18.5 && currentBMI <= 24.9) {
        bmiScore = 25; // Perfect BMI
      } else if (currentBMI >= 17 && currentBMI < 18.5) {
        bmiScore = 20; // Slightly underweight
      } else if (currentBMI > 24.9 && currentBMI <= 27) {
        bmiScore = 20; // Slightly overweight
      } else if (currentBMI > 27 && currentBMI <= 30) {
        bmiScore = 15; // Moderately overweight
      } else if (currentBMI > 30 && currentBMI <= 35) {
        bmiScore = 10; // Obese level 1
      } else {
        bmiScore = 5; // Severely unhealthy BMI
      }
      totalScore += bmiScore;
      factors++;
    }

    // Blood Pressure Score (25 points)
    if (latestMetric.systolic_bp && latestMetric.diastolic_bp) {
      let bpScore = 0;
      const systolic = latestMetric.systolic_bp;
      const diastolic = latestMetric.diastolic_bp;
      
      if (systolic <= 120 && diastolic <= 80) {
        bpScore = 25; // Normal
      } else if (systolic <= 129 && diastolic <= 80) {
        bpScore = 20; // Elevated
      } else if (systolic <= 139 || diastolic <= 89) {
        bpScore = 15; // Stage 1 hypertension
      } else if (systolic <= 159 || diastolic <= 99) {
        bpScore = 10; // Stage 2 hypertension
      } else {
        bpScore = 5; // Crisis level
      }
      totalScore += bpScore;
      factors++;
    }

    // Blood Sugar Score (25 points)
    if (latestMetric.blood_sugar_mg) {
      let sugarScore = 0;
      const bloodSugar = latestMetric.blood_sugar_mg;
      
      if (bloodSugar >= 70 && bloodSugar <= 99) {
        sugarScore = 25; // Normal fasting
      } else if (bloodSugar >= 100 && bloodSugar <= 125) {
        sugarScore = 15; // Pre-diabetic
      } else if (bloodSugar >= 126 && bloodSugar <= 180) {
        sugarScore = 10; // Diabetic but controlled
      } else {
        sugarScore = 5; // Poorly controlled
      }
      totalScore += sugarScore;
      factors++;
    }

    // Heart Rate Score (25 points)
    if (latestMetric.heart_rate) {
      let hrScore = 0;
      const heartRate = latestMetric.heart_rate;
      
      if (heartRate >= 60 && heartRate <= 100) {
        hrScore = 25; // Normal resting heart rate
      } else if (heartRate >= 50 && heartRate < 60) {
        hrScore = 20; // Athletic heart rate
      } else if (heartRate > 100 && heartRate <= 120) {
        hrScore = 15; // Slightly elevated
      } else if (heartRate > 120 && heartRate <= 150) {
        hrScore = 10; // Elevated
      } else {
        hrScore = 5; // Concerning levels
      }
      totalScore += hrScore;
      factors++;
    }

    if (factors === 0) return null;

    const averageScore = Math.round(totalScore / factors);
    return {
      score: averageScore,
      maxScore: 100,
      factors: factors,
      grade: averageScore >= 90 ? 'A' : 
             averageScore >= 80 ? 'B' : 
             averageScore >= 70 ? 'C' : 
             averageScore >= 60 ? 'D' : 'F',
      status: averageScore >= 80 ? 'ดีเยี่ยม' : 
              averageScore >= 60 ? 'ปานกลาง' : 'ต้องปรับปรุง',
      details: {
        bmi: currentBMI,
        bloodPressure: latestMetric.systolic_bp && latestMetric.diastolic_bp ? 
          `${latestMetric.systolic_bp}/${latestMetric.diastolic_bp}` : null,
        bloodSugar: latestMetric.blood_sugar_mg,
        heartRate: latestMetric.heart_rate
      }
    };
  };

  // Generate AI health insights based on actual data
  const generateHealthInsights = () => {
    const healthScore = calculateHealthScore();
    if (!healthScore) return null;

    const insights = [];
    const recommendations = {
      diet: [],
      exercise: [],
      lifestyle: [],
      medical: []
    };

    const latestMetric = recentMetrics[0];
    const currentBMI = getCurrentBMI();

    // BMI insights
    if (currentBMI) {
      if (currentBMI > 25) {
        insights.push(`BMI ของคุณอยู่ที่ ${currentBMI.toFixed(1)} ซึ่งสูงกว่าค่าปกติ`);
        recommendations.diet.push('ลดปริมาณแคลอรี่ต่อวัน 300-500 แคลอรี่');
        recommendations.exercise.push('เพิ่มการออกกำลังกายแบบ cardio 30 นาที วันละ 5 ครั้งต่อสัปดาห์');
        recommendations.lifestyle.push('ติดตามน้ำหนักทุกสัปดาห์');
      } else if (currentBMI < 18.5) {
        insights.push(`BMI ของคุณอยู่ที่ ${currentBMI.toFixed(1)} ซึ่งต่ำกว่าค่าปกติ`);
        recommendations.diet.push('เพิ่มแคลอรี่จากโปรตีนและคาร์โบไฮเดรตที่ดี');
        recommendations.exercise.push('เน้นการออกกำลังกายแบบ strength training');
      }
    }

    // Blood pressure insights
    if (latestMetric.systolic_bp && latestMetric.diastolic_bp) {
      const systolic = latestMetric.systolic_bp;
      const diastolic = latestMetric.diastolic_bp;
      
      if (systolic > 140 || diastolic > 90) {
        insights.push(`ความดันโลหิต ${systolic}/${diastolic} สูงกว่าปกติ`);
        recommendations.diet.push('ลดการบริโภคเกลือและอาหารแปรรูป');
        recommendations.lifestyle.push('จัดการความเครียดด้วยการทำสมาธิ');
        recommendations.medical.push('ควรปรึกษาแพทย์เรื่องความดันโลหิตสูง');
      } else if (systolic > 120 || diastolic > 80) {
        insights.push('ความดันโลหิตเริ่มสูงกว่าปกติ ควรเฝ้าระวัง');
        recommendations.lifestyle.push('เพิ่มการออกกำลังกายเบาๆ สม่ำเสมอ');
      }
    }

    // Blood sugar insights
    if (latestMetric.blood_sugar_mg) {
      const bloodSugar = latestMetric.blood_sugar_mg;
      
      if (bloodSugar > 126) {
        insights.push(`ระดับน้ำตาลในเลือด ${bloodSugar} mg/dL สูงกว่าปกติมาก`);
        recommendations.diet.push('ลดการบริโภคน้ำตาลและคาร์โบไฮเดรตซับซ้อน');
        recommendations.medical.push('ควรปรึกษาแพทย์เรื่องเบาหวานทันที');
      } else if (bloodSugar > 100) {
        insights.push(`ระดับน้ำตาลในเลือด ${bloodSugar} mg/dL อยู่ในเกณฑ์ก่อนเบาหวาน`);
        recommendations.diet.push('ควบคุมการบริโภคน้ำตาลและแป้ง');
        recommendations.exercise.push('เพิ่มการออกกำลังกายหลังอาหาร');
      }
    }

    // Heart rate insights
    if (latestMetric.heart_rate) {
      const heartRate = latestMetric.heart_rate;
      
      if (heartRate > 100) {
        insights.push(`อัตราการเต้นของหัวใจ ${heartRate} bpm สูงกว่าปกติ`);
        recommendations.lifestyle.push('หลีกเลี่ยงคาเฟอีนและจัดการความเครียด');
        if (heartRate > 120) {
          recommendations.medical.push('ควรปรึกษาแพทย์เรื่องการเต้นของหัวใจ');
        }
      }
    }

    return {
      score: healthScore.score,
      grade: healthScore.grade,
      status: healthScore.status,
      insights: insights,
      recommendations: recommendations,
      riskFactors: insights.length,
      dataCompleteness: healthScore.factors / 4 * 100 // 4 main factors
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-blue-700 text-xl font-medium">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-blue-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-blue-800">
                Health Dashboard
              </h1>
              <p className="text-blue-600">
                สวัสดี, {healthSummary?.first_name || user?.username || 'ผู้ใช้'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-blue-800 font-medium">{user?.username}</p>
                <p className="text-blue-600 text-sm">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg border border-red-300 transition-colors"
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
                  ? 'bg-blue-600 text-white border border-blue-500 shadow-md'
                  : 'bg-white/70 text-blue-700 hover:bg-blue-50 border border-blue-200'
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
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">BMI</p>
                    <p className={`text-2xl font-bold ${getBMIColor(getCurrentBMI())}`}>
                      {getCurrentBMI() ? getCurrentBMI().toFixed(1) : '--'}
                    </p>
                    <p className="text-blue-700 text-sm">
                      {getBMICategory(getCurrentBMI())}
                    </p>
                    {getCurrentBMI() && (
                      <p className="text-xs text-blue-500 mt-1">
                        {userProfile?.height_cm}cm, {getCurrentWeight()}kg
                      </p>
                    )}
                  </div>
                  <div className="text-3xl">⚖️</div>
                </div>
              </div>

              {/* Blood Pressure Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">ความดันโลหิต</p>
                    <p className="text-2xl font-bold text-blue-900">
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
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">อัตราการเต้นหัวใจ</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {healthSummary?.heart_rate || '--'}
                      {healthSummary?.heart_rate && <span className="text-sm"> bpm</span>}
                    </p>
                  </div>
                  <div className="text-3xl">💗</div>
                </div>
              </div>

              {/* Last Checkup Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">ตรวจล่าสุด</p>
                    <p className="text-lg font-bold text-blue-900">
                      {healthSummary?.last_checkup 
                        ? (() => {
                            try {
                              const date = new Date(healthSummary.last_checkup);
                              if (isNaN(date.getTime())) {
                                return 'รูปแบบวันที่ไม่ถูกต้อง';
                              }
                              return date.toLocaleDateString('th-TH');
                            } catch (error) {
                              return 'รูปแบบวันที่ไม่ถูกต้อง';
                            }
                          })()
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
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center border-b-2 border-blue-200 pb-2">
                <span className="mr-2">⚡</span>
                บันทึกข้อมูลสุขภาพ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Record Vitals Card */}
                <button 
                  onClick={() => setActiveTab('metrics')}
                  className="bg-gradient-to-br from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 rounded-lg p-6 border-2 border-emerald-300 shadow-lg transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🩺</div>
                    <h4 className="text-emerald-800 font-bold mb-2">บันทึกค่าตรวจ</h4>
                    <p className="text-emerald-700 text-sm font-medium">ความดัน, น้ำตาล, คอเลสเตอรอล</p>
                  </div>
                </button>

                {/* Record Exercise Card */}
                <button 
                  onClick={() => setActiveTab('behaviors')}
                  className="bg-gradient-to-br from-sky-100 to-blue-100 hover:from-sky-200 hover:to-blue-200 rounded-lg p-6 border-2 border-sky-300 shadow-lg transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🏃</div>
                    <h4 className="text-sky-800 font-bold mb-2">บันทึกกิจกรรม</h4>
                    <p className="text-sky-700 text-sm font-medium">การออกกำลังกาย, การนอน</p>
                  </div>
                </button>

                {/* View Analytics Card */}
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="bg-gradient-to-br from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 rounded-lg p-6 border-2 border-indigo-300 shadow-lg transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🧠</div>
                    <h4 className="text-indigo-800 font-bold mb-2">วิเคราะห์ AI</h4>
                    <p className="text-indigo-700 text-sm font-medium">แนวโน้มและคำแนะนำ</p>
                  </div>
                </button>

                {/* Update Profile Card */}
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="bg-gradient-to-br from-rose-100 to-pink-100 hover:from-rose-200 hover:to-pink-200 rounded-lg p-6 border-2 border-rose-300 shadow-lg transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">👤</div>
                    <h4 className="text-rose-800 font-bold mb-2">อัปเดตโปรไฟล์</h4>
                    <p className="text-rose-700 text-sm font-medium">ข้อมูลส่วนตัวและการติดต่อ</p>
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
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center border-b-2 border-blue-200 pb-2">
                👤 ข้อมูลส่วนตัว
                <button
                  onClick={() => setActiveTab('profile')}
                  className="ml-auto text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-all duration-300 font-medium"
                >
                  แก้ไข
                </button>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">ชื่อ-นามสกุล:</span>
                  <span className="text-blue-900 font-semibold">
                    {userProfile?.first_name && userProfile?.last_name 
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded text-sm">ยังไม่ได้กรอก</span>
                    }
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">วันเกิด:</span>
                  <span className="text-blue-900 font-semibold">
                    {userProfile?.date_of_birth 
                      ? (() => {
                          try {
                            const date = new Date(userProfile.date_of_birth);
                            if (isNaN(date.getTime())) {
                              return <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-sm">รูปแบบวันที่ไม่ถูกต้อง</span>;
                            }
                            return date.toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          } catch (error) {
                            return <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-sm">รูปแบบวันที่ไม่ถูกต้อง</span>;
                          }
                        })()
                      : <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded text-sm">ยังไม่ได้กรอก</span>
                    }
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">เพศ:</span>
                  <span className="text-blue-900 font-semibold">
                    {safeDisplayValue(
                      userProfile?.gender === 'male' ? 'ชาย' : 
                      userProfile?.gender === 'female' ? 'หญิง' : 
                      userProfile?.gender === 'other' ? 'อื่นๆ' : null,
                      'ยังไม่ได้ระบุ'
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">ส่วนสูง:</span>
                  <span className="text-blue-900 font-semibold">
                    {safeDisplayValue(
                      userProfile?.height_cm, 
                      'ยังไม่ได้กรอก',
                      (value) => `${value} ซม.`
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">กรุ๊ปเลือด:</span>
                  <span className="text-blue-900 font-semibold">
                    {safeDisplayValue(userProfile?.blood_group, 'ยังไม่ได้ระบุ')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-100">
                  <span className="text-blue-700 font-medium">น้ำหนักปัจจุบัน:</span>
                  <span className="text-blue-900 font-semibold">
                    {safeDisplayValue(
                      getCurrentWeight(),
                      'ยังไม่มีข้อมูล',
                      (value) => `${value} กก.`
                    )}
                  </span>
                </div>
                {getCurrentBMI() && (
                  <div className="flex justify-between py-2 border-b border-blue-100">
                    <span className="text-blue-700 font-medium">BMI:</span>
                    <span className={`font-bold text-lg ${getBMIColor(getCurrentBMI())}`}>
                      {getCurrentBMI().toFixed(1)} ({getBMICategory(getCurrentBMI())})
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-blue-700 font-medium">เบอร์โทร:</span>
                  <span className="text-blue-900 font-semibold">
                    {safeDisplayValue(userProfile?.phone, 'ยังไม่ได้กรอก')}
                  </span>
                </div>
                {!userProfile?.profile_completed && (
                  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-yellow-800 text-sm text-center font-medium">
                      💡 กรุณากรอกข้อมูลโปรไฟล์เพื่อใช้งานฟีเจอร์ครบถ้วน
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Health Records */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <div className="flex justify-between items-center mb-4 border-b-2 border-blue-200 pb-2">
                <h3 className="text-xl font-bold text-blue-900">บันทึกล่าสุด</h3>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors"
                >
                  ดูทั้งหมด →
                </button>
              </div>
              <div className="space-y-3">
                {recentMetrics.length > 0 ? (
                  recentMetrics.slice(0, 5).map((record, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-blue-900 text-sm font-semibold">
                            {record.record_type === 'metric' ? '🩺 ค่าตรวจสุขภาพ' : '🏃 พฤติกรรม'}
                          </p>
                          <p className="text-blue-700 text-sm mt-1 font-medium">
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
                        <span className="text-blue-600 text-sm font-medium bg-blue-100 px-2 py-1 rounded">
                          {formatSafeDate(record.created_at, { short: true })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-700 text-sm font-medium">ยังไม่มีข้อมูลสุขภาพ</p>
                    <button
                      onClick={() => setActiveTab('metrics')}
                      className="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors"
                    >
                      เริ่มบันทึกข้อมูล
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Health Recommendations */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-xl font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">คำแนะนำด้านสุขภาพ</h3>
              <div className="space-y-4">
                {healthSummary.lifestyle_recommendations ? (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="text-2xl mr-3">💡</div>
                      <div>
                        <h4 className="text-blue-900 font-semibold mb-2">คำแนะนำส่วนบุคคล</h4>
                        <p className="text-blue-700 text-sm leading-relaxed">
                          {healthSummary.lifestyle_recommendations}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-gray-700 text-sm font-medium">กรอกข้อมูลสุขภาพเพื่อรับคำแนะนำที่เหมาะสม</p>
                  </div>
                )}

                {/* Quick Health Tips */}
                <div className="space-y-2">
                  <h4 className="text-blue-900 font-semibold text-sm mb-3 border-b border-blue-200 pb-1">เคล็ดลับสุขภาพ</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-green-50 border-2 border-green-300 rounded p-3">
                      <p className="text-green-800 text-sm font-medium">🥗 กินผัก-ผลไม้ให้หลากหลาย</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-300 rounded p-3">
                      <p className="text-blue-800 text-sm font-medium">💧 ดื่มน้ำอย่างน้อย 8 แก้วต่อวัน</p>
                    </div>
                    <div className="bg-purple-50 border-2 border-purple-300 rounded p-3">
                      <p className="text-purple-800 text-sm font-medium">😴 นอนหลับ 7-9 ชั่วโมงต่อคืน</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <HealthAnalytics 
            userProfile={userProfile}
            recentMetrics={recentMetrics}
            healthSummary={healthSummary}
            getCurrentBMI={getCurrentBMI}
            getCurrentWeight={getCurrentWeight}
            getBMICategory={getBMICategory}
            getBMIColor={getBMIColor}
            calculateHealthScore={calculateHealthScore}
            generateHealthInsights={generateHealthInsights}
          />
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <div className="flex items-center justify-between mb-6 border-b-2 border-blue-200 pb-4">
                <h3 className="text-2xl font-bold text-blue-900 flex items-center">
                  <span className="mr-3">🩺</span>
                  บันทึกค่าตรวจสุขภาพ
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`mb-6 p-4 rounded-lg border-2 animate-fade-in ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 border-green-300 text-green-800' 
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {submitMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold">{submitMessage.text}</span>
                    {submitMessage.type === 'success' && (
                      <span className="ml-2 text-sm text-green-600">กำลังกลับไปหน้าหลัก...</span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleMetricsSubmit} className="space-y-6">
                {/* Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-blue-900 font-semibold mb-2">
                      วันที่วัด <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="measurement_date"
                      value={metricsForm.measurement_date}
                      onChange={handleMetricsInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Vital Signs */}
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <h4 className="text-xl font-bold text-blue-900 mb-4 flex items-center border-b border-blue-200 pb-2">
                    <span className="mr-2">💓</span>
                    สัญญาณชีพ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-blue-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Blood Tests */}
                <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
                  <h4 className="text-xl font-bold text-red-900 mb-4 flex items-center border-b border-red-200 pb-2">
                    <span className="mr-2">🩸</span>
                    การตรวจเลือด
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Composition */}
                <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                  <h4 className="text-xl font-bold text-green-900 mb-4 flex items-center border-b border-green-200 pb-2">
                    <span className="mr-2">⚖️</span>
                    องค์ประกอบของร่างกาย
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      />
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
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
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
                        น้ำหนัก (kg) <span className="text-amber-600">✨ สำหรับคำนวณ BMI</span>
                      </label>
                      <input
                        type="number"
                        name="weight_kg"
                        value={metricsForm.weight_kg}
                        onChange={handleMetricsInputChange}
                        min="20"
                        max="300"
                        step="0.1"
                        placeholder="เช่น 65.5"
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-blue-900 font-semibold mb-2">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    name="notes"
                    value={metricsForm.notes}
                    onChange={handleMetricsInputChange}
                    rows="3"
                    placeholder="เช่น อาการผิดปกติ, ยาที่รับประทาน, สภาพแวดล้อมในการตรวจ..."
                    className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6 border-t-2 border-blue-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center border-2 border-green-600 shadow-lg"
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
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <div className="flex items-center justify-between mb-6 border-b-2 border-blue-200 pb-4">
                <h3 className="text-2xl font-bold text-blue-900 flex items-center">
                  <span className="mr-3">🏃</span>
                  บันทึกพฤติกรรมสุขภาพ
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>

              {/* Behavior Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Exercise */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300 text-center hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">🏃‍♂️</div>
                  <h4 className="text-green-800 font-bold mb-1">การออกกำลังกาย</h4>
                  <p className="text-green-700 text-sm">วิ่ง เดิน ยิม ว่ายน้ำ</p>
                </div>

                {/* Sleep */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border-2 border-purple-300 text-center hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">😴</div>
                  <h4 className="text-purple-800 font-bold mb-1">การนอนหลับ</h4>
                  <p className="text-purple-700 text-sm">เวลานอน คุณภาพการนอน</p>
                </div>

                {/* Nutrition */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border-2 border-orange-300 text-center hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">🥗</div>
                  <h4 className="text-orange-800 font-bold mb-1">โภชนาการ</h4>
                  <p className="text-orange-700 text-sm">มื้ออาหาร น้ำ วิตามิน</p>
                </div>

                {/* Mental Health */}
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border-2 border-pink-300 text-center hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">🧘‍♀️</div>
                  <h4 className="text-pink-800 font-bold mb-1">จิตใจ</h4>
                  <p className="text-pink-700 text-sm">สมาธิ โยคะ ความเครียด</p>
                </div>
              </div>

              {/* Behavior Form */}
              <form className="space-y-6">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-blue-900 font-semibold mb-2">
                      วันที่ <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-blue-900 font-semibold mb-2">
                      เวลา
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Exercise Section */}
                <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                  <h4 className="text-xl font-bold text-green-900 mb-4 flex items-center border-b border-green-200 pb-2">
                    <span className="mr-2">🏃‍♂️</span>
                    การออกกำลังกาย
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
                        ประเภทกิจกรรม
                      </label>
                      <select className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200">
                        <option value="">เลือกประเภท</option>
                        <option value="running">วิ่ง</option>
                        <option value="walking">เดิน</option>
                        <option value="cycling">ปั่นจักรยาน</option>
                        <option value="swimming">ว่ายน้ำ</option>
                        <option value="gym">ยิม/ฟิตเนส</option>
                        <option value="yoga">โยคะ</option>
                        <option value="sports">กีฬา</option>
                        <option value="dancing">เต้นรำ</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
                        ระยะเวลา (นาที)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="480"
                        placeholder="เช่น 30"
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      />
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-2">
                        ความหนัก
                      </label>
                      <select className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200">
                        <option value="">เลือกระดับ</option>
                        <option value="light">เบา</option>
                        <option value="moderate">ปานกลาง</option>
                        <option value="vigorous">หนัก</option>
                        <option value="intense">หนักมาก</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sleep Section */}
                <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                  <h4 className="text-xl font-bold text-purple-900 mb-4 flex items-center border-b border-purple-200 pb-2">
                    <span className="mr-2">�</span>
                    การนอนหลับ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-purple-800 font-semibold mb-2">
                        เวลาเข้านอน
                      </label>
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-lg text-purple-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-800 font-semibold mb-2">
                        เวลาตื่น
                      </label>
                      <input
                        type="time"
                        className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-lg text-purple-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-800 font-semibold mb-2">
                        คุณภาพการนอน
                      </label>
                      <select className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-lg text-purple-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200">
                        <option value="">ประเมินคุณภาพ</option>
                        <option value="excellent">ดีมาก</option>
                        <option value="good">ดี</option>
                        <option value="fair">ปานกลาง</option>
                        <option value="poor">แย่</option>
                        <option value="very_poor">แย่มาก</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Nutrition Section */}
                <div className="bg-orange-50 rounded-lg p-6 border-2 border-orange-200">
                  <h4 className="text-xl font-bold text-orange-900 mb-4 flex items-center border-b border-orange-200 pb-2">
                    <span className="mr-2">🥗</span>
                    โภชนาการ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-orange-800 font-semibold mb-2">
                        ปริมาณน้ำ (แก้ว)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        placeholder="เช่น 8"
                        className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-lg text-orange-900 placeholder-orange-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                    <div>
                      <label className="block text-orange-800 font-semibold mb-2">
                        ผัก/ผลไม้ (ครั้ง)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="เช่น 5"
                        className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-lg text-orange-900 placeholder-orange-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                    <div>
                      <label className="block text-orange-800 font-semibold mb-2">
                        วิตามิน/อาหารเสริม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น วิตามินซี, แคลเซียม"
                        className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-lg text-orange-900 placeholder-orange-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Mental Health Section */}
                <div className="bg-pink-50 rounded-lg p-6 border-2 border-pink-200">
                  <h4 className="text-xl font-bold text-pink-900 mb-4 flex items-center border-b border-pink-200 pb-2">
                    <span className="mr-2">🧘‍♀️</span>
                    สุขภาพจิต
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-pink-800 font-semibold mb-2">
                        ระดับความเครียด
                      </label>
                      <select className="w-full px-4 py-3 bg-white border-2 border-pink-300 rounded-lg text-pink-900 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200">
                        <option value="">ประเมินความเครียด</option>
                        <option value="1">1 - ผ่อนคลายมาก</option>
                        <option value="2">2 - ผ่อนคลาย</option>
                        <option value="3">3 - ปกติ</option>
                        <option value="4">4 - เครียดเล็กน้อย</option>
                        <option value="5">5 - เครียดมาก</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-pink-800 font-semibold mb-2">
                        กิจกรรมผ่อนคลาย (นาที)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="240"
                        placeholder="เช่น 15"
                        className="w-full px-4 py-3 bg-white border-2 border-pink-300 rounded-lg text-pink-900 placeholder-pink-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-blue-900 font-semibold mb-2">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows="3"
                    placeholder="เช่น ความรู้สึก อาการผิดปกติ สิ่งที่ส่งผลต่อกิจกรรม..."
                    className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6 border-t-2 border-blue-200">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center border-2 border-green-600 shadow-lg"
                  >
                    <span className="mr-2">💾</span>
                    บันทึกข้อมูล
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg transition-all duration-300 font-medium"
                  >
                    เริ่มใหม่
                  </button>
                </div>
              </form>

              {/* Tips */}
              <div className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">💡</div>
                  <div>
                    <h5 className="text-blue-900 font-semibold mb-2">เคล็ดลับการบันทึก</h5>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• บันทึกข้อมูลทันทีหลังทำกิจกรรมเพื่อความแม่นยำ</li>
                      <li>• การออกกำลังกายควรมีอย่างน้อย 150 นาทีต่อสัปดาห์</li>
                      <li>• นอนหลับ 7-9 ชั่วโมงต่อคืนเพื่อสุขภาพที่ดี</li>
                      <li>• ดื่มน้ำ 8-10 แก้วต่อวันและกินผัก-ผลไม้ 5 ส่วนต่อวัน</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <UpdateProfile />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
