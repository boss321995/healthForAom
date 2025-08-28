import React, { useState, useEffect } from 'react';

const NotificationSystem = ({ userProfile, recentMetrics = [] }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  const buttonRef = React.useRef(null);

  // คำนวณตำแหน่งของปุ่มเมื่อเปิด dropdown
  const handleToggleNotifications = () => {
    if (!showNotifications && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY + 8, // 8px spacing
        right: window.innerWidth - rect.right
      });
    }
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    generateNotifications();
  }, [userProfile, recentMetrics]);

  const generateNotifications = () => {
    const newNotifications = [];

    // 1. ตรวจสุขภาพประจำปี
    if (userProfile?.date_of_birth) {
      const currentDate = new Date();
      const birthDate = new Date(userProfile.date_of_birth);
      const daysSinceBirth = Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24));
      const daysSinceLastYearCheck = daysSinceBirth % 365;
      
      if (daysSinceLastYearCheck >= 350) { // เหลืออีก 15 วันก็ครบรอบปี
        newNotifications.push({
          id: 'annual_checkup',
          type: 'reminder',
          title: '⏰ เตือนตรวจสุขภาพประจำปี',
          message: 'ถึงเวลาตรวจสุขภาพประจำปีแล้ว เพื่อป้องกันโรคและดูแลสุขภาพอย่างต่อเนื่อง',
          priority: 'high',
          icon: '🏥',
          color: 'blue'
        });
      }
    }

    // 2. ตรวจค่าความดันโลหิต
    const latestBP = recentMetrics.find(m => m.systolic_bp && m.diastolic_bp);
    if (latestBP) {
      if (latestBP.systolic_bp >= 140 || latestBP.diastolic_bp >= 90) {
        newNotifications.push({
          id: 'high_bp',
          type: 'alert',
          title: '⚠️ ความดันโลหิตสูง',
          message: `ความดันของคุณ ${latestBP.systolic_bp}/${latestBP.diastolic_bp} สูงกว่าปกติ ควรพักผ่อนให้เพียงพอและหลีกเลี่ยงอาหารเค็ม`,
          priority: 'high',
          icon: '💓',
          color: 'red'
        });
      } else if (latestBP.systolic_bp <= 90 || latestBP.diastolic_bp <= 60) {
        newNotifications.push({
          id: 'low_bp',
          type: 'alert',
          title: '⚠️ ความดันโลหิตต่ำ',
          message: `ความดันของคุณ ${latestBP.systolic_bp}/${latestBP.diastolic_bp} ต่ำกว่าปกติ ควรดื่มน้ำให้เพียงพอและหากมีอาการควรปรึกษาแพทย์`,
          priority: 'medium',
          icon: '💓',
          color: 'orange'
        });
      }
    }

    // 3. ตรวจน้ำตาลในเลือด
    const latestSugar = recentMetrics.find(m => m.blood_sugar_mg);
    if (latestSugar) {
      if (latestSugar.blood_sugar_mg >= 126) {
        newNotifications.push({
          id: 'high_sugar',
          type: 'alert',
          title: '⚠️ น้ำตาลในเลือดสูง',
          message: `น้ำตาลในเลือดของคุณ ${latestSugar.blood_sugar_mg} mg/dL สูงกว่าปกติ ควรควบคุมอาหารและออกกำลังกาย`,
          priority: 'high',
          icon: '🍯',
          color: 'red'
        });
      }
    }

    // 4. ตรวจอัตราการเต้นหัวใจ
    const latestHR = recentMetrics.find(m => m.heart_rate);
    if (latestHR) {
      if (latestHR.heart_rate > 100) {
        newNotifications.push({
          id: 'high_hr',
          type: 'alert',
          title: '⚠️ อัตราการเต้นหัวใจเร็ว',
          message: `อัตราการเต้นหัวใจของคุณ ${latestHR.heart_rate} bpm เร็วกว่าปกติ หากไม่ได้ออกกำลังกายควรพักผ่อน`,
          priority: 'medium',
          icon: '💗',
          color: 'orange'
        });
      }
    }

    setNotifications(newNotifications);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-50';
      case 'medium': return 'border-orange-400 bg-orange-50';
      default: return 'border-blue-400 bg-blue-50';
    }
  };

  const getTextColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-800';
      case 'medium': return 'text-orange-800';
      default: return 'text-blue-800';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        ref={buttonRef}
        onClick={handleToggleNotifications}
        className="relative p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          {/* Background overlay */}
          <div 
            className="fixed inset-0"
            style={{zIndex: 9998}}
            onClick={() => setShowNotifications(false)}
          />
          <div 
            className="fixed w-80 bg-white rounded-lg shadow-xl border-2 border-blue-200 max-h-96 overflow-y-auto" 
            style={{
              zIndex: 9999,
              top: `${buttonPosition.top}px`,
              right: `${buttonPosition.right}px`
            }}
          >
            <div className="p-4 bg-blue-600 text-white rounded-t-lg">
              <h3 className="text-lg font-bold">การแจ้งเตือน</h3>
              <p className="text-blue-100 text-sm">ข้อมูลสำคัญเกี่ยวกับสุขภาพของคุณ</p>
            </div>
          
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <span className="text-4xl block mb-2">✅</span>
              <p className="text-lg font-medium">ไม่มีการแจ้งเตือน</p>
              <p className="text-sm">ค่าสุขภาพของคุณอยู่ในเกณฑ์ปกติ</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 m-2 rounded-lg border-l-4 ${getPriorityColor(notification.priority)} ${getTextColor(notification.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{notification.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-1">{notification.title}</h4>
                      <p className="text-sm leading-relaxed">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              💡 หากมีอาการผิดปกติ ควรปรึกษาแพทย์เพื่อการรักษาที่เหมาะสม
            </p>
          </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationSystem;
