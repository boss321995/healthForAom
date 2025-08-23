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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-lg border-b-2 border-blue-300 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-800">HealthHub</h1>
              <span className="ml-2 text-blue-600">🏥</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={onLogin}
                className="text-blue-800 hover:text-blue-900 px-4 py-2 rounded-lg bg-white/80 hover:bg-white/90 transition-all font-semibold border border-blue-300"
              >
                เข้าสู่ระบบ
              </button>
              <button
                onClick={handleStartAssessment}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-bold border-2 border-green-500 shadow-lg transition-all"
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
          <h1 className="text-5xl md:text-7xl font-bold text-blue-800 mb-8">
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              ตรวจสุขภาพ
            </span>
            <br />
            <span className="text-4xl md:text-5xl text-blue-700">ออนไลน์ฟรี</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-700 mb-12 max-w-4xl mx-auto font-semibold">
            วิเคราะห์ความเสี่ยงสุขภาพของคุณ คำนวณ BMI ประเมินโรคเบาหวาน โรคหัวใจ 
            พร้อมคำแนะนำจากผู้เชี่ยวชาญ
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleStartAssessment}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg text-lg font-bold border-2 border-emerald-500 shadow-lg transform hover:scale-105 transition-all"
            >
              🩺 เริ่มตรวจสุขภาพเลย
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/95 hover:bg-blue-50 text-blue-800 px-8 py-4 rounded-lg text-lg font-bold border-2 border-blue-300 transition-all shadow-lg"
            >
              📋 ดูฟีเจอร์ทั้งหมด
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center bg-white/90 rounded-lg p-4 shadow-lg border border-blue-200">
              <div className="text-3xl md:text-4xl font-bold text-emerald-600 mb-2">10+</div>
              <div className="text-blue-800 font-semibold">ค่าตรวจสุขภาพ</div>
            </div>
            <div className="text-center bg-white/90 rounded-lg p-4 shadow-lg border border-blue-200">
              <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">5</div>
              <div className="text-blue-800 font-semibold">โรคที่ประเมินได้</div>
            </div>
            <div className="text-center bg-white/90 rounded-lg p-4 shadow-lg border border-blue-200">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-blue-800 font-semibold">บริการตลอดเวลา</div>
            </div>
            <div className="text-center bg-white/90 rounded-lg p-4 shadow-lg border border-blue-200">
              <div className="text-3xl md:text-4xl font-bold text-amber-600 mb-2">ฟรี</div>
              <div className="text-blue-800 font-semibold">ไม่มีค่าใช้จ่าย</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-blue-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-blue-800 mb-4">
              ฟีเจอร์ครบครัน เพื่อสุขภาพที่ดี
            </h2>
            <p className="text-xl text-blue-700 max-w-3xl mx-auto font-semibold">
              ระบบวิเคราะห์สุขภาพอัจฉริยะ ให้คำแนะนำแบบส่วนบุคคล
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-blue-300 hover:border-blue-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">วิเคราะห์ค่าตรวจเลือด</h3>
              <p className="text-blue-700 font-medium">
                วิเคราะห์ค่าน้ำตาล คอเลสเตอรอล ไขมัน และค่าอื่นๆ 
                พร้อมแสดงผลด้วยสีและกราฟที่เข้าใจง่าย
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-emerald-300 hover:border-emerald-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-bold text-emerald-800 mb-3">คำนวณ BMI & BMR</h3>
              <p className="text-emerald-700 font-medium">
                คำนวณดัชนีมวลกายและอัตราการเผาผลาญพลังงาน 
                พร้อมแนะนำน้ำหนักที่เหมาะสม
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-red-300 hover:border-red-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-red-800 mb-3">ประเมินความเสี่ยงโรค</h3>
              <p className="text-red-700 font-medium">
                ประเมินความเสี่ยงโรคเบาหวาน โรคหัวใจ ความดันสูง 
                และโรคอื่นๆ ตามมาตรฐานสากล
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-purple-300 hover:border-purple-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-purple-800 mb-3">ติดตามสุขภาพต่อเนื่อง</h3>
              <p className="text-purple-700 font-medium">
                บันทึกค่าตรวจย้อนหลัง แสดงกราฟแนวโน้มสุขภาพ 
                เพื่อเฝ้าระวังการเปลี่ยนแปลง
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-amber-300 hover:border-amber-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-amber-800 mb-3">ระบบแจ้งเตือน</h3>
              <p className="text-amber-700 font-medium">
                แจ้งเตือนเวลาตรวจสุขภาพประจำปี 
                และเมื่อค่าตรวจมีความผิดปกติ
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/95 rounded-lg p-6 border-2 border-indigo-300 hover:border-indigo-400 transition-all shadow-lg">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-indigo-800 mb-3">รายงานสรุปผล</h3>
              <p className="text-indigo-700 font-medium">
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
            <h2 className="text-4xl font-bold text-blue-800 mb-4">
              วิธีใช้งาน ง่ายเพียง 3 ขั้นตอน
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center bg-white/90 rounded-lg p-6 shadow-lg border border-blue-200">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">กรอกข้อมูลสุขภาพ</h3>
              <p className="text-blue-700 font-medium">
                กรอกข้อมูลส่วนตัว น้ำหนัก ส่วนสูง และค่าตรวจเลือด (ถ้ามี)
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center bg-white/90 rounded-lg p-6 shadow-lg border border-emerald-200">
              <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-emerald-800 mb-3">ระบบวิเคราะห์อัตโนมัติ</h3>
              <p className="text-emerald-700 font-medium">
                AI วิเคราะห์ข้อมูลและประเมินความเสี่ยงสุขภาพของคุณ
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center bg-white/90 rounded-lg p-6 shadow-lg border border-purple-200">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-purple-800 mb-3">รับผลและคำแนะนำ</h3>
              <p className="text-purple-700 font-medium">
                ดูผลการวิเคราะห์พร้อมคำแนะนำสุขภาพแบบส่วนบุคคล
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Health Categories */}
      <section className="py-20 bg-blue-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-blue-800 mb-4">
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
              <div key={index} className="bg-white/95 rounded-lg p-4 border-2 border-blue-300 text-center hover:border-blue-400 transition-all shadow-lg">
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="text-blue-800 font-bold mb-1">{item.name}</h3>
                <p className="text-blue-600 text-sm font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="bg-white/95 rounded-lg p-8 shadow-lg border-2 border-blue-300">
            <h2 className="text-4xl font-bold text-blue-800 mb-4">
              เริ่มดูแลสุขภาพวันนี้
            </h2>
            <p className="text-xl text-blue-700 mb-8 font-semibold">
              ไม่ต้องรอ ไม่ต้องจ่าย เริ่มตรวจสุขภาพออนไลน์ได้เลย
            </p>
            <button
              onClick={handleStartAssessment}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg text-lg font-bold border-2 border-emerald-500 shadow-lg transform hover:scale-105 transition-all"
            >
              🚀 เริ่มตรวจสุขภาพฟรี
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/90 border-t-2 border-blue-300 py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-blue-800">HealthHub</h3>
              <span className="ml-2 text-blue-600">🏥</span>
            </div>
            <div className="text-blue-600 text-sm font-medium">
              © 2025 HealthHub. สำหรับการศึกษาและให้ข้อมูลเบื้องต้นเท่านั้น
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
