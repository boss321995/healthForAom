import React, { useState } from 'react';
import axios from 'axios';

const PostRegistrationAssessment = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Lifestyle Assessment
    smoking_status: 'never',
    smoking_years: '',
    smoking_pack_per_day: '',
    smoking_quit_attempts: '',
    
    alcohol_frequency: 'never',
    alcohol_type: '',
    alcohol_amount: '',
    alcohol_binge_frequency: 'never',
    
    exercise_frequency: 'never',
    exercise_type: '',
    exercise_duration: '',
    exercise_intensity: 'light',
    
    sleep_hours: '',
    sleep_quality: 'good',
    sleep_problems: [],
    
    stress_level: 'low',
    stress_sources: [],
    coping_mechanisms: [],
    
    // Diet & Nutrition
    diet_type: 'mixed',
    vegetable_servings: '',
    fruit_servings: '',
    water_intake: '',
    fast_food_frequency: 'rarely',
    snack_frequency: 'sometimes',
    caffeine_intake: 'moderate',
    
    // Allergies & Medical History
    food_allergies: '',
    drug_allergies: '',
    environmental_allergies: '',
    current_medications: '',
    supplement_usage: '',
    medical_conditions: '',
    family_history: '',
    previous_surgeries: '',
    
    // Work & Environment
    work_environment: 'office',
    work_stress_level: 'moderate',
    screen_time_hours: '',
    commute_type: 'car',
    exposure_to_chemicals: 'no',
    
    // Mental Health
    mood_changes: 'no',
    anxiety_frequency: 'rarely',
    social_activities: 'sometimes',
    mental_health_support: 'no',
    
    // Additional Health Info
    menstrual_cycle: '', // for females
    pregnancy_plans: '', // for females
    contraceptive_use: '', // for females
    vaccination_status: 'up_to_date',
    recent_health_changes: '',
    health_goals: [],
    
    // Symptoms
    current_symptoms: [],
    chronic_symptoms: []
  });

  const totalSteps = 6;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, item, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], item]
        : prev[field].filter(i => i !== item)
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('healthToken');
      
      if (token && !token.startsWith('mock-jwt-token-')) {
        // Send to real backend
        const headers = { Authorization: `Bearer ${token}` };
        await axios.post('http://localhost:5000/api/health-assessment', formData, { headers });
        console.log('✅ Health assessment saved to backend');
      } else {
        // Save to localStorage for mock
        localStorage.setItem('healthAssessment', JSON.stringify(formData));
        console.log('📝 Health assessment saved to localStorage (mock)');
      }
      
      onComplete && onComplete(formData);
    } catch (error) {
      console.error('Error saving health assessment:', error);
      // Save to localStorage as fallback
      localStorage.setItem('healthAssessment', JSON.stringify(formData));
      onComplete && onComplete(formData);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-blue-800">แบบประเมินสุขภาพเพิ่มเติม</h2>
        <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
          ขั้นตอน {currentStep}/{totalSteps}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2">
        ข้อมูลเหล่านี้จะช่วยให้ AI วิเคราะห์สุขภาพของคุณได้แม่นยำและให้คำแนะนำที่เฉพาะเจาะจงมากขึ้น
      </p>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🚬</span>
        การสูบบุหรี่และเครื่องดื่มแอลกอฮอล์
      </h3>
      
      {/* Smoking */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-3">การสูบบุหรี่</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะการสูบบุหรี่
            </label>
            <select
              value={formData.smoking_status}
              onChange={(e) => handleInputChange('smoking_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="never">ไม่เคยสูบ</option>
              <option value="current">สูบอยู่ในปัจจุบัน</option>
              <option value="former">เคยสูบแต่เลิกแล้ว</option>
              <option value="occasional">สูบเป็นครั้งคราว</option>
            </select>
          </div>
          
          {(formData.smoking_status === 'current' || formData.smoking_status === 'former') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สูบมากี่ปีแล้ว/เคยสูบ
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={formData.smoking_years}
                    onChange={(e) => handleInputChange('smoking_years', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ปี"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนซองต่อวัน
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.smoking_pack_per_day}
                    onChange={(e) => handleInputChange('smoking_pack_per_day', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ซอง"
                  />
                </div>
              </div>
              
              {formData.smoking_status === 'former' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนครั้งที่พยายามเลิก
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.smoking_quit_attempts}
                    onChange={(e) => handleInputChange('smoking_quit_attempts', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ครั้ง"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alcohol */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 mb-3">การดื่มเครื่องดื่มแอลกอฮอล์</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ความถี่ในการดื่ม
            </label>
            <select
              value={formData.alcohol_frequency}
              onChange={(e) => handleInputChange('alcohol_frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="never">ไม่เคยดื่ม</option>
              <option value="rarely">นานๆ ครั้ง (น้อยกว่าเดือนละครั้ง)</option>
              <option value="monthly">เดือนละครั้ง</option>
              <option value="weekly">สัปดาห์ละครั้ง</option>
              <option value="few_times_week">สัปดาห์ละหลายครั้ง</option>
              <option value="daily">ทุกวัน</option>
            </select>
          </div>
          
          {formData.alcohol_frequency !== 'never' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทที่ดื่มบ่อยที่สุด
                  </label>
                  <select
                    value={formData.alcohol_type}
                    onChange={(e) => handleInputChange('alcohol_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">เลือกประเภท</option>
                    <option value="beer">เบียร์</option>
                    <option value="wine">ไวน์</option>
                    <option value="spirits">เหล้าแรง</option>
                    <option value="mixed">ผสม</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ปริมาณเฉลี่ยต่อครั้ง
                  </label>
                  <select
                    value={formData.alcohol_amount}
                    onChange={(e) => handleInputChange('alcohol_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">เลือกปริมาณ</option>
                    <option value="1-2_drinks">1-2 แก้ว</option>
                    <option value="3-4_drinks">3-4 แก้ว</option>
                    <option value="5-6_drinks">5-6 แก้ว</option>
                    <option value="7+_drinks">มากกว่า 6 แก้ว</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ความถี่ในการดื่มมากเกินไป (Binge Drinking)
                </label>
                <select
                  value={formData.alcohol_binge_frequency}
                  onChange={(e) => handleInputChange('alcohol_binge_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="never">ไม่เคย</option>
                  <option value="rarely">นานๆ ครั้ง</option>
                  <option value="monthly">เดือนละครั้ง</option>
                  <option value="weekly">สัปดาห์ละครั้ง</option>
                  <option value="frequent">บ่อยครั้ง</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🏃‍♂️</span>
        การออกกำลังกายและการนอนหลับ
      </h3>
      
      {/* Exercise */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-3">การออกกำลังกาย</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ความถี่ในการออกกำลังกาย
            </label>
            <select
              value={formData.exercise_frequency}
              onChange={(e) => handleInputChange('exercise_frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="never">ไม่เคยออกกำลังกาย</option>
              <option value="rarely">นานๆ ครั้ง</option>
              <option value="1-2_week">สัปดาห์ละ 1-2 ครั้ง</option>
              <option value="3-4_week">สัปดาห์ละ 3-4 ครั้ง</option>
              <option value="5+_week">สัปดาห์ละ 5 ครั้งขึ้นไป</option>
              <option value="daily">ทุกวัน</option>
            </select>
          </div>
          
          {formData.exercise_frequency !== 'never' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการออกกำลังกายหลัก
                  </label>
                  <select
                    value={formData.exercise_type}
                    onChange={(e) => handleInputChange('exercise_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">เลือกประเภท</option>
                    <option value="walking">เดิน</option>
                    <option value="running">วิ่ง</option>
                    <option value="cycling">ปั่นจักรยาน</option>
                    <option value="swimming">ว่ายน้ำ</option>
                    <option value="gym">ยิม/เวทเทรนนิ่ง</option>
                    <option value="yoga">โยคะ</option>
                    <option value="sports">กีฬา</option>
                    <option value="dancing">เต้นรำ</option>
                    <option value="mixed">ผสมหลายประเภท</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ระยะเวลาเฉลี่ยต่อครั้ง (นาที)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={formData.exercise_duration}
                    onChange={(e) => handleInputChange('exercise_duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="นาที"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ความหนักของการออกกำลังกาย
                </label>
                <select
                  value={formData.exercise_intensity}
                  onChange={(e) => handleInputChange('exercise_intensity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">เบา (หายใจปกติ)</option>
                  <option value="moderate">ปานกลาง (หายใจเร็วขึ้นเล็กน้อย)</option>
                  <option value="vigorous">หนัก (หายใจเร็วมาก, เหงื่อออก)</option>
                  <option value="intense">หนักมาก (หายใจรุนแรง)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sleep */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-800 mb-3">การนอนหลับ</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนชั่วโมงการนอนเฉลี่ยต่อวัน
              </label>
              <input
                type="number"
                min="3"
                max="15"
                step="0.5"
                value={formData.sleep_hours}
                onChange={(e) => handleInputChange('sleep_hours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ชั่วโมง"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                คุณภาพการนอน
              </label>
              <select
                value={formData.sleep_quality}
                onChange={(e) => handleInputChange('sleep_quality', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="excellent">ดีมาก</option>
                <option value="good">ดี</option>
                <option value="fair">ปานกลาง</option>
                <option value="poor">แย่</option>
                <option value="very_poor">แย่มาก</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ปัญหาการนอน (เลือกได้หลายข้อ)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'นอนไม่หลับ',
                'ตื่นกลางคืน',
                'ตื่นเช้าเกินไป',
                'นอนกรน',
                'ขาไม่สงบ',
                'ฝันร้าย',
                'หายใจหยุด',
                'ไม่มีปัญหา'
              ].map(problem => (
                <label key={problem} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.sleep_problems.includes(problem)}
                    onChange={(e) => handleArrayInputChange('sleep_problems', problem, e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{problem}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🥗</span>
        โภชนาการและการกิน
      </h3>
      
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รูปแบบการกิน
            </label>
            <select
              value={formData.diet_type}
              onChange={(e) => handleInputChange('diet_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mixed">ผสม (เนื้อสัตว์ + พืช)</option>
              <option value="vegetarian">มังสวิรัติ</option>
              <option value="vegan">มังสะหรง (ไม่กินผลิตภัณฑ์จากสัตว์)</option>
              <option value="pescatarian">กินปลาเท่านั้น</option>
              <option value="keto">คีโต</option>
              <option value="intermittent_fasting">อดอาหารเป็นช่วง</option>
              <option value="low_carb">คาร์บต่ำ</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ผักต่อวัน (ส่วน)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.vegetable_servings}
                onChange={(e) => handleInputChange('vegetable_servings', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ผลไม้ต่อวัน (ส่วน)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.fruit_servings}
                onChange={(e) => handleInputChange('fruit_servings', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                น้ำต่อวัน (แก้ว)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.water_intake}
                onChange={(e) => handleInputChange('water_intake', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น 8"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ความถี่อาหารจานด่วน
              </label>
              <select
                value={formData.fast_food_frequency}
                onChange={(e) => handleInputChange('fast_food_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="never">ไม่เคยกิน</option>
                <option value="rarely">นานๆ ครั้ง</option>
                <option value="weekly">สัปดาห์ละครั้ง</option>
                <option value="few_times_week">สัปดาห์ละหลายครั้ง</option>
                <option value="daily">ทุกวัน</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                การกินของว่าง
              </label>
              <select
                value={formData.snack_frequency}
                onChange={(e) => handleInputChange('snack_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="never">ไม่กิน</option>
                <option value="rarely">นานๆ ครั้ง</option>
                <option value="sometimes">บางครั้ง</option>
                <option value="often">บ่อยครั้ง</option>
                <option value="always">ตลอดเวลา</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              การบริโภคคาเฟอีน
            </label>
            <select
              value={formData.caffeine_intake}
              onChange={(e) => handleInputChange('caffeine_intake', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">ไม่ดื่ม</option>
              <option value="low">น้อย (1-2 แก้วต่อวัน)</option>
              <option value="moderate">ปานกลาง (3-4 แก้วต่อวัน)</option>
              <option value="high">มาก (5+ แก้วต่อวัน)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🤧</span>
        อาการแพ้และประวัติการรักษา
      </h3>
      
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อาการแพ้อาหาร
            </label>
            <textarea
              rows="2"
              value={formData.food_allergies}
              onChange={(e) => handleInputChange('food_allergies', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น แพ้กุ้ง, แพ้ถั่วลิสง, แพ้นม (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อาการแพ้ยา
            </label>
            <textarea
              rows="2"
              value={formData.drug_allergies}
              onChange={(e) => handleInputChange('drug_allergies', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น แพ้เพนิซิลลิน, แพ้แอสไพริน (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อาการแพ้สิ่งแวดล้อม
            </label>
            <textarea
              rows="2"
              value={formData.environmental_allergies}
              onChange={(e) => handleInputChange('environmental_allergies', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น แพ้ฝุ่น, แพ้เกสรดอกไม้, แพ้ขนสัตว์ (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ยาที่รับประทานปัจจุบัน
            </label>
            <textarea
              rows="2"
              value={formData.current_medications}
              onChange={(e) => handleInputChange('current_medications', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ระบุชื่อยาและขนาด (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วิตามินและอาหารเสริม
            </label>
            <textarea
              rows="2"
              value={formData.supplement_usage}
              onChange={(e) => handleInputChange('supplement_usage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น วิตามินซี, แคลเซียม, โปรตีน (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              โรคประจำตัว/ประวัติการรักษา
            </label>
            <textarea
              rows="3"
              value={formData.medical_conditions}
              onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น เบาหวาน, ความดันสูง, โรคหัวใจ, โรคไต (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประวัติครอบครัว (โรคทางพันธุกรรม)
            </label>
            <textarea
              rows="3"
              value={formData.family_history}
              onChange={(e) => handleInputChange('family_history', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น พ่อเป็นเบาหวาน, แม่เป็นความดันสูง, ญาติเป็นมะเร็ง (หากไม่มีให้ใส่ 'ไม่มี')"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">😌</span>
        ความเครียดและสุขภาพจิต
      </h3>
      
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ระดับความเครียดโดยรวม
              </label>
              <select
                value={formData.stress_level}
                onChange={(e) => handleInputChange('stress_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="very_low">ต่ำมาก</option>
                <option value="low">ต่ำ</option>
                <option value="moderate">ปานกลาง</option>
                <option value="high">สูง</option>
                <option value="very_high">สูงมาก</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ความถี่ความวิตกกังวล
              </label>
              <select
                value={formData.anxiety_frequency}
                onChange={(e) => handleInputChange('anxiety_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="never">ไม่เคย</option>
                <option value="rarely">นานๆ ครั้ง</option>
                <option value="sometimes">บางครั้ง</option>
                <option value="often">บ่อยครั้ง</option>
                <option value="always">ตลอดเวลา</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              แหล่งที่มาของความเครียดหลัก (เลือกได้หลายข้อ)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'งาน/การศึกษา',
                'เงิน/การเงิน',
                'ความสัมพันธ์',
                'ครอบครัว',
                'สุขภาพ',
                'สังคม',
                'อนาคต',
                'อื่นๆ'
              ].map(source => (
                <label key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.stress_sources.includes(source)}
                    onChange={(e) => handleArrayInputChange('stress_sources', source, e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{source}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วิธีการจัดการความเครียด (เลือกได้หลายข้อ)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'ออกกำลังกาย',
                'ดูหนัง/ฟังเพลง',
                'อ่านหนังสือ',
                'สมาธิ/โยคะ',
                'คุยกับเพื่อน',
                'นอนหลับ',
                'กิน/ดื่ม',
                'ไม่มีวิธี'
              ].map(mechanism => (
                <label key={mechanism} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.coping_mechanisms.includes(mechanism)}
                    onChange={(e) => handleArrayInputChange('coping_mechanisms', mechanism, e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{mechanism}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                การเปลี่ยนแปลงอารมณ์
              </label>
              <select
                value={formData.mood_changes}
                onChange={(e) => handleInputChange('mood_changes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="no">ไม่มี</option>
                <option value="mild">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                กิจกรรมทางสังคม
              </label>
              <select
                value={formData.social_activities}
                onChange={(e) => handleInputChange('social_activities', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="very_active">ออกสังคมมาก</option>
                <option value="active">ออกสังคมบ่อย</option>
                <option value="sometimes">บางครั้ง</option>
                <option value="rarely">นานๆ ครั้ง</option>
                <option value="never">ไม่ออกสังคม</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🎯</span>
        เป้าหมายและข้อมูลเพิ่มเติม
      </h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เป้าหมายสุขภาพของคุณ (เลือกได้หลายข้อ)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'ลดน้ำหนัก',
                'เพิ่มน้ำหนัก',
                'เพิ่มกล้ามเนื้อ',
                'ปรับปรุงสมรรถภาพ',
                'ลดความเครียด',
                'นอนหลับดีขึ้น',
                'เลิกสูบบุหรี่',
                'ลดการดื่มแอลกอฮอล์',
                'กินอาหารดีขึ้น',
                'ควบคุมโรคประจำตัว',
                'ป้องกันโรค',
                'อื่นๆ'
              ].map(goal => (
                <label key={goal} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.health_goals.includes(goal)}
                    onChange={(e) => handleArrayInputChange('health_goals', goal, e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{goal}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              การเปลี่ยนแปลงสุขภาพล่าสุด (3 เดือนที่ผ่านมา)
            </label>
            <textarea
              rows="3"
              value={formData.recent_health_changes}
              onChange={(e) => handleInputChange('recent_health_changes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="เช่น น้ำหนักเพิ่ม/ลด, อาการใหม่ที่เกิดขึ้น, การเปลี่ยนแปลงรูปแบบการกิน/ออกกำลังกาย"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานะการฉีดวัคซีน
              </label>
              <select
                value={formData.vaccination_status}
                onChange={(e) => handleInputChange('vaccination_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="up_to_date">ครบตามกำหนด</option>
                <option value="partially">ไม่ครบ</option>
                <option value="none">ไม่เคยฉีด</option>
                <option value="unknown">ไม่ทราบ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนชั่วโมงหน้าจอต่อวัน
              </label>
              <input
                type="number"
                min="0"
                max="24"
                value={formData.screen_time_hours}
                onChange={(e) => handleInputChange('screen_time_hours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ชั่วโมง"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อาการที่มีอยู่ในปัจจุบัน (เลือกได้หลายข้อ)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'ปวดหัว',
                'ปวดหลัง',
                'ปวดคอ/ไหล่',
                'อ่อนเพลีย',
                'นอนไม่หลับ',
                'ใจสั่น',
                'หายใจลำบาก',
                'ท้องเสีย',
                'ท้องผูก',
                'ผื่นแพ้',
                'ไม่มีอาการ',
                'อื่นๆ'
              ].map(symptom => (
                <label key={symptom} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.current_symptoms.includes(symptom)}
                    onChange={(e) => handleArrayInputChange('current_symptoms', symptom, e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{symptom}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {renderStepIndicator()}
        
        <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-200">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg transition-all duration-200 font-medium"
                >
                  ← ก่อนหน้า
                </button>
              )}
              
              <button
                onClick={onSkip}
                className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 border-2 border-gray-200 rounded-lg transition-all duration-200 font-medium"
              >
                ข้ามไปก่อน
              </button>
            </div>
            
            <div>
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-blue-600 rounded-lg transition-all duration-200 font-medium"
                >
                  ถัดไป →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-green-600 rounded-lg transition-all duration-200 font-bold disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      กำลังบันทึก...
                    </div>
                  ) : (
                    '✅ เสร็จสิ้น'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Info Box */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-500 mr-2">💡</span>
            <div className="text-sm text-yellow-700">
              <div className="font-medium mb-1">ทำไมต้องกรอกข้อมูลเหล่านี้?</div>
              <ul className="space-y-1 text-yellow-600">
                <li>• ช่วยให้ AI วิเคราะห์ความเสี่ยงสุขภาพได้แม่นยำมากขึ้น</li>
                <li>• ให้คำแนะนำที่เฉพาะเจาะจงสำหรับตัวคุณ</li>
                <li>• ติดตามความคืบหน้าสุขภาพในระยะยาว</li>
                <li>• คุณสามารถอัปเดตข้อมูลได้ตลอดเวลา</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostRegistrationAssessment;
