import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HealthReportPDF_Thai = ({ userProfile, recentMetrics = [], dataHistory = [] }) => {
  const reportRef = useRef();

  const generatePDF = async () => {
    try {
      if (!reportRef.current) return false;

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // เพิ่มหน้าแรก
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // เพิ่มหน้าต่อไปถ้าเนื้อหายาวเกิน
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // บันทึกไฟล์
      const userName = userProfile?.username || userProfile?.full_name || 'User 7';
      const dateString = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
      const fileName = `รายงานสุขภาพ_${userName}_${dateString}.pdf`;
      pdf.save(fileName);

      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return false;
    }
  };

  // คำนวณ BMI
  const calculateBMI = () => {
    if (userProfile?.height_cm && userProfile?.weight_kg) {
      return (userProfile.weight_kg / Math.pow(userProfile.height_cm / 100, 2)).toFixed(1);
    }
    return 'ไม่สามารถคำนวณได้';
  };

  // จัดรูปแบบวันที่
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full">
      {/* PDF Content */}
      <div 
        ref={reportRef} 
        className="bg-white p-8 shadow-lg"
        style={{ 
          width: '794px', 
          minHeight: '1123px', 
          fontFamily: 'Sarabun, Arial, sans-serif',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg mb-6">
          <h1 className="text-3xl font-bold text-center mb-2">รายงานสุขภาพส่วนบุคคล</h1>
          <p className="text-center text-lg">Health Personal Report</p>
        </div>

        {/* Personal Information */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
            ข้อมูลส่วนตัว (Personal Information)
          </h2>
          <div className="grid grid-cols-2 gap-4 text-lg">
            <div>
              <span className="font-semibold text-gray-700">ชื่อ:</span>
              <span className="ml-2">{userProfile?.username || userProfile?.full_name || 'User 7'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">เพศ:</span>
              <span className="ml-2">
                {userProfile?.gender === 'male' ? 'ชาย' : 
                 userProfile?.gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">ส่วนสูง:</span>
              <span className="ml-2">{userProfile?.height_cm || '175.00'} cm</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">น้ำหนัก:</span>
              <span className="ml-2">{userProfile?.weight_kg || 'ไม่ระบุ'} kg</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">BMI:</span>
              <span className="ml-2">{calculateBMI()}</span>
            </div>
          </div>
        </div>

        {/* Latest Health Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
            ค่าตรวจสุขภาพล่าสุด (Latest Health Metrics)
          </h2>
          {recentMetrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 text-lg">
              {recentMetrics[0].weight_kg && (
                <div>
                  <span className="font-semibold text-gray-700">น้ำหนัก:</span>
                  <span className="ml-2">{recentMetrics[0].weight_kg} kg</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">วันที่ตรวจ:</span>
                <span className="ml-2">
                  {formatDate(recentMetrics[0].measurement_date || Date.now())}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-lg">ยังไม่มีข้อมูลค่าตรวจสุขภาพ</p>
          )}
        </div>

        {/* Health Recommendations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
            คำแนะนำสุขภาพ (Health Recommendations)
          </h2>
          <div className="grid grid-cols-1 gap-3 text-lg">
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>ตรวจสุขภาพประจำปีเป็นประจำ</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>ออกกำลังกายอย่างน้อย 150 นาทีต่อสัปดาห์</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>รับประทานผักและผลไม้วันละ 5 ส่วน</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>ดื่มน้ำวันละ 8-10 แก้ว</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>นอนหลับให้เพียงพอ 7-9 ชั่วโมงต่อคืน</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>หลีกเลี่ยงความเครียด ผ่อนคลายด้วยสมาธิ</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>งดสูบบุหรี่และเครื่องดื่มแอลกอฮอล์</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              <span>หากมีอาการผิดปกติ ควรปรึกษาแพทย์ทันที</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg text-center">
            <p className="text-lg">
              สร้างโดยระบบการจัดการสุขภาพ | วันที่: {formatDate(new Date())}
            </p>
          </div>
          <div className="mt-4 text-center text-gray-600">
            <p className="text-base">
              💡 แนะนำให้นำรายงานนี้ไปแสดงแพทย์เพื่อการตรวจสอบและคำแนะนำเพิ่มเติม
            </p>
          </div>
        </div>
      </div>

      {/* UI Component */}
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
              <li>• ค่าตรวจสุขภาพล่าสุด</li>
              <li>• คำแนะนำการดูแลสุขภาพ</li>
              <li>• ข้อมูลที่แพทย์สามารถใช้ประกอบการวินิจฉัย</li>
            </ul>
          </div>
          
          <button
            onClick={generatePDF}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center mx-auto border-2 border-blue-600 shadow-lg"
          >
            <span className="mr-2">📥</span>
            ดาวน์โหลดรายงาน PDF (รองรับภาษาไทย)
          </button>
          
          <p className="text-sm text-gray-600 mt-3">
            💡 รายงานนี้ใช้เทคโนโลยี HTML-to-PDF เพื่อให้แสดงภาษาไทยได้ถูกต้อง
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthReportPDF_Thai;
