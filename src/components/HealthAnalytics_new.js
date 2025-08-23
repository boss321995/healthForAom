import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const HealthAnalytics = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('trends');

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
        setLoading(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      const [trendsRes, predictionsRes, insightsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/health-analytics/trends/${selectedTimeRange}`, { headers }),
        axios.get('http://localhost:5000/api/health-analytics/predictions', { headers }),
        axios.get('http://localhost:5000/api/health-analytics/insights', { headers })
      ]);

      console.log('✅ HealthAnalytics API responses:');
      console.log('📈 Trends:', trendsRes.data);
      console.log('🔮 Predictions:', predictionsRes.data);
      console.log('💡 Insights:', insightsRes.data);

      setTrends(trendsRes.data.data);
      setPredictions(predictionsRes.data.data);
      setInsights(insightsRes.data.data);
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
            {trends.trends?.bmi?.trend !== 'no_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-emerald-100">
                  <span className="text-emerald-700 font-medium">BMI ปัจจุบัน</span>
                  <span className="text-2xl font-bold text-emerald-900">
                    {trends.trends?.bmi?.current || '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-emerald-100">
                  <span className="text-emerald-700 font-medium">หมวดหมู่</span>
                  <span className="text-emerald-900 font-semibold">{trends.trends?.bmi?.category || '--'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-emerald-700 font-medium">แนวโน้ม</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                    trends.trends.bmi.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-300' :
                    trends.trends.bmi.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-300' :
                    'bg-blue-50 text-blue-800 border-blue-300'
                  }`}>
                    {trends.trends.bmi.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bmi.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอ</p>
            )}
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
                    {trends.trends.bloodPressure.averages?.systolic || '--'}/
                    {trends.trends.bloodPressure.averages?.diastolic || '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-red-100">
                  <span className="text-red-700 font-medium">ระดับความเสี่ยง</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                    trends.trends.bloodPressure.riskLevel === 'high' ? 'bg-red-50 text-red-800 border-red-400' :
                    trends.trends.bloodPressure.riskLevel === 'moderate' ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                    'bg-green-50 text-green-800 border-green-400'
                  }`}>
                    {trends.trends.bloodPressure.riskLevel === 'high' ? 'สูง' :
                     trends.trends.bloodPressure.riskLevel === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-red-700 font-medium">แนวโน้ม</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                    trends.trends.bloodPressure.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-400' :
                    trends.trends.bloodPressure.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-400' :
                    'bg-blue-50 text-blue-800 border-blue-400'
                  }`}>
                    {trends.trends.bloodPressure.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bloodPressure.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
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
            {trends.trends?.bloodSugar?.trend !== 'insufficient_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-amber-100">
                  <span className="text-amber-700 font-medium">ค่าเฉลี่ย</span>
                  <span className="text-amber-900 font-semibold">{trends.trends.bloodSugar.average || '--'} mg/dL</span>
                </div>
                <div className="flex items-center justify-between mb-2 py-2 border-b border-amber-100">
                  <span className="text-amber-700 font-medium">ความเสี่ยงเบาหวาน</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                    trends.trends.bloodSugar.diabetesRisk === 'high' ? 'bg-red-50 text-red-800 border-red-400' :
                    trends.trends.bloodSugar.diabetesRisk === 'moderate' ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                    'bg-green-50 text-green-800 border-green-400'
                  }`}>
                    {trends.trends.bloodSugar.diabetesRisk === 'high' ? 'สูง' :
                     trends.trends.bloodSugar.diabetesRisk === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-amber-700 font-medium">แนวโน้ม</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                    trends.trends.bloodSugar.trend === 'increasing' ? 'bg-red-50 text-red-800 border-red-400' :
                    trends.trends.bloodSugar.trend === 'decreasing' ? 'bg-green-50 text-green-800 border-green-400' :
                    'bg-blue-50 text-blue-800 border-blue-400'
                  }`}>
                    {trends.trends.bloodSugar.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bloodSugar.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Overall Health Score */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
            <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center border-b-2 border-blue-200 pb-2">
              <span className="text-2xl mr-2">🎯</span>
              คะแนนสุขภาพรวม
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900 mb-2">
                {trends.trends?.overall?.score || '--'}
              </div>
              <div className="text-lg text-blue-800 mb-2 font-semibold">
                เกรด {trends.trends?.overall?.grade || '--'}
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                (trends.trends?.overall?.score || 0) >= 80 ? 'bg-green-50 text-green-800 border-green-400' :
                (trends.trends?.overall?.score || 0) >= 60 ? 'bg-yellow-50 text-yellow-800 border-yellow-400' :
                'bg-red-50 text-red-800 border-red-400'
              }`}>
                {(trends.trends?.overall?.score || 0) >= 80 ? 'ดีเยี่ยม' :
                 (trends.trends?.overall?.score || 0) >= 60 ? 'ปานกลาง' : 'ต้องปรับปรุง'}
              </div>
            </div>
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

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">การพยากรณ์สุขภาพ</h2>
      {predictions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BMI Prediction */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-emerald-300 shadow-lg">
            <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b-2 border-emerald-200 pb-2">พยากรณ์ BMI (6 เดือนข้างหน้า)</h3>
            {predictions.bmi?.prediction !== 'insufficient_data' ? (
              <div>
                <div className="text-2xl font-bold text-emerald-900 mb-2">
                  {predictions.bmi.prediction || '--'}
                </div>
                <p className="text-emerald-700 text-sm font-medium">{predictions.bmi.recommendation || 'ไม่มีคำแนะนำ'}</p>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
            )}
          </div>

          {/* Blood Pressure Prediction */}
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
                <p className="text-red-700 text-sm font-medium">{predictions.bloodPressure.recommendation || 'ไม่มีคำแนะนำ'}</p>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
            )}
          </div>

          {/* Diabetes Risk */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-amber-300 shadow-lg">
            <h3 className="text-lg font-bold text-amber-800 mb-4 border-b-2 border-amber-200 pb-2">ความเสี่ยงเบาหวาน</h3>
            {predictions.diabetesRisk?.prediction !== 'insufficient_data' ? (
              <div>
                <div className="text-xl font-bold text-amber-900 mb-2">
                  {predictions.diabetesRisk.riskPercentage || '--'}
                </div>
                <p className="text-amber-700 text-sm font-medium">{predictions.diabetesRisk.recommendation || 'ไม่มีคำแนะนำ'}</p>
              </div>
            ) : (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-center font-medium">ไม่มีข้อมูลเพียงพอในการประเมิน</p>
            )}
          </div>

          {/* Overall Health Prediction */}
          <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
            <h3 className="text-lg font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2">แนวโน้มสุขภาพโดยรวม</h3>
            <div>
              <div className={`text-xl font-bold mb-2 ${
                predictions.overallHealth?.prediction === 'improving' ? 'text-green-800' :
                predictions.overallHealth?.prediction === 'stable' ? 'text-blue-800' :
                'text-red-800'
              }`}>
                {predictions.overallHealth?.prediction === 'improving' ? 'ดีขึ้น' :
                 predictions.overallHealth?.prediction === 'stable' ? 'คงที่' : 
                 predictions.overallHealth?.prediction === 'declining' ? 'แย่ลง' : '--'}
              </div>
              <p className="text-blue-700 text-sm font-medium">{predictions.overallHealth?.recommendation || 'ไม่มีคำแนะนำ'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
          <div className="text-6xl mb-4">🔮</div>
          <h3 className="text-xl font-bold text-blue-800 mb-2">ไม่มีข้อมูลการพยากรณ์</h3>
          <p className="text-blue-600 font-medium">กรุณาบันทึกข้อมูลสุขภาพเพิ่มเติมเพื่อรับการพยากรณ์</p>
        </div>
      )}
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-800 mb-6">ข้อมูลเชิงลึกสุขภาพ</h2>
      {insights ? (
        <div className="space-y-6">
          {/* Risk Factors */}
          {insights.riskFactors && insights.riskFactors.length > 0 && (
            <div className="bg-red-50 backdrop-blur-lg rounded-lg p-6 border-2 border-red-300 shadow-lg">
              <h3 className="text-lg font-bold text-red-800 mb-4 border-b-2 border-red-200 pb-2">ปัจจัยเสี่ยงที่พบ</h3>
              <div className="space-y-3">
                {insights.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <span className="text-red-800 font-medium">{risk.description}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      risk.level === 'high' ? 'bg-red-100 text-red-800 border-red-400' :
                      'bg-yellow-100 text-yellow-800 border-yellow-400'
                    }`}>
                      {risk.level === 'high' ? 'สูง' : 'ปานกลาง'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {insights.improvements && insights.improvements.length > 0 && (
            <div className="bg-green-50 backdrop-blur-lg rounded-lg p-6 border-2 border-green-300 shadow-lg">
              <h3 className="text-lg font-bold text-green-800 mb-4 border-b-2 border-green-200 pb-2">จุดที่ดีขึ้น</h3>
              <div className="space-y-3">
                {insights.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                    <span className="text-green-800 font-medium">{improvement.description}</span>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-400">
                      {improvement.progress === 'excellent' ? 'ดีเยี่ยม' : 'ดี'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {insights.recommendations && (
            <div className="bg-white/95 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2">คำแนะนำจาก AI</h3>
              <div className="space-y-4">
                {insights.recommendations.recommendations?.diet && (
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <h4 className="font-bold text-green-800 mb-2">🍎 อาหาร</h4>
                    <ul className="list-disc list-inside space-y-1 text-green-700 text-sm font-medium">
                      {insights.recommendations.recommendations.diet.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.recommendations.recommendations?.exercise && (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2">🏃‍♂️ การออกกำลังกาย</h4>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm font-medium">
                      {insights.recommendations.recommendations.exercise.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.recommendations.recommendations?.lifestyle && (
                  <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <h4 className="font-bold text-purple-800 mb-2">🌱 วิถีชีวิต</h4>
                    <ul className="list-disc list-inside space-y-1 text-purple-700 text-sm font-medium">
                      {insights.recommendations.recommendations.lifestyle.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Actions */}
          {insights.nextActions && insights.nextActions.length > 0 && (
            <div className="bg-blue-50 backdrop-blur-lg rounded-lg p-6 border-2 border-blue-300 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4 border-b-2 border-blue-200 pb-2">สิ่งที่ควรทำต่อไป</h3>
              <div className="space-y-3">
                {insights.nextActions.map((action, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <div className="text-blue-800 font-medium">{action.description}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ml-3 border-2 ${
                      action.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-400' :
                      action.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-400' :
                      'bg-blue-100 text-blue-800 border-blue-400'
                    }`}>
                      {action.priority === 'urgent' ? 'ด่วน' :
                       action.priority === 'high' ? 'สำคัญ' : 'ปานกลาง'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-xl font-bold text-blue-800 mb-2">ไม่มีข้อมูลเชิงลึก</h3>
          <p className="text-blue-600 font-medium">กรุณาบันทึกข้อมูลสุขภาพเพิ่มเติมเพื่อรับข้อมูลเชิงลึก</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-blue-800 text-xl font-medium">กำลังวิเคราะห์ข้อมูลสุขภาพ...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">การวิเคราะห์สุขภาพด้วย AI</h1>
          <p className="text-blue-600">วิเคราะห์แนวโน้มสุขภาพและรับคำแนะนำเฉพาะบุคคล</p>
        </div>

        {/* Debug Panel */}
        <div className="mb-6 p-4 bg-white/90 rounded-lg border-2 border-blue-200 shadow-lg">
          <div className="text-sm text-blue-800 mb-2 font-semibold">🔧 System Status:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="text-blue-700">
              User: <span className="text-blue-900 font-semibold">{user ? user.username : 'None'}</span>
            </div>
            <div className="text-blue-700">
              Token: <span className="text-blue-900 font-semibold">{localStorage.getItem('healthToken') ? 'Present' : 'Missing'}</span>
            </div>
            <div className="text-blue-700">
              Trends: <span className="text-blue-900 font-semibold">{trends ? 'Loaded' : 'None'}</span>
            </div>
            <div className="text-blue-700">
              Time Range: <span className="text-blue-900 font-semibold">{selectedTimeRange}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/90 backdrop-blur-lg rounded-lg p-1 border-2 border-blue-200 shadow-lg">
          {[
            { id: 'trends', label: '📈 แนวโน้ม', icon: '📈' },
            { id: 'predictions', label: '🔮 การพยากรณ์', icon: '🔮' },
            { id: 'insights', label: '💡 ข้อมูลเชิงลึก', icon: '💡' }
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
