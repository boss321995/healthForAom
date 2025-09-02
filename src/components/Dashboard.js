import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import HealthAnalytics from './HealthAnalytics';
import UpdateProfile from './UpdateProfile';
import HealthTrends from './HealthTrends';
import NotificationSystem from './NotificationSystem';
import HealthReportPDF from './HealthReportPDF';
import HealthReportPDF_Thai from './HealthReportPDF_Thai';
import HealthChatbot from './HealthChatbot';
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
  const [dataHistory, setDataHistory] = useState([]);

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
    uric_acid: '',
    alt: '',
    ast: '',
    hemoglobin: '',
    hematocrit: '',
    iron: '',
    tibc: '',
    notes: ''
  });

  // Form state for lifestyle/behavior tracking
  const [lifestyleForm, setLifestyleForm] = useState({
    date: new Date().toISOString().split('T')[0],
    exercise_type: '',
    exercise_duration: '',
    exercise_intensity: '',
    sleep_bedtime: '',
    sleep_wakeup: '',
    sleep_quality: '',
    water_glasses: '',
    fruits_vegetables: '',
    supplements: '',
    stress_level: '',
    relaxation_minutes: '',
    notes: ''
  });

  useEffect(() => {
    fetchHealthData();
    fetchDataHistory();
    updateSystemStatus();
  }, []);

  useEffect(() => {
    updateSystemStatus();
  }, [user, loading, healthSummary, userProfile]);

  const fetchDataHistory = async () => {
    try {
      const token = localStorage.getItem('healthToken');
      
      if (!token || token.startsWith('mock-jwt-token-')) {
        const savedHistory = JSON.parse(localStorage.getItem('healthDataHistory') || '[]');
        setDataHistory(savedHistory);
        console.log('📋 Mock data history loaded from localStorage:', savedHistory.length, 'items');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // ดึงข้อมูล health metrics ล่าสุด
      const metricsResponse = await axios.get('http://localhost:5000/api/health-metrics?limit=50', { headers });
      const metrics = metricsResponse.data || [];
      
      // ดึงข้อมูล health behaviors ล่าสุด
      const behaviorsResponse = await axios.get('/api/health-behaviors?limit=50', { headers });
      const behaviors = behaviorsResponse.data || [];
      
      // แปลงข้อมูล metrics เป็นรูปแบบประวัติ
      const metricsHistory = metrics.map(metric => ({
        id: `metrics-${metric.metric_id}`,
        type: 'metrics',
        data: metric,
        description: `บันทึกค่าตรวจสุขภาพ - ${metric.measurement_date}`,
        timestamp: new Date(metric.created_at || metric.measurement_date),
        date: new Date(metric.measurement_date).toLocaleDateString('th-TH'),
        time: new Date(metric.created_at || metric.measurement_date).toLocaleTimeString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));

      // แปลงข้อมูล behaviors เป็นรูปแบบประวัติ
      const behaviorsHistory = behaviors.map(behavior => ({
        id: `behaviors-${behavior.behavior_id}`,
        type: 'behaviors',
        data: behavior,
        description: `บันทึกพฤติกรรมสุขภาพ - ${behavior.record_date}`,
        timestamp: new Date(behavior.created_at || behavior.record_date),
        date: new Date(behavior.record_date).toLocaleDateString('th-TH'),
        time: new Date(behavior.created_at || behavior.record_date).toLocaleTimeString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        exercise_duration_minutes: behavior.exercise_duration_minutes,
        exercise_frequency: behavior.exercise_frequency,
        stress_level: behavior.stress_level,
        sleep_hours_per_night: behavior.sleep_hours_per_night
      }));

      // รวมกับข้อมูลจาก localStorage (ถ้ามี)
      const localHistory = JSON.parse(localStorage.getItem('healthDataHistory') || '[]');
      
      // รวมและเรียงลำดับตามเวลา
      const combinedHistory = [...metricsHistory, ...behaviorsHistory, ...localHistory]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100); // เก็บแค่ 100 รายการล่าสุด

      setDataHistory(combinedHistory);
      
      // อัปเดต recentMetrics ให้รวมข้อมูลจาก behaviors ด้วย แต่แยกประเภทชัดเจน
      const combinedMetrics = [...metrics, ...behaviors]
        .sort((a, b) => new Date(b.created_at || b.record_date || b.measurement_date) - new Date(a.created_at || a.record_date || a.measurement_date))
        .slice(0, 10);
      setRecentMetrics(combinedMetrics);
      
      // อัปเดต recentMetrics สำหรับการคำนวณ BMI (เฉพาะ metrics)
      const metricsOnly = metrics
        .sort((a, b) => new Date(b.created_at || b.measurement_date) - new Date(a.created_at || a.measurement_date))
        .slice(0, 5);
      
      // ถ้ามี metrics ใหม่ ให้อัปเดต state สำหรับ BMI calculation
      if (metricsOnly.length > 0) {
        // อัปเดต state ที่เกี่ยวข้องกับ metrics เพื่อการคำนวณ BMI
        console.log('📊 Latest metrics for BMI calculation:', metricsOnly[0]);
      }
      console.log('📋 Data history loaded:', combinedHistory.length, 'items');
      
    } catch (error) {
      console.error('Error fetching data history:', error);
      // Fallback to localStorage
      const savedHistory = JSON.parse(localStorage.getItem('healthDataHistory') || '[]');
      setDataHistory(savedHistory);
    }
  };

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

  // ฟังก์ชันดึงค่าล่าสุดที่ไม่เป็น null สำหรับค่าใดค่าหนึ่ง
  const getLatestValidValue = (fieldName) => {
    if (!recentMetrics || recentMetrics.length === 0) {
      return null;
    }
    
    // กรองเฉพาะรายการที่มีวันที่ที่ถูกต้อง และเรียงจากวันที่ล่าสุดก่อน
    const validMetrics = recentMetrics
      .filter(metric => metric.measurement_date && metric.measurement_date !== 'undefined')
      .sort((a, b) => new Date(b.measurement_date) - new Date(a.measurement_date));
    
    for (const metric of validMetrics) {
      const value = metric[fieldName];
      
      // สำหรับความดันและอัตราการเต้นหัวใจ ไม่ควรเป็น 0 จริงๆ แต่สำหรับค่าอื่นอาจเป็น 0 ได้
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

  const getCurrentBMI = () => {
    // ใช้เฉพาะ health metrics ที่มีค่าน้ำหนักจริง (ไม่ใช่ null หรือ 0)
    const latestWeight = getLatestValidValue('weight_kg');
    
    // Use profile weight if no recent metric weight (และต้องมากกว่า 0)
    const weight = latestWeight || (userProfile?.weight_kg > 0 ? userProfile?.weight_kg : null);
    const height = userProfile?.height_cm > 0 ? userProfile?.height_cm : null;
    
    return calculateBMI(height, weight);
  };

  // ฟังก์ชันสร้างคำแนะนำเฉพาะบุคคล
  const getPersonalizedHealthTips = () => {
    const tips = [];
    
    // ตรวจสอบโรคประจำตัวและยาที่ใช้ (ปรับปรุงการตรวจสอบ)
    const medicalConditions = userProfile?.medical_conditions?.toLowerCase() || '';
    const medications = userProfile?.medications?.toLowerCase() || '';
    
    const hasHypertension = medicalConditions.includes('ความดันสูง') || 
                           medicalConditions.includes('hypertension') ||
                           medicalConditions.includes('ความดัน') ||
                           medications.includes('amlodipine') ||
                           medications.includes('amlopine') ||
                           medications.includes('แอมโลดิปีน');
    
    const hasDiabetes = medicalConditions.includes('เบาหวาน') || 
                       medicalConditions.includes('diabetes') ||
                       medicalConditions.includes('dm') ||
                       medications.includes('metformin') ||
                       medications.includes('เมตฟอร์มิน');
    
    const hasTB = medicalConditions.includes('วัณโรค') || 
                  medicalConditions.includes('tb') ||
                  medicalConditions.includes('tuberculosis') ||
                  medications.includes('isoniazid') ||
                  medications.includes('rifampin');
    
    // ตรวจสอบค่าสุขภาพล่าสุด
    const latestSystolic = getLatestValidValue('systolic_bp');
    const latestDiastolic = getLatestValidValue('diastolic_bp');
    const latestBloodSugar = getLatestValidValue('blood_sugar_mg');
    const latestWeight = getLatestValidValue('weight_kg');
    
    // คำแนะนำสำหรับผู้ที่มีความดันสูง
    if (hasHypertension || (latestSystolic >= 140 || latestDiastolic >= 90)) {
      tips.push({
        icon: '💓',
        title: 'สำหรับผู้ที่มีความดันสูง',
        content: 'ลดเกลือในอาหาร หลีกเลี่ยงอาหารแปรรูป เดินเร็ว 30 นาที/วัน ควบคุมน้ำหนัก จัดการความเครียด',
        color: 'red'
      });
      
      // ตรวจสอบยาเฉพาะ
      if (medications.includes('amlodipine') || medications.includes('amlopine') || medications.includes('แอมโลดิปีน')) {
        tips.push({
          icon: '💊',
          title: 'ผู้ใช้ยา Amlodipine',
          content: 'กินยาตอนเช้าทุกวัน ลุกขึ้นยืนช้าๆ เพื่อป้องกันเวียนหัว ดื่มน้ำเพียงพอ สังเกตอาการบวมที่ข้อเท้า',
          color: 'orange'
        });
      }
      
      // เพิ่มคำแนะนำทั่วไปสำหรับความดันสูง
      tips.push({
        icon: '🥬',
        title: 'อาหารสำหรับลดความดัน',
        content: 'กินกล้วย (โปแตสเซียม) ผักใบเขียว ปลา งดเกลือ หลีกเลี่ยงเครื่องดื่มแอลกอฮอล์',
        color: 'green'
      });
    }
    
    // คำแนะนำสำหรับผู้เบาหวาน
    if (hasDiabetes || (latestBloodSugar && latestBloodSugar > 126)) {
      tips.push({
        icon: '🍎',
        title: 'สำหรับผู้เบาหวาน',
        content: 'กินข้าวกล้อง ขนมปังโฮลวีท หลีกเลี่ยงน้ำตาลและแป้ง แบ่งมื้อเล็กๆ 5-6 มื้อ/วัน',
        color: 'green'
      });
      
      if (medications.includes('metformin') || medications.includes('เมตฟอร์มิน')) {
        tips.push({
          icon: '💊',
          title: 'ผู้ใช้ยา Metformin',
          content: 'กินยาพร้อมอาหาร เพื่อลดอาการคลื่นไส้ ตรวจน้ำตาลก่อนและหลังอาหาร',
          color: 'blue'
        });
      }
    }
    
    // คำแนะนำสำหรับผู้รักษาวัณโรค
    if (hasTB) {
      tips.push({
        icon: '🫁',
        title: 'สำหรับผู้รักษาวัณโรค',
        content: 'กินยาครบถ้วนตามเวลา พักผ่อนเพียงพอ กินอาหารโปรตีนสูง แยกของใช้ส่วนตัว ใส่หน้ากาก',
        color: 'yellow'
      });
    }
    
    // เพิ่มคำแนะนำตามค่าสุขภาพล่าสุด
    if (latestSystolic && latestDiastolic && (latestSystolic >= 140 || latestDiastolic >= 90)) {
      tips.push({
        icon: '⚠️',
        title: 'ความดันสูงกว่าปกติ',
        content: `ความดันล่าสุด ${latestSystolic}/${latestDiastolic} mmHg - ควรพักผ่อน ลดความเครียด ออกกำลังกายเบาๆ`,
        color: 'red'
      });
    }
    
    if (latestBloodSugar && latestBloodSugar > 140) {
      const level = latestBloodSugar > 200 ? 'สูงมาก' : latestBloodSugar > 180 ? 'สูง' : 'สูงเล็กน้อย';
      tips.push({
        icon: '📊',
        title: `น้ำตาล${level}`,
        content: `น้ำตาลล่าสุด ${latestBloodSugar} mg/dL - ควรระวังอาหาร ออกกำลังกาย หากสูงมากควรพบแพทย์`,
        color: 'red'
      });
    }
    
    // คำแนะนำทั่วไปหากไม่มีโรคประจำตัวหรือค่าผิดปกติ
    if (tips.length === 0) {
      tips.push(
        {
          icon: '🥗',
          title: 'อาหารเพื่อสุขภาพ',
          content: 'กินผัก-ผลไม้ให้หลากหลาย 5 ส่วนต่อวัน เน้นธัญพืชเต็มเมล็ด โปรตีนไม่ติดมัน',
          color: 'green'
        },
        {
          icon: '💧',
          title: 'การดื่มน้ำ',
          content: 'ดื่มน้ำอย่างน้อย 8 แก้วต่อวัน หลีกเลี่ยงเครื่องดื่มหวาน น้ำอัดลม',
          color: 'blue'
        },
        {
          icon: '😴',
          title: 'การนอนหลับ',
          content: 'นอนหลับ 7-9 ชั่วโมงต่อคืน เข้านอนเวลาเดิมทุกวัน หลีกเลี่ยงหน้าจอก่อนนอน',
          color: 'purple'
        },
        {
          icon: '🏃‍♂️',
          title: 'การออกกำลังกาย',
          content: 'ออกกำลังกายอย่างน้อย 150 นาที/สัปดาห์ เดิน วิ่ง ว่ายน้ำ หรือปั่นจักรยาน',
          color: 'orange'
        }
      );
    }
    
    return tips;
  };

  const getCurrentWeight = () => {
    // ดึงค่าน้ำหนักล่าสุดที่ไม่เป็น null
    const latestWeight = getLatestValidValue('weight_kg');
    
    // Use profile weight if no recent metric weight (และต้องมากกว่า 0)
    return latestWeight || (userProfile?.weight_kg > 0 ? userProfile?.weight_kg : null);
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
            'triglycerides', 'hba1c', 'body_fat_percentage', 'muscle_mass_kg', 'weight_kg',
            'uric_acid', 'alt', 'ast', 'hemoglobin', 'hematocrit', 'iron', 'tibc'
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
        uric_acid: '',
        alt: '',
        ast: '',
        hemoglobin: '',
        hematocrit: '',
        iron: '',
        tibc: '',
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

  // Handle lifestyle input changes
  const handleLifestyleInputChange = (e) => {
    const { name, value } = e.target;
    setLifestyleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit lifestyle/behavior data
  const handleLifestyleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    // Basic validation
    if (!lifestyleForm.date) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'กรุณาเลือกวันที่' 
      });
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem('healthToken');
    if (!token) {
      setSubmitMessage({ type: 'error', text: 'กรุณาเข้าสู่ระบบใหม่' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Create lifestyle data object - เฉพาะข้อมูลที่มีค่า
      const lifestyleData = {
        date: lifestyleForm.date,
      };

      // เพิ่มข้อมูลเฉพาะที่มีค่า
      if (lifestyleForm.exercise_type) {
        lifestyleData.exercise_type = lifestyleForm.exercise_type;
      }
      if (lifestyleForm.exercise_duration && parseInt(lifestyleForm.exercise_duration) > 0) {
        lifestyleData.exercise_duration = parseInt(lifestyleForm.exercise_duration);
        // ตั้งค่า exercise_frequency เฉพาะเมื่อมีการออกกำลังกาย
        lifestyleData.exercise_frequency = 'rarely'; // หรือให้ผู้ใช้เลือก
      }
      if (lifestyleForm.exercise_intensity) {
        lifestyleData.exercise_intensity = lifestyleForm.exercise_intensity;
      }
      if (lifestyleForm.sleep_bedtime) {
        lifestyleData.sleep_bedtime = lifestyleForm.sleep_bedtime;
      }
      if (lifestyleForm.sleep_wakeup) {
        lifestyleData.sleep_wakeup = lifestyleForm.sleep_wakeup;
      }
      if (lifestyleForm.sleep_hours && parseFloat(lifestyleForm.sleep_hours) > 0) {
        lifestyleData.sleep_hours_per_night = parseFloat(lifestyleForm.sleep_hours);
      }
      if (lifestyleForm.sleep_quality) {
        lifestyleData.sleep_quality = lifestyleForm.sleep_quality;
      }
      if (lifestyleForm.water_glasses && parseInt(lifestyleForm.water_glasses) > 0) {
        lifestyleData.water_glasses = parseInt(lifestyleForm.water_glasses);
      }
      if (lifestyleForm.fruits_vegetables) {
        lifestyleData.fruits_vegetables = lifestyleForm.fruits_vegetables;
      }
      if (lifestyleForm.supplements) {
        lifestyleData.supplements = lifestyleForm.supplements;
      }
      if (lifestyleForm.stress_level) {
        lifestyleData.stress_level = lifestyleForm.stress_level;
      }
      if (lifestyleForm.relaxation_minutes && parseInt(lifestyleForm.relaxation_minutes) > 0) {
        lifestyleData.relaxation_minutes = parseInt(lifestyleForm.relaxation_minutes);
      }
      if (lifestyleForm.notes) {
        lifestyleData.notes = lifestyleForm.notes;
      }

      console.log('📤 Submitting lifestyle data:', lifestyleData);

      const response = await axios.post('/api/health-behaviors', lifestyleData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Lifestyle data submitted successfully:', response.data);
      setSubmitMessage({ 
        type: 'success', 
        text: response.data.message || 'บันทึกพฤติกรรมสุขภาพสำเร็จ!' 
      });

      // Reset form
      setLifestyleForm({
        date: new Date().toISOString().split('T')[0],
        exercise_type: '',
        exercise_duration: '',
        exercise_intensity: '',
        sleep_bedtime: '',
        sleep_wakeup: '',
        sleep_quality: '',
        water_glasses: '',
        fruits_vegetables: '',
        supplements: '',
        stress_level: '',
        relaxation_minutes: '',
        notes: ''
      });

      // Refresh data
      console.log('🔄 Refreshing health data...');
      await fetchHealthData();
      await fetchDataHistory();
      console.log('✅ Health data refreshed');
      
      // Auto switch to overview after 2 seconds
      setTimeout(() => {
        setActiveTab('overview');
        setSubmitMessage({ type: '', text: '' });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error submitting lifestyle data:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || error.response?.data?.details || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
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

  // Helper function สำหรับแปลคำศัพท์เป็นภาษาไทย
  const translateToThai = (value, type) => {
    const translations = {
      exercise_frequency: {
        'rarely': 'นาน ๆ ครั้ง',
        'sometimes': 'บางครั้ง',
        'regularly': 'สม่ำเสมอ',
        'daily': 'ทุกวัน',
        'never': 'ไม่เคย'
      },
      exercise_intensity: {
        'light': 'เบา',
        'moderate': 'ปานกลาง',
        'vigorous': 'หนัก',
        'เบา': 'เบา',
        'ปานกลาง': 'ปานกลาง',
        'หนัก': 'หนัก'
      },
      sleep_quality: {
        'excellent': 'ดีมาก',
        'good': 'ดี',
        'fair': 'ปานกลาง',
        'poor': 'แย่',
        'very_poor': 'แย่มาก',
        'ดีมาก': 'ดีมาก',
        'ดี': 'ดี',
        'ปานกลาง': 'ปานกลาง',
        'แย่': 'แย่',
        'แย่มาก': 'แย่มาก'
      },
      diet_quality: {
        'excellent': 'ดีมาก',
        'good': 'ดี',
        'fair': 'ปานกลาง',
        'poor': 'แย่',
        'ดีมาก': 'ดีมาก',
        'ดี': 'ดี',
        'ปานกลาง': 'ปานกลาง',
        'แย่': 'แย่'
      }
    };

    if (translations[type] && translations[type][value]) {
      return translations[type][value];
    }
    
    return value; // คืนค่าเดิมถ้าไม่พบการแปล
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

    // Blood Pressure Score (25 points) - ใช้ค่าล่าสุดที่มีข้อมูล
    const systolic = getLatestValidValue('systolic_bp');
    const diastolic = getLatestValidValue('diastolic_bp');
    if (systolic && diastolic) {
      let bpScore = 0;
      
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

    // Blood Sugar Score (25 points) - ใช้ค่าล่าสุดที่มีข้อมูล
    const bloodSugar = getLatestValidValue('blood_sugar_mg');
    if (bloodSugar) {
      let sugarScore = 0;
      
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

    // Heart Rate Score (25 points) - ใช้ค่าล่าสุดที่มีข้อมูล
    const heartRate = getLatestValidValue('heart_rate');
    if (heartRate) {
      let hrScore = 0;
      
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
        bloodPressure: (() => {
          const systolic = getLatestValidValue('systolic_bp');
          const diastolic = getLatestValidValue('diastolic_bp');
          return (systolic && diastolic) ? `${systolic}/${diastolic}` : null;
        })(),
        bloodSugar: getLatestValidValue('blood_sugar_mg'),
        heartRate: getLatestValidValue('heart_rate')
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

    // Blood pressure insights - ใช้ค่าล่าสุดที่มีข้อมูล
    const systolic = getLatestValidValue('systolic_bp');
    const diastolic = getLatestValidValue('diastolic_bp');
    if (systolic && diastolic) {
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

    // Blood sugar insights - ใช้ค่าล่าสุดที่มีข้อมูล
    const bloodSugar = getLatestValidValue('blood_sugar_mg');
    if (bloodSugar) {
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

    // Heart rate insights - ใช้ค่าล่าสุดที่มีข้อมูล
    const heartRate = getLatestValidValue('heart_rate');
    if (heartRate) {
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-800 truncate">
                Health Dashboard
              </h1>
              <p className="text-blue-600 text-sm sm:text-base truncate">
                สวัสดี, {healthSummary?.first_name || user?.username || 'ผู้ใช้'}!
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationSystem 
                userProfile={userProfile} 
                recentMetrics={recentMetrics} 
              />
              <div className="hidden sm:block text-right">
                <p className="text-blue-800 font-medium text-sm">{user?.username}</p>
                <p className="text-blue-600 text-xs">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 sm:px-4 sm:py-2 rounded-lg border border-red-300 transition-colors text-sm"
              >
                <span className="hidden sm:inline">ออกจากระบบ</span>
                <span className="sm:hidden">ออก</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex overflow-x-auto scrollbar-hide space-x-1 mb-6 sm:mb-8 pb-2">
          {[
            { id: 'overview', label: 'ภาพรวม', icon: '📊' },
            { id: 'trends', label: 'แนวโน้มสุขภาพ', icon: '📈' },
            { id: 'analytics', label: 'การวิเคราะห์ AI', icon: '🧠' },
            { id: 'metrics', label: 'ค่าตรวจสุขภาพ', icon: '🩺' },
            { id: 'behaviors', label: 'พฤติกรรม', icon: '🏃' },
            { id: 'profile', label: 'โปรไฟล์', icon: '👤' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border border-blue-500 shadow-md'
                  : 'bg-white/70 text-blue-700 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <span className="mr-1 sm:mr-2">{tab.icon}</span>
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Health Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <HealthTrends userId={user?.userId} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <HealthReportPDF 
                userProfile={userProfile} 
                recentMetrics={recentMetrics}
                dataHistory={dataHistory}
              />
              <HealthReportPDF_Thai 
                userProfile={userProfile} 
                recentMetrics={recentMetrics}
                dataHistory={dataHistory}
              />
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* BMI Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-600 text-xs sm:text-sm font-medium">BMI</p>
                    <p className={`text-xl sm:text-2xl font-bold truncate ${getBMIColor(getCurrentBMI())}`}>
                      {getCurrentBMI() ? getCurrentBMI().toFixed(1) : '--'}
                    </p>
                    <p className="text-blue-700 text-xs sm:text-sm truncate">
                      {getBMICategory(getCurrentBMI())}
                    </p>
                    {getCurrentBMI() && getCurrentWeight() && (
                      <p className="text-xs text-blue-500 mt-1 truncate">
                        {userProfile?.height_cm}cm, {getCurrentWeight()}kg
                      </p>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl ml-2">⚖️</div>
                </div>
              </div>

              {/* Blood Pressure Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-600 text-xs sm:text-sm font-medium">ความดันโลหิต</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 truncate">
                      {(() => {
                        const systolic = getLatestValidValue('systolic_bp');
                        const diastolic = getLatestValidValue('diastolic_bp');
                        return (systolic && diastolic) ? `${systolic}/${diastolic}` : '--/--';
                      })()}
                    </p>
                    <p className={`text-xs sm:text-sm truncate ${(() => {
                      const systolic = getLatestValidValue('systolic_bp');
                      const diastolic = getLatestValidValue('diastolic_bp');
                      return getBPStatus(systolic, diastolic).color;
                    })()}`}>
                      {(() => {
                        const systolic = getLatestValidValue('systolic_bp');
                        const diastolic = getLatestValidValue('diastolic_bp');
                        return getBPStatus(systolic, diastolic).status;
                      })()}
                    </p>
                  </div>
                  <div className="text-2xl sm:text-3xl ml-2">💓</div>
                </div>
              </div>

              {/* Heart Rate Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-600 text-xs sm:text-sm font-medium">อัตราการเต้นหัวใจ</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 truncate">
                      {(() => {
                        const heartRate = getLatestValidValue('heart_rate');
                        return heartRate ? `${heartRate}` : '--';
                      })()}
                      {(() => {
                        const heartRate = getLatestValidValue('heart_rate');
                        return heartRate ? <span className="text-sm"> bpm</span> : null;
                      })()}
                    </p>
                  </div>
                  <div className="text-2xl sm:text-3xl ml-2">💗</div>
                </div>
              </div>

              {/* Last Checkup Card */}
              <div className="bg-white/90 backdrop-blur-lg rounded-lg p-4 sm:p-6 border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-600 text-xs sm:text-sm font-medium">ตรวจล่าสุด</p>
                    <p className="text-base sm:text-lg font-bold text-blue-900 truncate">
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

                {/* Personalized Health Tips */}
                <div className="space-y-2">
                  <h4 className="text-blue-900 font-semibold text-sm mb-3 border-b border-blue-200 pb-1">
                    {userProfile?.medical_conditions || userProfile?.medications ? 'คำแนะนำเฉพาะคุณ' : 'เคล็ดลับสุขภาพ'}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {getPersonalizedHealthTips().map((tip, index) => (
                      <div key={index} className={`
                        ${tip.color === 'red' ? 'bg-red-50 border-red-300 text-red-800' : 
                          tip.color === 'green' ? 'bg-green-50 border-green-300 text-green-800' :
                          tip.color === 'blue' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                          tip.color === 'purple' ? 'bg-purple-50 border-purple-300 text-purple-800' :
                          tip.color === 'orange' ? 'bg-orange-50 border-orange-300 text-orange-800' :
                          tip.color === 'yellow' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                          'bg-gray-50 border-gray-300 text-gray-800'} 
                        border-2 rounded p-3`}>
                        <div className="flex items-start space-x-2">
                          <span className="text-lg flex-shrink-0">{tip.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-xs mb-1">{tip.title}</h5>
                            <p className="text-xs leading-relaxed">{tip.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                            {record.record_type === 'metric' ? '🩺 ค่าตรวจสุขภาพ' : '🏃 พฤติกรรมสุขภาพ'}
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
                          {formatSafeDate(record.date || record.created_at, { short: true })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-700 text-sm font-medium">ยังไม่มีข้อมูลสุขภาพ</p>
                    <button
                      onClick={() => setActiveTab('lifestyle')}
                      className="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors"
                    >
                      เริ่มบันทึกข้อมูล
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Exercise History */}
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-green-300 shadow-lg">
              <div className="flex justify-between items-center mb-4 border-b-2 border-green-200 pb-2">
                <h3 className="text-xl font-bold text-green-900 flex items-center">
                  <span className="mr-2">🏃‍♂️</span>
                  ประวัติการออกกำลังกาย
                </h3>
                <button
                  onClick={() => setActiveTab('behaviors')}
                  className="text-green-600 hover:text-green-800 text-sm font-medium bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg transition-colors"
                >
                  บันทึกใหม่ +
                </button>
              </div>
              <div className="space-y-3">
                {recentMetrics.filter(record => record.exercise_duration_minutes && record.exercise_duration_minutes > 0).length > 0 ? (
                  recentMetrics.filter(record => record.exercise_duration_minutes && record.exercise_duration_minutes > 0).slice(0, 3).map((record, index) => (
                    <div key={index} className="bg-green-50 rounded-lg p-4 border-2 border-green-200 hover:border-green-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-green-900 text-sm font-semibold flex items-center">
                            <span className="mr-2">🎯</span>
                            การออกกำลังกาย
                            {record.exercise_frequency && (
                              <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                {translateToThai(record.exercise_frequency, 'exercise_frequency')}
                              </span>
                            )}
                          </p>
                          <p className="text-green-700 text-sm mt-1 font-medium">
                            ระยะเวลา: {record.exercise_duration_minutes} นาที
                            {record.stress_level && ` | ความเครียด: ${record.stress_level}/5`}
                            {record.sleep_hours_per_night && ` | การนอน: ${record.sleep_hours_per_night} ชม.`}
                          </p>
                          {record.water_intake_liters && record.water_intake_liters > 0 && (
                            <p className="text-green-600 text-xs mt-1">
                              💧 น้ำดื่ม: {record.water_intake_liters} ลิตร
                            </p>
                          )}
                          {record.diet_quality && record.diet_quality !== 'fair' && record.diet_quality !== '' && (
                            <p className="text-green-600 text-xs mt-1">
                              🥗 คุณภาพอาหาร: {translateToThai(record.diet_quality, 'diet_quality')}
                            </p>
                          )}
                        </div>
                        <span className="text-green-600 text-sm font-medium bg-green-100 px-2 py-1 rounded ml-2">
                          {formatSafeDate(record.record_date || record.date || record.created_at, { short: true })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-4xl mb-2">🏃‍♂️</div>
                    <p className="text-green-700 text-sm font-medium">ยังไม่มีการบันทึกการออกกำลังกาย</p>
                    <p className="text-green-600 text-xs mt-1">บันทึกการออกกำลังกายเพื่อติดตามความคืบหน้า</p>
                    <button
                      onClick={() => setActiveTab('behaviors')}
                      className="text-green-600 hover:text-green-800 text-sm mt-2 font-medium bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg transition-colors"
                    >
                      เริ่มบันทึก
                    </button>
                  </div>
                )}
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
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-4 sm:p-6 border-2 border-blue-300 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 border-b-2 border-blue-200 pb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-blue-900 flex items-center mb-3 sm:mb-0">
                  <span className="mr-2 sm:mr-3">🩺</span>
                  บันทึกค่าตรวจสุขภาพ
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-100 hover:bg-blue-200 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-2 animate-fade-in ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 border-green-300 text-green-800' 
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {submitMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold text-sm sm:text-base">{submitMessage.text}</span>
                    {submitMessage.type === 'success' && (
                      <span className="ml-2 text-xs sm:text-sm text-green-600">กำลังกลับไปหน้าหลัก...</span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleMetricsSubmit} className="space-y-4 sm:space-y-6">
                {/* Date */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-blue-900 font-semibold mb-2 text-sm sm:text-base">
                      วันที่วัด <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="measurement_date"
                      value={metricsForm.measurement_date}
                      onChange={handleMetricsInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border-2 border-blue-300 rounded-lg text-blue-900 placeholder-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Vital Signs */}
                <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border-2 border-blue-200">
                  <h4 className="text-lg sm:text-xl font-bold text-blue-900 mb-3 sm:mb-4 flex items-center border-b border-blue-200 pb-2">
                    <span className="mr-2">💓</span>
                    สัญญาณชีพ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        กรดยูริก (mg/dL)
                      </label>
                      <input
                        type="number"
                        name="uric_acid"
                        value={metricsForm.uric_acid}
                        onChange={handleMetricsInputChange}
                        min="1"
                        max="20"
                        step="0.1"
                        placeholder="เช่น 5.5"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        ALT (U/L)
                      </label>
                      <input
                        type="number"
                        name="alt"
                        value={metricsForm.alt}
                        onChange={handleMetricsInputChange}
                        min="1"
                        max="500"
                        placeholder="เช่น 25"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        AST (U/L)
                      </label>
                      <input
                        type="number"
                        name="ast"
                        value={metricsForm.ast}
                        onChange={handleMetricsInputChange}
                        min="1"
                        max="500"
                        placeholder="เช่น 30"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        ฮีโมโกลบิน (g/dL)
                      </label>
                      <input
                        type="number"
                        name="hemoglobin"
                        value={metricsForm.hemoglobin}
                        onChange={handleMetricsInputChange}
                        min="5"
                        max="20"
                        step="0.1"
                        placeholder="เช่น 13.5"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        ฮีมาโตคริต (%)
                      </label>
                      <input
                        type="number"
                        name="hematocrit"
                        value={metricsForm.hematocrit}
                        onChange={handleMetricsInputChange}
                        min="15"
                        max="60"
                        step="0.1"
                        placeholder="เช่น 40.5"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        ธาตุเหล็ก (μg/dL)
                      </label>
                      <input
                        type="number"
                        name="iron"
                        value={metricsForm.iron}
                        onChange={handleMetricsInputChange}
                        min="10"
                        max="300"
                        placeholder="เช่น 100"
                        className="w-full px-4 py-3 bg-white border-2 border-red-300 rounded-lg text-red-900 placeholder-red-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <div>
                      <label className="block text-red-800 font-semibold mb-2">
                        TIBC (μg/dL)
                      </label>
                      <input
                        type="number"
                        name="tibc"
                        value={metricsForm.tibc}
                        onChange={handleMetricsInputChange}
                        min="200"
                        max="600"
                        placeholder="เช่น 350"
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
                        weight_kg: '',
                        uric_acid: '',
                        alt: '',
                        ast: '',
                        hemoglobin: '',
                        hematocrit: '',
                        iron: '',
                        tibc: '',
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
                    <h5 className="text-yellow-700 font-medium mb-2">ข้อควรระวัง</h5>
                    <ul className="text-yellow-500 text-sm space-y-1">
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

        {/* Lifestyle Tab */}
        {activeTab === 'lifestyle' && (
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

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`
                  ${submitMessage.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 
                    'bg-red-50 border-red-500 text-red-800'} 
                  border-2 rounded-lg p-4 mb-6 flex items-center
                `}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {submitMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold">{submitMessage.text}</span>
                    {submitMessage.type === 'success' && (
                      <span className="ml-2 text-sm text-green-600">กำลังกลับไปหน้าหลัก...</span>
                    )}
                  </div>
                </div>
              )}

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
              <form onSubmit={handleLifestyleSubmit} className="space-y-6">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-blue-900 font-semibold mb-2">
                      วันที่ <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={lifestyleForm.date}
                      onChange={handleLifestyleInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
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
                      <select 
                        name="exercise_type"
                        value={lifestyleForm.exercise_type}
                        onChange={handleLifestyleInputChange}
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      >
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
                        name="exercise_duration"
                        value={lifestyleForm.exercise_duration}
                        onChange={handleLifestyleInputChange}
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
                      <select 
                        name="exercise_intensity"
                        value={lifestyleForm.exercise_intensity}
                        onChange={handleLifestyleInputChange}
                        className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      >
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
                    disabled={isSubmitting}
                    className={`flex-1 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'} text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center border-2 border-green-600 shadow-lg`}
                  >
                    <span className="mr-2">{isSubmitting ? '⏳' : '💾'}</span>
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLifestyleForm({
                        date: new Date().toISOString().split('T')[0],
                        exercise_type: '',
                        exercise_duration: '',
                        exercise_intensity: '',
                        sleep_bedtime: '',
                        sleep_wakeup: '',
                        sleep_quality: '',
                        water_glasses: '',
                        fruits_vegetables: '',
                        supplements: '',
                        stress_level: '',
                        relaxation_minutes: '',
                        notes: ''
                      });
                      setSubmitMessage({ type: '', text: '' });
                    }}
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

        {/* Behaviors Tab */}
        {activeTab === 'behaviors' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-4 sm:p-6 border-2 border-green-300 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 border-b-2 border-green-200 pb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-green-900 flex items-center mb-3 sm:mb-0">
                  <span className="mr-2 sm:mr-3">🏃</span>
                  บันทึกพฤติกรรมสุขภาพ
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-green-600 hover:text-green-800 transition-colors bg-green-100 hover:bg-green-200 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base"
                >
                  ← กลับหน้าหลัก
                </button>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-2 animate-fade-in ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 border-green-300 text-green-800' 
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">
                      {submitMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-semibold text-sm sm:text-base">{submitMessage.text}</span>
                    {submitMessage.type === 'success' && (
                      <span className="ml-2 text-xs sm:text-sm text-green-600">กำลังกลับไปหน้าหลัก...</span>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLifestyleSubmit} className="space-y-4 sm:space-y-6">
                {/* Date */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-green-900 font-semibold mb-2 text-sm sm:text-base">
                      วันที่ <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={lifestyleForm.date}
                      onChange={handleLifestyleInputChange}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Exercise Section */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-bold text-green-900 mb-3 sm:mb-4 flex items-center">
                    <span className="mr-2">🏋️</span>
                    การออกกำลังกาย
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-800 font-medium mb-2">ประเภทการออกกำลังกาย</label>
                      <select
                        name="exercise_type"
                        value={lifestyleForm.exercise_type}
                        onChange={handleLifestyleInputChange}
                        className="w-full px-4 py-2 bg-white border border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500"
                      >
                        <option value="">เลือกประเภท</option>
                        <option value="วิ่ง">วิ่ง</option>
                        <option value="เดิน">เดิน</option>
                        <option value="ยิมนาสติก">ยิมนาสติก</option>
                        <option value="ว่ายน้ำ">ว่ายน้ำ</option>
                        <option value="ขี่จักรยาน">ขี่จักรยาน</option>
                        <option value="โยคะ">โยคะ</option>
                        <option value="ฟิตเนส">ฟิตเนส</option>
                        <option value="กีฬา">กีฬา</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-green-800 font-medium mb-2">ระยะเวลา (นาที)</label>
                      <input
                        type="number"
                        name="exercise_duration"
                        value={lifestyleForm.exercise_duration}
                        onChange={handleLifestyleInputChange}
                        min="0"
                        max="600"
                        className="w-full px-4 py-2 bg-white border border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500"
                        placeholder="เช่น 30"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-green-800 font-medium mb-2">ความเข้มข้น</label>
                    <select
                      name="exercise_intensity"
                      value={lifestyleForm.exercise_intensity}
                      onChange={handleLifestyleInputChange}
                      className="w-full px-4 py-2 bg-white border border-green-300 rounded-lg text-green-900 focus:outline-none focus:border-green-500"
                    >
                      <option value="">เลือกความเข้มข้น</option>
                      <option value="เบา">เบา - สบายๆ สามารถสนทนาได้</option>
                      <option value="ปานกลาง">ปานกลาง - เหนื่อยพอดี หายใจเร็วขึ้น</option>
                      <option value="หนัก">หนัก - เหนื่อยมาก หายใจแรง</option>
                    </select>
                  </div>
                </div>

                {/* Sleep Section */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                    <span className="mr-2">🌙</span>
                    การนอนหลับ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-purple-800 font-medium mb-2">จำนวนชั่วโมงการนอน</label>
                      <input
                        type="number"
                        name="sleep_hours"
                        value={lifestyleForm.sleep_hours}
                        onChange={handleLifestyleInputChange}
                        min="0"
                        max="24"
                        step="0.5"
                        className="w-full px-4 py-2 bg-white border border-purple-300 rounded-lg text-purple-900 focus:outline-none focus:border-purple-500"
                        placeholder="เช่น 8"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-800 font-medium mb-2">คุณภาพการนอน</label>
                      <select
                        name="sleep_quality"
                        value={lifestyleForm.sleep_quality}
                        onChange={handleLifestyleInputChange}
                        className="w-full px-4 py-2 bg-white border border-purple-300 rounded-lg text-purple-900 focus:outline-none focus:border-purple-500"
                      >
                        <option value="">เลือกคุณภาพ</option>
                        <option value="ดีมาก">ดีมาก - หลับสนิท ตื่นมาสดชื่น</option>
                        <option value="ดี">ดี - หลับได้ดี</option>
                        <option value="ปานกลาง">ปานกลาง - หลับได้แต่ไม่ลึก</option>
                        <option value="แย่">แย่ - นอนไม่หลับ หรือตื่นบ่อย</option>
                        <option value="แย่มาก">แย่มาก - นอนไม่หลับเลย</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Nutrition Section */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-orange-900 mb-4 flex items-center">
                    <span className="mr-2">🥗</span>
                    โภชนาการ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-orange-800 font-medium mb-2">น้ำดื่ม (แก้ว/วัน)</label>
                      <input
                        type="number"
                        name="water_glasses"
                        value={lifestyleForm.water_glasses}
                        onChange={handleLifestyleInputChange}
                        min="0"
                        max="20"
                        className="w-full px-4 py-2 bg-white border border-orange-300 rounded-lg text-orange-900 focus:outline-none focus:border-orange-500"
                        placeholder="เช่น 8"
                      />
                    </div>
                    <div>
                      <label className="block text-orange-800 font-medium mb-2">ผัก-ผลไม้ (ส่วน/วัน)</label>
                      <input
                        type="number"
                        name="fruits_vegetables"
                        value={lifestyleForm.fruits_vegetables}
                        onChange={handleLifestyleInputChange}
                        min="0"
                        max="15"
                        className="w-full px-4 py-2 bg-white border border-orange-300 rounded-lg text-orange-900 focus:outline-none focus:border-orange-500"
                        placeholder="เช่น 5"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-orange-800 font-medium mb-2">อาหารเสริม/วิตามิน</label>
                    <input
                      type="text"
                      name="supplements"
                      value={lifestyleForm.supplements}
                      onChange={handleLifestyleInputChange}
                      className="w-full px-4 py-2 bg-white border border-orange-300 rounded-lg text-orange-900 focus:outline-none focus:border-orange-500"
                      placeholder="เช่น วิตามินซี, แคลเซียม"
                    />
                  </div>
                </div>

                {/* Mental Health Section */}
                <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-pink-900 mb-4 flex items-center">
                    <span className="mr-2">🧘</span>
                    สุขภาพจิต
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-pink-800 font-medium mb-2">ระดับความเครียด</label>
                      <select
                        name="stress_level"
                        value={lifestyleForm.stress_level}
                        onChange={handleLifestyleInputChange}
                        className="w-full px-4 py-2 bg-white border border-pink-300 rounded-lg text-pink-900 focus:outline-none focus:border-pink-500"
                      >
                        <option value="">เลือกระดับ</option>
                        <option value="1">1 - ไม่เครียดเลย</option>
                        <option value="2">2 - เครียดเล็กน้อย</option>
                        <option value="3">3 - เครียดปานกลาง</option>
                        <option value="4">4 - เครียดมาก</option>
                        <option value="5">5 - เครียดมากที่สุด</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-pink-800 font-medium mb-2">กิจกรรมผ่อนคลาย (นาที)</label>
                      <input
                        type="number"
                        name="relaxation_minutes"
                        value={lifestyleForm.relaxation_minutes}
                        onChange={handleLifestyleInputChange}
                        min="0"
                        max="480"
                        className="w-full px-4 py-2 bg-white border border-pink-300 rounded-lg text-pink-900 focus:outline-none focus:border-pink-500"
                        placeholder="เช่น 30"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-green-900 font-semibold mb-2">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    name="notes"
                    value={lifestyleForm.notes}
                    onChange={handleLifestyleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg text-green-900 placeholder-green-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                    placeholder="บันทึกรายละเอียดเพิ่มเติมเกี่ยวกับพฤติกรรมสุขภาพของคุณ..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLifestyleForm({
                        date: new Date().toISOString().split('T')[0],
                        exercise_type: '',
                        exercise_duration: '',
                        exercise_intensity: '',
                        sleep_hours: '',
                        sleep_quality: '',
                        water_glasses: '',
                        fruits_vegetables: '',
                        supplements: '',
                        stress_level: '',
                        relaxation_minutes: '',
                        notes: ''
                      });
                      setSubmitMessage({ type: '', text: '' });
                    }}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg transition-all duration-300 font-medium"
                  >
                    เริ่มใหม่
                  </button>
                </div>
              </form>

              {/* Tips */}
              <div className="mt-8 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">💡</div>
                  <div>
                    <h5 className="text-green-900 font-semibold mb-2">เคล็ดลับพฤติกรรมสุขภาพ</h5>
                    <ul className="text-green-800 text-sm space-y-1">
                      <li>• บันทึกข้อมูลทันทีหลังทำกิจกรรมเพื่อความแม่นยำ</li>
                      <li>• การออกกำลังกายควรมีอย่างน้อย 150 นาทีต่อสัปดาห์</li>
                      <li>• นอนหลับ 7-9 ชั่วโมงต่อคืนเพื่อสุขภาพที่ดี</li>
                      <li>• ดื่มน้ำ 8-10 แก้วต่อวันและกินผัก-ผลไม้ 5 ส่วนต่อวัน</li>
                      <li>• ควรมีกิจกรรมผ่อนคลายทุกวันเพื่อลดความเครียด</li>
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
      
      {/* Health Chatbot - Always visible */}
      <HealthChatbot userProfile={userProfile} recentMetrics={recentMetrics} />
    </div>
  );
};

export default Dashboard;
