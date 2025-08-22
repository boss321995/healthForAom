import React, { useState } from 'react';
import axios from 'axios';
import { getHealthRecommendations } from '../utils/gemini';

const HealthAssessmentForm = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    gender: '',
    age: '',
    weight: '',
    height: '',
    
    // Health Metrics
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    blood_sugar_fasting: '',
    blood_sugar_random: '',
    hba1c: '',
    cholesterol_total: '',
    cholesterol_hdl: '',
    cholesterol_ldl: '',
    triglycerides: '',
    uric_acid: '',
    creatinine: '',
    
    // Lifestyle
    smoking_status: 'never',
    alcohol_frequency: 'never',
    exercise_frequency: 'never',
    sleep_hours: '',
    stress_level: 'low',
    
    // Symptoms
    symptoms: []
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSymptomChange = (symptom, checked) => {
    setFormData(prev => ({
      ...prev,
      symptoms: checked 
        ? [...prev.symptoms, symptom]
        : prev.symptoms.filter(s => s !== symptom)
    }));
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์';
    if (bmi <= 24.9) return 'น้ำหนักปกติ';
    if (bmi <= 29.9) return 'น้ำหนักเกิน';
    return 'อ้วน';
  };

  const assessRisk = () => {
    const age = parseInt(formData.age);
    const bmi = parseFloat(calculateBMI(formData.weight, formData.height));
    const systolic = parseInt(formData.systolic_bp);
    const diastolic = parseInt(formData.diastolic_bp);
    const bloodSugar = parseFloat(formData.blood_sugar_fasting);
    const cholesterol = parseFloat(formData.cholesterol_total);
    
    let risks = [];
    let recommendations = [];

    // Diabetes Risk
    if (bloodSugar > 125 || formData.hba1c > 6.5 || 
        (age > 45 && bmi > 25) || 
        formData.exercise_frequency === 'never') {
      risks.push({
        type: 'เบาหวาน',
        level: bloodSugar > 125 ? 'สูง' : 'ปานกลาง',
        color: bloodSugar > 125 ? 'text-red-400' : 'text-yellow-400'
      });
      recommendations.push('ควรตรวจน้ำตาลในเลือดเป็นประจำ');
      recommendations.push('ลดการบริโภคอาหารหวานและแป้ง');
    }

    // Cardiovascular Risk
    if (systolic > 140 || diastolic > 90 || 
        cholesterol > 240 || 
        formData.smoking_status === 'current' ||
        (age > 45 && formData.gender === 'male') ||
        (age > 55 && formData.gender === 'female')) {
      risks.push({
        type: 'โรคหัวใจและหลอดเลือด',
        level: (systolic > 160 || cholesterol > 280) ? 'สูง' : 'ปานกลาง',
        color: (systolic > 160 || cholesterol > 280) ? 'text-red-400' : 'text-yellow-400'
      });
      recommendations.push('ควรตรวจสุขภาพหัวใจเป็นประจำ');
      if (formData.smoking_status === 'current') {
        recommendations.push('ควรเลิกสูบบุหรี่');
      }
    }

    // Obesity Risk
    if (bmi > 25) {
      risks.push({
        type: 'โรคอ้วน',
        level: bmi > 30 ? 'สูง' : 'ปานกลาง',
        color: bmi > 30 ? 'text-red-400' : 'text-yellow-400'
      });
      recommendations.push('ควรลดน้ำหนักให้อยู่ในเกณฑ์ปกติ');
      recommendations.push('ออกกำลังกายสม่ำเสมอ อย่างน้อย 150 นาที/สัปดาห์');
    }

    // High Blood Pressure
    if (systolic > 120 || diastolic > 80) {
      recommendations.push('ลดเกลือและโซเดียมในอาหาร');
      recommendations.push('หลีกเลี่ยงความเครียด');
    }

    // General recommendations
    if (formData.exercise_frequency === 'never' || formData.exercise_frequency === 'rarely') {
      recommendations.push('เพิ่มการออกกำลังกายให้มากขึ้น');
    }

    if (parseInt(formData.sleep_hours) < 7) {
      recommendations.push('นอนให้เพียงพอ 7-8 ชั่วโมงต่อคืน');
    }

    return { risks, recommendations };
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const bmi = calculateBMI(formData.weight, formData.height);
    const assessment = assessRisk();
    
    const resultsData = {
      bmi: {
        value: bmi,
        category: getBMICategory(bmi)
      },
      ...assessment
    };
    
    setResults(resultsData);
    
    // Get AI recommendations
    try {
      const healthData = {
        ...formData,
        bmi: bmi
      };
      const aiRecs = await getHealthRecommendations(healthData);
      setAiRecommendations(aiRecs);
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
    
    setLoading(false);
    onComplete?.(resultsData);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">ข้อมูลพื้นฐาน</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">เพศ</label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">เลือกเพศ</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">อายุ (ปี)</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="กรอกอายุ"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">น้ำหนัก (กก.)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="กรอกน้ำหนัก"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">ส่วนสูง (ซม.)</label>
          <input
            type="number"
            value={formData.height}
            onChange={(e) => handleInputChange('height', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="กรอกส่วนสูง"
          />
        </div>
      </div>

      {formData.weight && formData.height && (
        <div className="bg-cyan-500/20 border border-cyan-500 rounded-lg p-4">
          <div className="text-cyan-200 text-sm mb-1">BMI ของคุณ</div>
          <div className="text-2xl font-bold text-white">
            {calculateBMI(formData.weight, formData.height)}
          </div>
          <div className="text-cyan-300 text-sm">
            {getBMICategory(calculateBMI(formData.weight, formData.height))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">ค่าตรวจเลือด (ถ้ามี)</h3>
      <p className="text-gray-300 text-sm mb-4">
        กรอกเฉพาะค่าที่คุณทราบ หากไม่ทราบค่าใดให้ข้ามไป
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ความดันโลหิตบน (mmHg)
          </label>
          <input
            type="number"
            value={formData.systolic_bp}
            onChange={(e) => handleInputChange('systolic_bp', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 120"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ความดันโลหิตล่าง (mmHg)
          </label>
          <input
            type="number"
            value={formData.diastolic_bp}
            onChange={(e) => handleInputChange('diastolic_bp', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 80"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            น้ำตาลในเลือดขณะอด (mg/dL)
          </label>
          <input
            type="number"
            value={formData.blood_sugar_fasting}
            onChange={(e) => handleInputChange('blood_sugar_fasting', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 90"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            HbA1c (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.hba1c}
            onChange={(e) => handleInputChange('hba1c', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 5.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            คอเลสเตอรอลรวม (mg/dL)
          </label>
          <input
            type="number"
            value={formData.cholesterol_total}
            onChange={(e) => handleInputChange('cholesterol_total', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 180"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ไตรกลีเซอไรด์ (mg/dL)
          </label>
          <input
            type="number"
            value={formData.triglycerides}
            onChange={(e) => handleInputChange('triglycerides', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 120"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">พฤติกรรมสุขภาพ</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">การสูบบุหรี่</label>
          <select
            value={formData.smoking_status}
            onChange={(e) => handleInputChange('smoking_status', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="never">ไม่เคยสูบ</option>
            <option value="former">เลิกแล้ว</option>
            <option value="current">ยังสูบอยู่</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">การดื่มแอลกอฮอล์</label>
          <select
            value={formData.alcohol_frequency}
            onChange={(e) => handleInputChange('alcohol_frequency', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="never">ไม่ดื่ม</option>
            <option value="rarely">นาน ๆ ครั้ง</option>
            <option value="weekly">สัปดาห์ละครั้ง</option>
            <option value="daily">ทุกวัน</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">การออกกำลังกาย</label>
          <select
            value={formData.exercise_frequency}
            onChange={(e) => handleInputChange('exercise_frequency', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="never">ไม่เคย</option>
            <option value="rarely">นาน ๆ ครั้ง</option>
            <option value="1-2_times">1-2 ครั้ง/สัปดาห์</option>
            <option value="3-4_times">3-4 ครั้ง/สัปดาห์</option>
            <option value="daily">ทุกวัน</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">ชั่วโมงการนอนต่อคืน</label>
          <input
            type="number"
            value={formData.sleep_hours}
            onChange={(e) => handleInputChange('sleep_hours', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="เช่น 7"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">ระดับความเครียด</label>
          <select
            value={formData.stress_level}
            onChange={(e) => handleInputChange('stress_level', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="low">ต่ำ</option>
            <option value="moderate">ปานกลาง</option>
            <option value="high">สูง</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-white mb-6 text-center">
        ผลการประเมินสุขภาพ
      </h3>

      {/* BMI Results */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h4 className="text-lg font-semibold text-white mb-4">ดัชนีมวลกาย (BMI)</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-cyan-400">{results.bmi.value}</div>
            <div className="text-gray-300">{results.bmi.category}</div>
          </div>
          <div className="text-4xl">⚖️</div>
        </div>
      </div>

      {/* Risk Assessment */}
      {results.risks.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">ความเสี่ยงโรค</h4>
          <div className="space-y-3">
            {results.risks.map((risk, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white">{risk.type}</span>
                <span className={`font-semibold ${risk.color}`}>
                  ความเสี่ยง{risk.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {results.recommendations.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">คำแนะนำสุขภาพ</h4>
          <ul className="space-y-2">
            {results.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Recommendations */}
      {aiRecommendations && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            🤖 คำแนะนำจาก AI
          </h4>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h5 className="text-cyan-400 font-medium mb-2">สุขภาพโดยรวม</h5>
              <p className="text-gray-300 text-sm">{aiRecommendations.overallHealth}</p>
            </div>

            {aiRecommendations.recommendations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-green-400 font-medium mb-2">🥗 อาหาร</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {aiRecommendations.recommendations.diet?.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-blue-400 font-medium mb-2">🏃‍♂️ การออกกำลังกาย</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {aiRecommendations.recommendations.exercise?.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h5 className="text-purple-400 font-medium mb-2">💊 การใช้ชีวิต</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    {aiRecommendations.recommendations.lifestyle?.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {aiRecommendations.followUp && (
              <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
                <h5 className="text-orange-300 font-medium mb-2">📅 การติดตาม</h5>
                <p className="text-orange-200 text-sm">{aiRecommendations.followUp}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
        <p className="text-yellow-200 text-sm">
          <strong>ข้อจำกัดความรับผิดชอบ:</strong> ผลการประเมินนี้เป็นเพียงข้อมูลเบื้องต้นเท่านั้น 
          ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้ หากมีความกังวลเกี่ยวกับสุขภาพ 
          ควรปรึกษาแพทย์ผู้เชี่ยวชาญ
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className="text-white text-xl">กำลังวิเคราะห์ข้อมูลสุขภาพ...</div>
          <div className="text-gray-300 text-sm mt-2">กรุณารอสักครู่</div>
        </div>
      </div>
    );
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
            {renderResults()}
            
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setResults(null);
                  setAiRecommendations(null);
                  setCurrentStep(1);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                ประเมินใหม่
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="text-cyan-400 hover:text-cyan-300 mb-4 flex items-center"
            >
              ← กลับหน้าหลัก
            </button>
            <h2 className="text-3xl font-bold text-white mb-2">
              แบบประเมินสุขภาพ
            </h2>
            <div className="flex items-center mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      currentStep > step ? 'bg-cyan-500' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-gray-300">
              ขั้นตอนที่ {currentStep}/3: {
                currentStep === 1 ? 'ข้อมูลพื้นฐาน' :
                currentStep === 2 ? 'ค่าตรวจเลือด' : 'พฤติกรรมสุขภาพ'
              }
            </p>
          </div>

          {/* Form Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
              ย้อนกลับ
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && (!formData.gender || !formData.age || !formData.weight || !formData.height))
                }
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                ถัดไป
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all"
              >
                ดูผลการประเมิน
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthAssessmentForm;
