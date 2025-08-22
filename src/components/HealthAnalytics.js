import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HealthAnalytics = () => {
  const [trends, setTrends] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('trends');

  useEffect(() => {
    fetchHealthAnalytics();
  }, [selectedTimeRange]);

  const fetchHealthAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [trendsRes, predictionsRes, insightsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/health-analytics/trends/${selectedTimeRange}`, { headers }),
        axios.get('http://localhost:5000/api/health-analytics/predictions', { headers }),
        axios.get('http://localhost:5000/api/health-analytics/insights', { headers })
      ]);

      setTrends(trendsRes.data.data);
      setPredictions(predictionsRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (error) {
      console.error('Error fetching health analytics:', error);
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedTimeRange === range
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {range === '1month' ? '1 เดือน' : 
             range === '3months' ? '3 เดือน' :
             range === '6months' ? '6 เดือน' : '1 ปี'}
          </button>
        ))}
      </div>

      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BMI Trend */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">⚖️</span>
              แนวโน้ม BMI
            </h3>
            {trends.trends.bmi.trend !== 'no_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">BMI ปัจจุบัน</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    {trends.trends.bmi.current}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">หมวดหมู่</span>
                  <span className="text-white">{trends.trends.bmi.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">แนวโน้ม</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trends.trends.bmi.trend === 'increasing' ? 'bg-red-500/20 text-red-300' :
                    trends.trends.bmi.trend === 'decreasing' ? 'bg-green-500/20 text-green-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {trends.trends.bmi.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bmi.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Blood Pressure Trend */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">💓</span>
              แนวโน้มความดันโลหิต
            </h3>
            {trends.trends.bloodPressure.trend !== 'insufficient_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">ค่าเฉลี่ย</span>
                  <span className="text-white">
                    {trends.trends.bloodPressure.averages.systolic}/
                    {trends.trends.bloodPressure.averages.diastolic}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">ระดับความเสี่ยง</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trends.trends.bloodPressure.riskLevel === 'high' ? 'bg-red-500/20 text-red-300' :
                    trends.trends.bloodPressure.riskLevel === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {trends.trends.bloodPressure.riskLevel === 'high' ? 'สูง' :
                     trends.trends.bloodPressure.riskLevel === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">แนวโน้ม</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trends.trends.bloodPressure.trend === 'increasing' ? 'bg-red-500/20 text-red-300' :
                    trends.trends.bloodPressure.trend === 'decreasing' ? 'bg-green-500/20 text-green-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {trends.trends.bloodPressure.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bloodPressure.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Blood Sugar Trend */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">🍯</span>
              แนวโน้มน้ำตาลในเลือด
            </h3>
            {trends.trends.bloodSugar.trend !== 'insufficient_data' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">ค่าเฉลี่ย</span>
                  <span className="text-white">{trends.trends.bloodSugar.average} mg/dL</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">ความเสี่ยงเบาหวาน</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trends.trends.bloodSugar.diabetesRisk === 'high' ? 'bg-red-500/20 text-red-300' :
                    trends.trends.bloodSugar.diabetesRisk === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {trends.trends.bloodSugar.diabetesRisk === 'high' ? 'สูง' :
                     trends.trends.bloodSugar.diabetesRisk === 'moderate' ? 'ปานกลาง' : 'ต่ำ'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">แนวโน้ม</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trends.trends.bloodSugar.trend === 'increasing' ? 'bg-red-500/20 text-red-300' :
                    trends.trends.bloodSugar.trend === 'decreasing' ? 'bg-green-500/20 text-green-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {trends.trends.bloodSugar.trend === 'increasing' ? 'เพิ่มขึ้น' :
                     trends.trends.bloodSugar.trend === 'decreasing' ? 'ลดลง' : 'คงที่'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอ</p>
            )}
          </div>

          {/* Overall Health Score */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              คะแนนสุขภาพรวม
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">
                {trends.trends.overall.score}
              </div>
              <div className="text-lg text-white mb-2">
                เกรด {trends.trends.overall.grade}
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                trends.trends.overall.score >= 80 ? 'bg-green-500/20 text-green-300' :
                trends.trends.overall.score >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {trends.trends.overall.score >= 80 ? 'ดีเยี่ยม' :
                 trends.trends.overall.score >= 60 ? 'ปานกลาง' : 'ต้องปรับปรุง'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">การพยากรณ์สุขภาพ</h2>
      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BMI Prediction */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">พยากรณ์ BMI (6 เดือนข้างหน้า)</h3>
            {predictions.bmi.prediction !== 'insufficient_data' ? (
              <div>
                <div className="text-2xl font-bold text-cyan-400 mb-2">
                  {predictions.bmi.prediction}
                </div>
                <p className="text-gray-300 text-sm">{predictions.bmi.recommendation}</p>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
            )}
          </div>

          {/* Blood Pressure Prediction */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">พยากรณ์ความดันโลหิต</h3>
            {predictions.bloodPressure.prediction !== 'insufficient_data' ? (
              <div>
                <div className="text-xl font-bold text-cyan-400 mb-2">
                  {predictions.bloodPressure.prediction.systolic}/
                  {predictions.bloodPressure.prediction.diastolic}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  ระดับความเสี่ยง: {predictions.bloodPressure.riskLevel === 'high' ? 'สูง' : 'ปานกลาง'}
                </div>
                <p className="text-gray-300 text-sm">{predictions.bloodPressure.recommendation}</p>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอในการพยากรณ์</p>
            )}
          </div>

          {/* Diabetes Risk */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">ความเสี่ยงเบาหวาน</h3>
            {predictions.diabetesRisk.prediction !== 'insufficient_data' ? (
              <div>
                <div className="text-xl font-bold text-cyan-400 mb-2">
                  {predictions.diabetesRisk.riskPercentage}
                </div>
                <p className="text-gray-300 text-sm">{predictions.diabetesRisk.recommendation}</p>
              </div>
            ) : (
              <p className="text-gray-400">ไม่มีข้อมูลเพียงพอในการประเมิน</p>
            )}
          </div>

          {/* Overall Health Prediction */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">แนวโน้มสุขภาพโดยรวม</h3>
            <div>
              <div className={`text-xl font-bold mb-2 ${
                predictions.overallHealth.prediction === 'improving' ? 'text-green-400' :
                predictions.overallHealth.prediction === 'stable' ? 'text-blue-400' :
                'text-red-400'
              }`}>
                {predictions.overallHealth.prediction === 'improving' ? 'ดีขึ้น' :
                 predictions.overallHealth.prediction === 'stable' ? 'คงที่' : 'แย่ลง'}
              </div>
              <p className="text-gray-300 text-sm">{predictions.overallHealth.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">ข้อมูลเชิงลึกสุขภาพ</h2>
      {insights && (
        <div className="space-y-6">
          {/* Risk Factors */}
          {insights.riskFactors.length > 0 && (
            <div className="bg-red-500/10 backdrop-blur-lg rounded-lg p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-red-300 mb-4">ปัจจัยเสี่ยงที่พบ</h3>
              <div className="space-y-3">
                {insights.riskFactors.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-white">{risk.description}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      risk.level === 'high' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {risk.level === 'high' ? 'สูง' : 'ปานกลาง'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {insights.improvements.length > 0 && (
            <div className="bg-green-500/10 backdrop-blur-lg rounded-lg p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-green-300 mb-4">จุดที่ดีขึ้น</h3>
              <div className="space-y-3">
                {insights.improvements.map((improvement, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-white">{improvement.description}</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                      {improvement.progress === 'excellent' ? 'ดีเยี่ยม' : 'ดี'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {insights.recommendations && (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">คำแนะนำจาก AI</h3>
              <div className="space-y-4">
                {insights.recommendations.recommendations?.diet && (
                  <div>
                    <h4 className="font-medium text-cyan-300 mb-2">🍎 อาหาร</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                      {insights.recommendations.recommendations.diet.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.recommendations.recommendations?.exercise && (
                  <div>
                    <h4 className="font-medium text-cyan-300 mb-2">🏃‍♂️ การออกกำลังกาย</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                      {insights.recommendations.recommendations.exercise.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.recommendations.recommendations?.lifestyle && (
                  <div>
                    <h4 className="font-medium text-cyan-300 mb-2">🌱 วิถีชีวิต</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
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
            <div className="bg-blue-500/10 backdrop-blur-lg rounded-lg p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">สิ่งที่ควรทำต่อไป</h3>
              <div className="space-y-3">
                {insights.nextActions.map((action, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-white font-medium">{action.description}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-3 ${
                      action.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                      action.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-blue-500/20 text-blue-300'
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
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className="text-white text-xl">กำลังวิเคราะห์ข้อมูลสุขภาพ...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">การวิเคราะห์สุขภาพด้วย AI</h1>
          <p className="text-gray-300">วิเคราะห์แนวโน้มสุขภาพและรับคำแนะนำเฉพาะบุคคล</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 backdrop-blur-lg rounded-lg p-1">
          {[
            { id: 'trends', label: '📈 แนวโน้ม', icon: '📈' },
            { id: 'predictions', label: '🔮 การพยากรณ์', icon: '🔮' },
            { id: 'insights', label: '💡 ข้อมูลเชิงลึก', icon: '💡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'predictions' && renderPredictionsTab()}
          {activeTab === 'insights' && renderInsightsTab()}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            <strong>ข้อจำกัดความรับผิดชอบ:</strong> การวิเคราะห์นี้เป็นเพียงข้อมูลเบื้องต้นจาก AI เท่านั้น 
            ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้ ควรปรึกษาแพทย์ผู้เชี่ยวชาญสำหรับคำแนะนำที่เฉพาะเจาะจง
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthAnalytics;
