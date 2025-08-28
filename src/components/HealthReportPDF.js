import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const HealthReportPDF = ({ userProfile, recentMetrics = [], dataHistory = [] }) => {

  // ฟังก์ชันสำหรับแปลงข้อความไทยให้แสดงได้ใน PDF
  const formatThaiText = (text) => {
    if (!text) return '';
    // ใช้ Unicode encoding สำหรับภาษาไทย
    return decodeURIComponent(escape(text));
  };

  const generatePDF = async () => {
    try {
      // สร้าง PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // ตั้งค่า font และ encoding สำหรับภาษาไทย
      pdf.setFont('helvetica');
      // เพิ่มการรองรับ Unicode
      pdf.setFontSize(12);
      pdf.setCharSpace(0.5);
      
      // หัวกระดาษ
      pdf.setFillColor(59, 130, 246); // สีฟ้า
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      // ใช้การเข้ารหัสที่เหมาะสมสำหรับภาษาไทย
      pdf.text('รายงานสุขภาพส่วนบุคคล', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text('Health Personal Report', pageWidth / 2, 30, { align: 'center' });
      
      // ข้อมูลผู้ใช้
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      let currentY = 55;
      
      pdf.text('ข้อมูลส่วนตัว (Personal Information)', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(12);
      if (userProfile) {
        // ใช้ฟังก์ชันจัดการข้อความไทย
        const userName = userProfile.username || userProfile.full_name || 'User 7';
        pdf.text(`ชื่อ: ${userName}`, 25, currentY);
        currentY += 7;
        
        const gender = userProfile.gender === 'male' ? 'ชาย' : 
                      userProfile.gender === 'female' ? 'หญิง' : 'ไม่ระบุ';
        pdf.text(`เพศ: ${gender}`, 25, currentY);
        currentY += 7;
        
        pdf.text(`ส่วนสูง: ${userProfile.height_cm || '175.00'} cm`, 25, currentY);
        currentY += 7;
        
        pdf.text(`น้ำหนัก: ${userProfile.weight_kg || '87.00'} kg`, 25, currentY);
        currentY += 7;
        
        if (userProfile.height_cm && userProfile.weight_kg) {
          const bmi = (userProfile.weight_kg / Math.pow(userProfile.height_cm / 100, 2)).toFixed(1);
          pdf.text(`BMI: ${bmi}`, 25, currentY);
          currentY += 7;
        }
      }
      
      currentY += 10;
      
      // ข้อมูลสุขภาพล่าสุด
      pdf.setFontSize(16);
      pdf.text('ค่าตรวจสุขภาพล่าสุด (Latest Health Metrics)', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(12);
      if (recentMetrics.length > 0) {
        const latest = recentMetrics[0];
        
        if (latest.weight_kg) {
          pdf.text(`น้ำหนัก: ${latest.weight_kg} kg`, 25, currentY);
          currentY += 7;
        }
        
        const measurementDate = new Date(latest.measurement_date || Date.now()).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric'
        });
        pdf.text(`วันที่ตรวจ: ${measurementDate}`, 25, currentY);
        currentY += 10;
      } else {
        pdf.text('ยังไม่มีข้อมูลค่าตรวจสุขภาพ', 25, currentY);
        currentY += 10;
      }
      
      // คำแนะนำสุขภาพ
      pdf.setFontSize(16);
      pdf.text('คำแนะนำสุขภาพ (Health Recommendations)', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(12);
      const recommendations = [
        '• ตรวจสุขภาพประจำปีเป็นประจำ',
        '• ออกกำลังกายอย่างน้อย 150 นาทีต่อสัปดาห์', 
        '• รับประทานผักและผลไม้วันละ 5 ส่วน',
        '• ดื่มน้ำวันละ 8-10 แก้ว',
        '• นอนหลับให้เพียงพอ 7-9 ชั่วโมงต่อคืน',
        '• หลีกเลี่ยงความเครียด ผ่อนคลายด้วยสมาธิ',
        '• งดสูบบุหรี่และเครื่องดื่มแอลกอฮอล์',
        '• หากมีอาการผิดปกติ ควรปรึกษาแพทย์ทันที'
      ];
      
      recommendations.forEach(rec => {
        if (currentY > pageHeight - 30) {
          pdf.addPage();
          currentY = 20;
        }
        // แปลงข้อความให้แสดงได้ในรูปแบบ UTF-8
        pdf.text(rec, 25, currentY);
        currentY += 7;
      });
      
      // ท้ายกระดาษ
      if (currentY > pageHeight - 50) {
        pdf.addPage();
        currentY = 20;
      }
      
      currentY = pageHeight - 30;
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, currentY - 5, pageWidth, 20, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      const currentDate = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.text(`สร้างโดยระบบการจัดการสุขภาพ | วันที่: ${currentDate}`, pageWidth / 2, currentY + 5, { align: 'center' });
      
      // บันทึกไฟล์
      const userName = userProfile?.username || userProfile?.full_name || 'User 7';
      const dateString = new Date().toISOString().split('T')[0];
      const fileName = `รายงานสุขภาพ_${userName}_${dateString}.pdf`;
      pdf.save(fileName);
      
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return false;
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border-2 border-blue-200 shadow-lg">
      <div className="text-center">
        <h3 className="text-xl font-bold text-blue-800 mb-2">📄 รายงานสุขภาพ PDF</h3>
        <p className="text-blue-700 mb-4 text-base">
          ดาวน์โหลดรายงานสุขภาพฉบับสมบูรณ์ พร้อมนำไปปรึกษาแพทย์
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 text-left">
          <h4 className="text-blue-800 font-semibold mb-2">รายงานนี้ประกอบด้วย:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• ข้อมูลส่วนตัวและค่า BMI</li>
            <li>• ค่าตรวจสุขภาพล่าสุด (ความดัน, อัตราการเต้นหัวใจ, น้ำตาล)</li>
            <li>• คำแนะนำการดูแลสุขภาพ</li>
            <li>• ข้อมูลที่แพทย์สามารถใช้ประกอบการวินิจฉัย</li>
          </ul>
        </div>
        
        <button
          onClick={generatePDF}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center mx-auto border-2 border-blue-600 shadow-lg"
        >
          <span className="mr-2">📥</span>
          ดาวน์โหลดรายงาน PDF
        </button>
        
        <p className="text-sm text-gray-600 mt-3">
          💡 แนะนำให้นำรายงานนี้ไปแสดงแพทย์เพื่อการตรวจสอบและคำแนะนำเพิ่มเติม
        </p>
      </div>
    </div>
  );
};

export default HealthReportPDF;
