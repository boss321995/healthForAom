import React, { useEffect } from 'react';
import { trackPageView, trackAssessmentStart, trackFeatureView } from '../utils/analytics';

const LandingPage = ({ onStartAssessment, onLogin, onRegister }) => {
  useEffect(() => {
    try {
      trackPageView('/');
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
  }, []);

  const handleStartAssessment = () => {
    try {
      trackAssessmentStart();
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
    onStartAssessment();
  };

  const handleFeatureView = (feature) => {
    try {
      trackFeatureView(feature);
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">HealthHub</h1>
              <span className="ml-2 text-cyan-400">🏥</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={onLogin}
                className="text-white hover:text-cyan-300 px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                เข้าสู่ระบบ
              </button>
              <button
                onClick={handleStartAssessment}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all"
              >
                เริ่มใช้งาน
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              ตรวจสุขภาพ
            </span>
            <br />
            <span className="text-4xl md:text-5xl">ออนไลน์ฟรี</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
            วิเคราะห์ความเสี่ยงสุขภาพของคุณ คำนวณ BMI ประเมินโรคเบาหวาน โรคหัวใจ 
            พร้อมคำแนะนำจากผู้เชี่ยวชาญ
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleStartAssessment}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg transform hover:scale-105 transition-all"
            >
              🩺 เริ่มตรวจสุขภาพเลย
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-medium border border-white/30 transition-all"
            >
              📋 ดูฟีเจอร์ทั้งหมด
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">10+</div>
              <div className="text-gray-300">ค่าตรวจสุขภาพ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">5</div>
              <div className="text-gray-300">โรคที่ประเมินได้</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-gray-300">บริการตลอดเวลา</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">ฟรี</div>
              <div className="text-gray-300">ไม่มีค่าใช้จ่าย</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              ฟีเจอร์ครบครัน เพื่อสุขภาพที่ดี
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              ระบบวิเคราะห์สุขภาพอัจฉริยะ ให้คำแนะนำแบบส่วนบุคคล
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">วิเคราะห์ค่าตรวจเลือด</h3>
              <p className="text-gray-300">
                วิเคราะห์ค่าน้ำตาล คอเลสเตอรอล ไขมัน และค่าอื่นๆ 
                พร้อมแสดงผลด้วยสีและกราฟที่เข้าใจง่าย
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold text-white mb-3">คำนวณ BMI & BMR</h3>
              <p className="text-gray-300">
                คำนวณดัชนีมวลกายและอัตราการเผาผลาญพลังงาน 
                พร้อมแนะนำน้ำหนักที่เหมาะสม
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-3">ประเมินความเสี่ยงโรค</h3>
              <p className="text-gray-300">
                ประเมินความเสี่ยงโรคเบาหวาน โรคหัวใจ ความดันสูง 
                และโรคอื่นๆ ตามมาตรฐานสากล
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white mb-3">ติดตามสุขภาพต่อเนื่อง</h3>
              <p className="text-gray-300">
                บันทึกค่าตรวจย้อนหลัง แสดงกราฟแนวโน้มสุขภาพ 
                เพื่อเฝ้าระวังการเปลี่ยนแปลง
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-white mb-3">ระบบแจ้งเตือน</h3>
              <p className="text-gray-300">
                แจ้งเตือนเวลาตรวจสุขภาพประจำปี 
                และเมื่อค่าตรวจมีความผิดปกติ
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-3">รายงานสรุปผล</h3>
              <p className="text-gray-300">
                ดาวน์โหลดรายงานสุขภาพ PDF 
                นำไปปรึกษาแพทย์ได้ทันที
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              วิธีใช้งาน ง่ายเพียง 3 ขั้นตอน
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">กรอกข้อมูลสุขภาพ</h3>
              <p className="text-gray-300">
                กรอกข้อมูลส่วนตัว น้ำหนัก ส่วนสูง และค่าตรวจเลือด (ถ้ามี)
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">ระบบวิเคราะห์อัตโนมัติ</h3>
              <p className="text-gray-300">
                AI วิเคราะห์ข้อมูลและประเมินความเสี่ยงสุขภาพของคุณ
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">รับผลและคำแนะนำ</h3>
              <p className="text-gray-300">
                ดูผลการวิเคราะห์พร้อมคำแนะนำสุขภาพแบบส่วนบุคคล
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Health Categories */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              ค่าสุขภาพที่ตรวจได้
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: 'น้ำตาลในเลือด', icon: '🍯', desc: 'FBS, HbA1c' },
              { name: 'คอเลสเตอรอล', icon: '🧈', desc: 'Total, HDL, LDL' },
              { name: 'ความดันโลหิต', icon: '💓', desc: 'Systolic/Diastolic' },
              { name: 'ดัชนีมวลกาย', icon: '⚖️', desc: 'BMI, BMR' },
              { name: 'การทำงานไต', icon: '🫘', desc: 'Creatinine, BUN' },
              { name: 'กรดยูริก', icon: '💎', desc: 'Uric Acid' },
              { name: 'การทำงานตับ', icon: '🫁', desc: 'ALT, AST' },
              { name: 'ไขมันในเลือด', icon: '🔴', desc: 'Triglyceride' },
              { name: 'ฮีโมโกลบิน', icon: '🩸', desc: 'Hb, Hct' },
              { name: 'ธาตุเหล็ก', icon: '🔗', desc: 'Iron, TIBC' }
            ].map((item, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 text-center hover:bg-white/15 transition-all">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-white font-medium mb-1">{item.name}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            เริ่มดูแลสุขภาพวันนี้
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            ไม่ต้องรอ ไม่ต้องจ่าย เริ่มตรวจสุขภาพออนไลน์ได้เลย
          </p>
          <button
            onClick={handleStartAssessment}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg transform hover:scale-105 transition-all"
          >
            🚀 เริ่มตรวจสุขภาพฟรี
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-white">HealthHub</h3>
              <span className="ml-2 text-cyan-400">🏥</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 HealthHub. สำหรับการศึกษาและให้ข้อมูลเบื้องต้นเท่านั้น
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
