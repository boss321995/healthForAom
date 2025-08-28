import React, { useState, useRef, useEffect } from 'react';

const HealthChatbot = ({ userProfile, recentMetrics = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: userProfile?.medical_conditions || userProfile?.medications
        ? `สวัสดีครับ! ผมเป็นผู้ช่วยด้านสุขภาพ 🏥 ผมเห็นว่าคุณมี${userProfile?.medical_conditions ? 'โรคประจำตัว' : ''}${userProfile?.medical_conditions && userProfile?.medications ? 'และ' : ''}${userProfile?.medications ? 'ยาที่ทาน' : ''} ผมสามารถให้คำแนะนำเฉพาะสำหรับคุณได้ครับ\n\nลองถามเรื่อง "สุขภาพของฉัน" หรือ "ฉันควรดูแลสุขภาพอย่างไร" ดูนะครับ 😊`
        : 'สวัสดีครับ! ผมเป็นผู้ช่วยด้านสุขภาพ 🏥 มีอะไรให้ช่วยเหลือเกี่ยวกับสุขภาพของคุณไหมครับ?\n\nลองถาม "สุขภาพของฉัน" หรือคำถามอื่นๆ ได้เลยครับ 😊',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const quickResponses = [
    'สุขภาพของฉันเป็นอย่างไร?',
    'ฉันควรดูแลสุขภาพอย่างไร?',
    'ยาของฉันกินอย่างไร?',
    'ค่าปกติของฉันเป็นอย่างไร?',
    'อาหารที่เหมาะกับฉัน',
    'การออกกำลังกายสำหรับฉัน'
  ];

  const getHealthAdvice = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // ฟังก์ชันช่วยในการตรวจสอบโรคประจำตัว
    const hasCondition = (condition) => {
      const medicalConditions = userProfile?.medical_conditions?.toLowerCase() || '';
      if (condition === 'ความดันสูง') {
        return medicalConditions.includes('ความดันสูง') || 
               medicalConditions.includes('ความดันโลหิตสูง') ||
               medicalConditions.includes('hypertension') ||
               medicalConditions.includes('ความดัน');
      }
      if (condition === 'เบาหวาน') {
        return medicalConditions.includes('เบาหวาน') || 
               medicalConditions.includes('diabetes') ||
               medicalConditions.includes('น้ำตาลในเลือดสูง');
      }
      return medicalConditions.includes(condition.toLowerCase());
    };
    
    // ฟังก์ชันช่วยในการตรวจสอบยาที่ใช้
    const takingMedication = (medication) => {
      return userProfile?.medications?.toLowerCase().includes(medication.toLowerCase()) || false;
    };
    
    // ฟังก์ชันสำหรับวิเคราะห์ข้อมูลล่าสุด
    const getLatestMetrics = () => {
      return {
        weight: recentMetrics.find(m => m.weight_kg)?.weight_kg,
        systolic: recentMetrics.find(m => m.systolic_bp)?.systolic_bp,
        diastolic: recentMetrics.find(m => m.diastolic_bp)?.diastolic_bp,
        heartRate: recentMetrics.find(m => m.heart_rate)?.heart_rate,
        bloodSugar: recentMetrics.find(m => m.blood_sugar)?.blood_sugar
      };
    };
    
    // คำถามเกี่ยวกับสุขภาพส่วนตัว
    if (message.includes('สุขภาพของฉัน') || message.includes('สุขภาพของผม') || message.includes('สุขภาพของดิฉัน') || 
        message.includes('สภาพสุขภาพ') || message.includes('ข้อมูลสุขภาพ') || message.includes('ตรวจสุขภาพ')) {
      
      const latest = getLatestMetrics();
      let response = '📊 สรุปสุขภาพของคุณ:\n\n';
      
      // ข้อมูลโรคประจำตัว
      if (userProfile?.medical_conditions) {
        response += `🏥 โรคประจำตัว: ${userProfile.medical_conditions}\n`;
      }
      
      if (userProfile?.medications) {
        response += `💊 ยาที่ทาน: ${userProfile.medications}\n`;
      }
      
      response += '\n📈 ข้อมูลล่าสุด:\n';
      
      // วิเคราะห์น้ำหนัก
      if (latest.weight && userProfile?.height_cm) {
        const bmi = (latest.weight / Math.pow(userProfile.height_cm / 100, 2)).toFixed(1);
        let bmiStatus = '';
        if (bmi < 18.5) bmiStatus = 'ผอมเกินไป';
        else if (bmi < 25) bmiStatus = 'ปกติ';
        else if (bmi < 30) bmiStatus = 'น้ำหนักเกิน';
        else bmiStatus = 'อ้วน';
        
        response += `⚖️ น้ำหนัก: ${latest.weight} กก. (BMI: ${bmi} - ${bmiStatus})\n`;
      }
      
      // วิเคราะห์ความดัน
      if (latest.systolic && latest.diastolic) {
        let bpStatus = '';
        if (latest.systolic < 120 && latest.diastolic < 80) bpStatus = 'ปกติ';
        else if (latest.systolic < 130 && latest.diastolic < 80) bpStatus = 'สูงเล็กน้อย';
        else if (latest.systolic < 140 || latest.diastolic < 90) bpStatus = 'ความดันสูงระยะ 1';
        else bpStatus = 'ความดันสูงระยะ 2';
        
        response += `💗 ความดัน: ${latest.systolic}/${latest.diastolic} mmHg (${bpStatus})\n`;
      }
      
      // วิเคราะห์น้ำตาล
      if (latest.bloodSugar) {
        let sugarStatus = '';
        if (latest.bloodSugar < 100) sugarStatus = 'ปกติ';
        else if (latest.bloodSugar < 126) sugarStatus = 'เสี่ยงเบาหวาน';
        else sugarStatus = 'สูงผิดปกติ';
        
        response += `🍯 น้ำตาล: ${latest.bloodSugar} mg/dL (${sugarStatus})\n`;
      }
      
      // วิเคราะห์หัวใจ
      if (latest.heartRate) {
        let hrStatus = '';
        if (latest.heartRate < 60) hrStatus = 'ช้ากว่าปกติ';
        else if (latest.heartRate <= 100) hrStatus = 'ปกติ';
        else hrStatus = 'เร็วกว่าปกติ';
        
        response += `💓 อัตราการเต้นหัวใจ: ${latest.heartRate} ครั้ง/นาที (${hrStatus})\n`;
      }
      
      // คำแนะนำเฉพาะบุคคล
      response += '\n💡 คำแนะนำสำหรับคุณ:\n';
      
      if (hasCondition('ความดันสูง')) {
        response += '• ควบคุมความดันให้ต่ำกว่า 140/90 mmHg\n';
        response += '• ลดเกลือ หลีกเลี่ยงอาหารแปรรูป\n';
        response += '• ออกกำลังกายสม่ำเสมอ 30 นาที/วัน\n';
        response += '• กินยาตรงเวลา ไม่ข้ามมื้อ\n';
        response += '• วัดความดันเป็นประจำทุกวัน\n';
      } else if (hasCondition('เบาหวาน')) {
        response += '• ควบคุมน้ำตาลให้อยู่ในเป้าหมาย 80-130 mg/dL\n';
        response += '• กินอาหารตรงเวลา หลีกเลี่ยงขนมหวาน\n';
        response += '• ตรวจน้ำตาลเป็นประจำ\n';
        response += '• ออกกำลังกายหลังอาหาร 30 นาที\n';
      } else {
        response += '• รักษาสุขภาพดีต่อไป ออกกำลังกายสม่ำเสมอ\n';
        response += '• กินอาหาร 5 หมู่ ในสัดส่วนที่เหมาะสม\n';
        response += '• ตรวจสุขภาพเป็นประจำ\n';
      }
      
      response += '\n⚠️ หากมีอาการผิดปกติ ควรปรึกษาแพทย์';
      
      return response;
    }
    
    // คำถามเกี่ยวกับการดูแลสุขภาพเฉพาะบุคคล
    if (message.includes('ดูแลสุขภาพ') || message.includes('รักษาสุขภาพ') || message.includes('ป้องกันโรค')) {
      let response = '🌟 แผนการดูแลสุขภาพสำหรับคุณ:\n\n';
      
      if (hasCondition('เบาหวาน')) {
        response += '🍯 การจัดการเบาหวาน:\n';
        response += '• ตรวจน้ำตาลก่อนอาหาร ทุกวัน\n';
        response += '• กินยาตรงเวลา ไม่ข้ามมื้อ\n';
        response += '• ออกกำลังกายหลังอาหาร 30 นาที\n';
        response += '• ตรวจ HbA1c ทุก 3 เดือน\n\n';
      }
      
      if (hasCondition('ความดันสูง')) {
        response += '💗 การจัดการความดันสูง:\n';
        response += '• วัดความดันทุกวัน เวลาเดิม\n';
        response += '• ลดเกลือให้เหลือ 6 กรัม/วัน\n';
        response += '• เดินเร็ว 30 นาที ทุกวัน\n';
        response += '• จัดการความเครียด\n\n';
      }
      
      if (hasCondition('โรคหัวใจ')) {
        response += '💓 การดูแลโรคหัวใจ:\n';
        response += '• ติดตามอัตราการเต้นหัวใจ\n';
        response += '• หลีกเลี่ยงกิจกรรมหนักเกินไป\n';
        response += '• ลดไขมันอิ่มตัว เพิ่มผักผลไม้\n';
        response += '• พกยาฉุกเฉินติดตัว\n\n';
      }
      
      // คำแนะนำทั่วไป
      response += '🌱 การดูแลสุขภาพทั่วไป:\n';
      response += '• นอนหลับ 7-8 ชั่วโมง/วัน\n';
      response += '• ดื่มน้ำ 8-10 แก้ว/วัน\n';
      response += '• กินอาหารครบ 5 หมู่\n';
      response += '• ตรวจสุขภาพประจำปี\n';
      response += '• หลีกเลี่ยงบุหรี่ แอลกอฮอล์';
      
      return response;
    }
    
    // คำถามเกี่ยวกับการทานยา
    if (message.includes('ยาของฉัน') || message.includes('การทานยา') || message.includes('ยาที่ทาน')) {
      let response = '💊 ข้อมูลการทานยาของคุณ:\n\n';
      
      if (!userProfile?.medications) {
        return 'คุณยังไม่ได้บันทึกข้อมูลยาที่ทาน กรุณาอัพเดทข้อมูลในโปรไฟล์';
      }
      
      response += `🔸 ยาที่ทาน: ${userProfile.medications}\n\n`;
      
      if (takingMedication('amlodipine')) {
        response += '• Amlodipine: ทานเช้า หลังอาหาร 1 เม็ด\n';
        response += '  - ระวังอาการบวม วิงเวียน\n';
        response += '  - วัดความดันก่อนทานยา\n\n';
      }
      
      if (takingMedication('metformin')) {
        response += '• Metformin: ทานหลังอาหาร เช้า-เย็น\n';
        response += '  - ดื่มน้ำให้มาก\n';
        response += '  - ตรวจน้ำตาลก่อนทานยา\n\n';
      }
      
      response += '⚠️ คำเตือน:\n';
      response += '• ทานยาตรงเวลาทุกวัน\n';
      response += '• ไม่หยุดยาเองโดยไม่ปรึกษาแพทย์\n';
      response += '• หากมีผลข้างเคียง แจ้งแพทย์ทันที\n';
      response += '• เก็บยาในที่แห้ง เย็น หลีกเลี่ยงแสง';
      
      return response;
    }
    
    // คำถามเกี่ยวกับค่าปกติ
    if (message.includes('ค่าปกติ') || message.includes('เกณฑ์ปกติ') || message.includes('มาตรฐาน')) {
      const latest = getLatestMetrics();
      let response = '📊 เกณฑ์ค่าปกติและค่าของคุณ:\n\n';
      
      response += '⚖️ น้ำหนัก (BMI):\n';
      response += '• ปกติ: 18.5-24.9\n';
      if (latest.weight && userProfile?.height_cm) {
        const bmi = (latest.weight / Math.pow(userProfile.height_cm / 100, 2)).toFixed(1);
        response += `• ค่าของคุณ: ${bmi}\n`;
      }
      
      response += '\n💗 ความดันโลหิต:\n';
      response += '• ปกติ: น้อยกว่า 120/80 mmHg\n';
      response += '• สูงเล็กน้อย: 120-129/<80 mmHg\n';
      response += '• ความดันสูง: ≥130/80 mmHg\n';
      if (latest.systolic && latest.diastolic) {
        response += `• ค่าของคุณ: ${latest.systolic}/${latest.diastolic} mmHg\n`;
      }
      
      response += '\n🍯 น้ำตาลในเลือด:\n';
      response += '• ปกติ (ก่อนอาหาร): 70-99 mg/dL\n';
      response += '• เสี่ยงเบาหวาน: 100-125 mg/dL\n';
      response += '• เบาหวาน: ≥126 mg/dL\n';
      if (latest.bloodSugar) {
        response += `• ค่าของคุณ: ${latest.bloodSugar} mg/dL\n`;
      }
      
      response += '\n💓 อัตราการเต้นหัวใจ:\n';
      response += '• ปกติ: 60-100 ครั้ง/นาที\n';
      if (latest.heartRate) {
        response += `• ค่าของคุณ: ${latest.heartRate} ครั้ง/นาที\n`;
      }
      
      return response;
    }
    
    // ข้อมูลยาต่างๆ - เพิ่มการแนะนำเฉพาะบุคคล
    if (message.includes('amlodipine') || message.includes('amlopine') || message.includes('แอมโลดิปีน')) {
      let response = 'Amlodipine (แอมโลดิปีน) - ยาลดความดันโลหิต: \n💊 กลุ่ม: Calcium Channel Blocker \n🎯 ใช้สำหรับ: ความดันโลหิตสูง, โรคหัวใจขาดเลือด \n⏰ วิธีใช้: วันละ 1 ครั้ง ควรกินตอนเช้า \n⚠️ ผลข้างเคียง: ใบหน้าบวม ขาบวม วิงเวียน \n❗ ห้ามหยุดยาเองโดยไม่ปรึกษาแพทย์';
      
      if (takingMedication('amlodipine')) {
        response += '\n\n👤 สำหรับคุณเฉพาะ:\n• ควรตรวจวัดความดันสม่ำเสมอ\n• หลีกเลี่ยงการลุกขึ้นยืนเร็วๆ\n• ดื่มน้ำให้เพียงพอ\n• หากมีอาการบวมเพิ่มขึ้น ควรแจ้งแพทย์';
      }
      
      return response;
    }
    
    if (message.includes('tb') || message.includes('วัณโรค') || message.includes('ยาวัณโรค')) {
      let response = 'ยารักษาวัณโรค - ต้องกินต่อเนื่องตามแพทย์กำหนด: \n💊 ยาหลัก: Isoniazid, Rifampin, Ethambutol, Pyrazinamide \n⏰ ระยะเวลา: อย่างน้อย 6-9 เดือน \n🍽️ ควรกินตอนท้องว่าง (ก่อนอาหาร 1 ชั่วโมง) \n⚠️ สำคัญมาก: ห้ามหยุดยากลางคัน แม้อาการดีขึ้น \n🏥 ควรติดตามผลการรักษากับแพทย์สม่ำเสมอ';
      
      if (hasCondition('วัณโรค') || hasCondition('tb') || takingMedication('isoniazid') || takingMedication('rifampin')) {
        response += '\n\n👤 สำหรับคุณเฉพาะ:\n• กินยาให้ครบทุกเม็ดตามแพทย์สั่ง\n• แยกใช้ผ้าเช็ดหน้า แก้ว ช้อนส้อม\n• หลีกเลี่ยงแอลกอฮอล์\n• พักผ่อนให้เพียงพอ\n• กินอาหารที่มีโปรตีนสูง';
      }
      
      return response;
    }
    
    if (message.includes('metformin') || message.includes('เมตฟอร์มิน') || message.includes('ยาเบาหวาน')) {
      let response = 'Metformin (เมตฟอร์มิน) - ยาเบาหวานชนิด 2: \n💊 ใช้สำหรับ: ลดน้ำตาลในเลือด ลดการดูดซึมน้ำตาล \n🍽️ วิธีใช้: กินพร้อมอาหารหรือหลังอาหาร \n⚠️ ผลข้างเคียง: ท้องเสีย คลื่นไส้ในช่วงแรก \n✅ ไม่ทำให้น้ำตาลต่ำเองถ้าใช้คนเดียว \n💡 ช่วยลดน้ำหนักเล็กน้อย';
      
      if (hasCondition('เบาหวาน') || hasCondition('diabetes') || takingMedication('metformin')) {
        const latestSugar = recentMetrics.find(m => m.blood_sugar);
        response += '\n\n👤 สำหรับคุณเฉพาะ:\n• กินอาหารตรงเวลา 3 มื้อหลัก\n• หลีกเลี่ยงอาหารหวาน แป้ง\n• ออกกำลังกายสม่ำเสมอ\n• ตรวจน้ำตาลเป็นประจำ';
        
        if (latestSugar && latestSugar.blood_sugar > 140) {
          response += '\n⚠️ น้ำตาลล่าสุดของคุณ ' + latestSugar.blood_sugar + ' mg/dL สูงกว่าปกติ ควรระวังอาหาร';
        }
      }
      
      return response;
    }
    
    // คำแนะนำสุขภาพทั่วไป - ปรับตามสภาพส่วนบุคคล
    if (message.includes('ความดัน') || message.includes('blood pressure')) {
      let response = 'ความดันโลหิตปกติ: \n• ปกติ: ต่ำกว่า 120/80 mmHg \n• สูงเล็กน้อย: 120-129/<80 mmHg \n• ความดันสูงระยะ 1: 130-139/80-89 mmHg \n• ควรตรวจสม่ำเสมอ \n⚠️ หากความดันสูงเกิน 140/90 ต่อเนื่อง ควรพบแพทย์';
      
      if (hasCondition('ความดันสูง') || hasCondition('hypertension') || takingMedication('amlodipine')) {
        const latestBP = recentMetrics.find(m => m.systolic_bp && m.diastolic_bp);
        response += '\n\n👤 สำหรับคุณเฉพาะ:\n• ลดเกลือและอาหารแปรรูป\n• ออกกำลังกายเบาๆ สม่ำเสมอ\n• จัดการความเครียด\n• ตรวจความดันทุกวัน';
        
        if (latestBP && (latestBP.systolic_bp >= 140 || latestBP.diastolic_bp >= 90)) {
          response += `\n⚠️ ความดันล่าสุดของคุณ ${latestBP.systolic_bp}/${latestBP.diastolic_bp} สูงกว่าปกติ ควรพักผ่อนและกินยาตรงเวลา`;
        }
      }
      
      return response;
    }
    
    if (message.includes('น้ำตาล') || message.includes('sugar') || message.includes('เบาหวาน')) {
      let response = 'ระดับน้ำตาลในเลือดปกติ: \n• ก่อนอาหาร: 70-99 mg/dL \n• หลังอาหาร 2 ชม: ต่ำกว่า 140 mg/dL \n• HbA1c: ต่ำกว่า 5.7% \n🍎 ควบคุมอาหาร หลีกเลี่ยงน้ำตาลและแป้ง \n⚠️ หากสูงเกิน 126 mg/dL ควรพบแพทย์';
      
      if (hasCondition('เบาหวาน') || hasCondition('diabetes')) {
        const latestSugar = recentMetrics.find(m => m.blood_sugar);
        response += '\n\n� สำหรับคุณเฉพาะ:\n• กินข้าวกล้อง ขนมปังโฮลวีท\n• เพิ่มผักใบเขียว\n• หลีกเลี่ยงผลไม้หวานจัด\n• แบ่งอาหารเป็น 5-6 มื้อเล็ก';
        
        if (latestSugar) {
          if (latestSugar.blood_sugar > 180) {
            response += `\n🚨 น้ำตาลล่าสุด ${latestSugar.blood_sugar} mg/dL สูงมาก ควรพบแพทย์ด่วน`;
          } else if (latestSugar.blood_sugar > 140) {
            response += `\n⚠️ น้ำตาลล่าสุด ${latestSugar.blood_sugar} mg/dL สูงกว่าปกติ ระวังอาหาร`;
          }
        }
      }
      
      return response;
    }
    
    // คำถามเกี่ยวกับอาหารที่เหมาะสม
    if (message.includes('อาหารที่เหมาะ') || message.includes('อาหารสำหรับฉัน') || message.includes('ควรกินอะไร')) {
      let response = '🍽️ แผนอาหารที่เหมาะสำหรับคุณ:\n\n';
      
      if (hasCondition('เบาหวาน')) {
        response += '🍯 อาหารสำหรับผู้เป็นเบาหวาน:\n';
        response += '✅ ควรกิน:\n';
        response += '• ข้าวกล้อง ข้าวซ้อมมือ\n';
        response += '• ผักใบเขียวเข้ม\n';
        response += '• เนื้อปลา ไก่ไม่ติดหนัง\n';
        response += '• ถั่วเมล็ดแห้ง\n';
        response += '• ผลไม้รสเปรี้ยว (แอปเปิ้ล ส้ม)\n\n';
        response += '❌ ควรหลีกเลี่ยง:\n';
        response += '• ข้าวขาว แป้งขาว\n';
        response += '• ขนมหวาน น้ำอัดลม\n';
        response += '• ผลไม้หวาน (ทุเรียน องุ่น)\n';
        response += '• อาหารทอด อาหารแปรรูป\n\n';
      }
      
      if (hasCondition('ความดันสูง')) {
        response += '💗 อาหารสำหรับผู้ความดันสูง:\n';
        response += '✅ ควรกิน:\n';
        response += '• ผักใบเขียว ผลไม้สด\n';
        response += '• ปลาทะเล อัลมอนด์\n';
        response += '• โอ๊ตมีล ธัญพืชเต็มเมล็ด\n';
        response += '• กล้วย อโวคาโด (มีโพแทสเซียม)\n\n';
        response += '❌ ควรหลีกเลี่ยง:\n';
        response += '• เกลือ น้ำปลา ซีอิ๊ว\n';
        response += '• อาหารกระป๋อง ไส้กรอก\n';
        response += '• เครื่องดื่มแอลกอฮอล์\n';
        response += '• กาแฟเข้มข้น\n\n';
      }
      
      if (hasCondition('โรคหัวใจ')) {
        response += '💓 อาหารสำหรับผู้โรคหัวใจ:\n';
        response += '✅ ควรกิน:\n';
        response += '• ปลาแซลมอน ปลาทูน่า\n';
        response += '• อัลมอนด์ วอลนัท\n';
        response += '• น้ำมันมะกอก\n';
        response += '• ผักใบเขียว ผลเบอรี่\n\n';
        response += '❌ ควรหลีกเลี่ยง:\n';
        response += '• ไขมันอิ่มตัว (เนื้อแดง)\n';
        response += '• อาหารทอด\n';
        response += '• เนย มาร์การีน\n';
        response += '• ของหวานมากเกินไป\n\n';
      }
      
      if (!hasCondition('เบาหวาน') && !hasCondition('ความดันสูง') && !hasCondition('โรคหัวใจ')) {
        response += '🌟 อาหารสำหรับคนทั่วไป:\n';
        response += '• กินครบ 5 หมู่ในสัดส่วนที่เหมาะสม\n';
        response += '• ผักผลไม้ 5-9 ส่วน/วัน\n';
        response += '• ธัญพืชเต็มเมล็ด\n';
        response += '• โปรตีนจากปลา เนื้อขาว\n';
        response += '• นมและผลิตภัณฑ์นมไขมันต่ำ\n\n';
      }
      
      response += '💡 คำแนะนำทั่วไป:\n';
      response += '• กินอาหาร 3 มื้อหลัก 2 ว่าง\n';
      response += '• ดื่มน้ำ 8-10 แก้ว/วัน\n';
      response += '• เคี้ยวอาหารให้ละเอียด\n';
      response += '• หลีกเลี่ยงอาหารก่อนนอน 2 ชั่วโมง';
      
      return response;
    }
    
    // คำถามเกี่ยวกับการออกกำลังกายเฉพาะบุคคล
    if (message.includes('การออกกำลังกายสำหรับฉัน') || message.includes('ออกกำลังกายอย่างไร') || message.includes('exercise สำหรับฉัน')) {
      let response = '🏃‍♂️ แผนการออกกำลังกายสำหรับคุณ:\n\n';
      
      if (hasCondition('เบาหวาน')) {
        response += '🍯 การออกกำลังกายสำหรับผู้เป็นเบาหวาน:\n';
        response += '⏰ ช่วงเวลา: หลังอาหาร 1-2 ชั่วโมง\n';
        response += '🎯 เป้าหมาย: 150 นาที/สัปดาห์\n\n';
        response += '✅ กิจกรรมที่แนะนำ:\n';
        response += '• เดินเร็ว 30 นาที/วัน\n';
        response += '• ว่ายน้ำ 3 ครั้ง/สัปดาห์\n';
        response += '• ยืดเส้นยืดสาย\n';
        response += '• โยคะ ไท้เก๊ก\n\n';
        response += '⚠️ ข้อควรระวัง:\n';
        response += '• ตรวจน้ำตาลก่อน-หลังออกกำลังกาย\n';
        response += '• หยุดหากน้ำตาลต่ำกว่า 100 mg/dL\n';
        response += '• พกขนมหรือน้ำหวานติดตัว\n';
        response += '• หลีกเลี่ยงออกกำลังกายหนักจัด\n\n';
      }
      
      if (hasCondition('ความดันสูง')) {
        response += '💗 การออกกำลังกายสำหรับผู้ความดันสูง:\n';
        response += '⏰ ช่วงเวลา: ช่วงเช้าหรือเย็น\n';
        response += '🎯 เป้าหมาย: 30 นาที/วัน 5 วัน/สัปดาห์\n\n';
        response += '✅ กิจกรรมที่แนะนำ:\n';
        response += '• เดิน จ๊อกกิ้งเบาๆ\n';
        response += '• ปั่นจักรยาน\n';
        response += '• ว่ายน้ำ\n';
        response += '• เต้นแอโรบิก\n\n';
        response += '❌ ควรหลีกเลี่ยง:\n';
        response += '• ยกน้ำหนักหนัก\n';
        response += '• กิจกรรมที่ต้องกลั้นลมหายใจ\n';
        response += '• ออกกำลังกายในอากาศร้อนจัด\n\n';
        response += '⚠️ ข้อควรระวัง:\n';
        response += '• วัดความดันก่อน-หลังออกกำลังกาย\n';
        response += '• หยุดหากมีอาการวิงเวียน\n';
        response += '• ดื่มน้ำเป็นประจำ\n\n';
      }
      
      if (hasCondition('โรคหัวใจ')) {
        response += '💓 การออกกำลังกายสำหรับผู้โรคหัวใจ:\n';
        response += '⚠️ สำคัญ: ต้องปรึกษาแพทย์ก่อน\n';
        response += '🎯 เป้าหมาย: เริ่มต้น 10-15 นาที/วัน\n\n';
        response += '✅ กิจกรรมที่ปลอดภัย:\n';
        response += '• เดินเบาๆ\n';
        response += '• โยคะ สติเทชั่น\n';
        response += '• ยืดเส้นยืดสาย\n';
        response += '• กายภาพบำบัดตามแพทย์แนะนำ\n\n';
        response += '🚫 สิ่งที่ห้ามทำ:\n';
        response += '• ออกกำลังกายหนักจัด\n';
        response += '• กิจกรรมที่แข่งขัน\n';
        response += '• ยกของหนัก\n\n';
        response += '⚠️ หยุดทันทีหาก:\n';
        response += '• เจ็บหน้าอก หายใจลำบาก\n';
        response += '• วิงเวียน คลื่นไส้\n';
        response += '• ใจสั่นผิดปกติ\n\n';
      }
      
      if (!hasCondition('เบาหวาน') && !hasCondition('ความดันสูง') && !hasCondition('โรคหัวใจ')) {
        response += '🌟 การออกกำลังกายสำหรับคนทั่วไป:\n';
        response += '🎯 เป้าหมาย: 150 นาที/สัปดาห์\n\n';
        response += '🏃‍♂️ แอโรบิก (4-5 วัน/สัปดาห์):\n';
        response += '• เดิน จ๊อกกิ้ง วิ่ง\n';
        response += '• ว่ายน้ำ ปั่นจักรยาน\n';
        response += '• เต้นแอโรบิก กีฬาต่างๆ\n\n';
        response += '💪 กล้ามเนื้อ (2-3 วัน/สัปดาห์):\n';
        response += '• ยกน้ำหนัก\n';
        response += '• แผลนค์ สควอท\n';
        response += '• ดัมเบล ยางยืด\n\n';
        response += '🧘‍♀️ ยืดหยุ่น (ทุกวัน):\n';
        response += '• ยืดเส้นยืดสาย\n';
        response += '• โยคะ พิลาทิส\n\n';
      }
      
      response += '💡 คำแนะนำทั่วไป:\n';
      response += '• วอร์มอัพ 5-10 นาทีก่อนเริ่ม\n';
      response += '• คูลดาวน์หลังเสร็จ\n';
      response += '• เพิ่มความหนักค่อยเป็นค่อยไป\n';
      response += '• พักผ่อนให้เพียงพอ\n';
      response += '• ดื่มน้ำก่อน ระหว่าง และหลังออกกำลังกาย';
      
      return response;
    }
    
    if (message.includes('ออกกำลังกาย') || message.includes('exercise')) {
      let response = 'การออกกำลังกายที่แนะนำ: \n• คนทั่วไป: 150 นาที/สัปดาห์ \n• เริ่มต้น: 30 นาที/วัน 5 วัน/สัปดาห์ \n• ควรมีทั้งแอโรบิกและกล้ามเนื้อ \n• วอร์มอัพก่อนออกกำลังกาย \n💪 เริ่มเบาๆ แล้วค่อยเพิ่มความหนัก';
      
      if (hasCondition('เบาหวาน') || hasCondition('diabetes')) {
        response += '\n\n👤 สำหรับผู้เบาหวาน:\n• เดินเร็ว 30 นาที/วัน\n• ตรวจน้ำตาลก่อน-หลังออกกำลังกาย\n• หลีกเลี่ยงออกกำลังกายหนักเกินไป\n• ดื่มน้ำให้เพียงพอ';
      }
      
      if (hasCondition('ความดันสูง') || hasCondition('hypertension')) {
        response += '\n\n👤 สำหรับผู้ความดันสูง:\n• เดิน ว่ายน้ำ ปั่นจักรยาน\n• หลีกเลี่ยงยกของหนัก\n• ไม่ควรออกกำลังกายหนักจัด\n• หยุดพักหากมีอาการวิงเวียน';
      }
      
      return response;
    }
    
    // ส่วนอื่นๆ คงเดิม...
    if (message.includes('paracetamol') || message.includes('พาราเซตามอล') || message.includes('แก้ปวด')) {
      return 'Paracetamol (พาราเซตามอล) - ยาแก้ปวดลดไข้: \n💊 ขนาด: ผู้ใหญ่ 500-1000 mg ทุก 4-6 ชั่วโมง \n📊 สูงสุด: ไม่เกิน 4000 mg ต่อวัน (8 เม็ด 500mg) \n⚠️ ระวัง: อันตรายต่อตับหากใช้เกินขนาด \n✅ ปลอดภัยสำหรับเด็กและหญิงตั้งครรภ์ \n🍺 หลีกเลี่ยงแอลกอฮอล์ขณะใช้ยา';
    }
    
    if (message.includes('simvastatin') || message.includes('ซิมวาสแตติน') || message.includes('ยาคอเลสเตอรอล')) {
      return 'Simvastatin (ซิมวาสแตติน) - ยาลดคอเลสเตอรอล: \n💊 ใช้สำหรับ: ลดไขมันในเลือด ป้องกันโรคหัวใจ \n🌙 วิธีใช้: กินตอนเย็นหรือก่อนนอน \n⚠️ ผลข้างเคียง: ปวดกล้ามเนื้อ อ่อนเพลีย \n❗ หลีกเลี่ยงส้มโอ ผลไม้ตระกูลส้ม \n🏥 ตรวจเลือดติดตาม CK, LFT';
    }
    
    if (message.includes('aspirin') || message.includes('แอสไพริน')) {
      return 'Aspirin (แอสไพริน) - ยาต้านการแข็งตัวของเลือด: \n💊 ใช้สำหรับ: แก้ปวด ลดไข้ ป้องกันลิ่มเลือด \n⚡ ขนาดต่ำ (81-100 mg): ป้องกันโรคหัวใจ \n⚠️ ผลข้างเคียง: ระคายเคืองกระเพาะ เสี่ยงเลือดออก \n❗ ไม่ควรให้เด็กอายุต่ำกว่า 16 ปี \n🍽️ กินหลังอาหารเพื่อลดการระคายเคือง';
    }
    
    if (message.includes('omeprazole') || message.includes('โอเมพราโซล') || message.includes('ยากรดไหลย้อน')) {
      return 'Omeprazole (โอเมพราโซล) - ยาลดกรดในกระเพาะ: \n💊 ใช้สำหรับ: แก้กรดไหลย้อน แผลในกระเพาะ \n🍽️ วิธีใช้: กินก่อนอาหารเช้า 30-60 นาที \n⏰ ระยะเวลา: ไม่ควรใช้นานเกิน 8 สัปดาห์ \n⚠️ ผลข้างเคียง: ปวดหัว ท้องเสีย \n💡 ใช้นานอาจส่งผลต่อการดูดซึมแคลเซียม';
    }
    
    // คำตอบแบบง่ายๆ สำหรับคำถามสุขภาพทั่วไป
    if (message.includes('ปวดหัว')) {
      return 'สำหรับอาการปวดหัว แนะนำให้: \n• พักผ่อนให้เพียงพอ \n• ดื่มน้ำให้มาก \n• หลีกเลี่ยงแสงแรง \n• นวดเบาๆ ที่ขมับ \n⚠️ หากปวดหัวรุนแรงหรือนานเกิน 3 วัน ควรปรึกษาแพทย์';
    }
    
    if (message.includes('แคลเซียม') || message.includes('calcium')) {
      return 'เกี่ยวกับแคลเซียม: \n• ความต้องการ: 1000-1200 mg/วัน \n• แหล่งธรรมชาติ: นม, ปลาเล็กปลาน้อย, ผักใบเขียว \n• ควรรับประทานพร้อมวิตามิน D \n• หลีกเลี่ยงกาแฟมากเกินไป \n☀️ แสงแดดช่วยการดูดซึม';
    }
    
    if (message.includes('นอน') || message.includes('sleep')) {
      return 'การนอนหลับที่ดี: \n• ผู้ใหญ่: 7-9 ชั่วโมง/คืน \n• เข้านอนเวลาเดิมทุกวัน \n• หลีกเลี่ยงหน้าจอก่อนนอน 1 ชม \n• ห้องเย็น มืด เงียบ \n😴 งีบกลางวันไม่เกิน 30 นาที';
    }
    
    // คำทักทาย
    if (message.includes('สวัสดี') || message.includes('หวัดดี') || message.includes('hello')) {
      let greeting = 'สวัสดีครับ! ยินดีให้คำปรึกษาเรื่องสุขภาพและข้อมูลยา 💊\n\n🔍 สามารถถามเกี่ยวกับ:\n• ข้อมูลยาทั่วไป\n• คำแนะนำสุขภาพ\n• ค่าปกติของร่างกาย';
      
      if (userProfile?.medical_conditions || userProfile?.medications) {
        greeting += '\n\n👤 ข้อมูลของคุณ:';
        if (userProfile.medical_conditions) {
          greeting += `\n• โรคประจำตัว: ${userProfile.medical_conditions}`;
        }
        if (userProfile.medications) {
          greeting += `\n• ยาที่ใช้: ${userProfile.medications}`;
        }
        greeting += '\n💡 ฉันจะให้คำแนะนำที่เหมาะกับสภาพคุณโดยเฉพาะ';
      }
      
      greeting += '\n\nมีอะไรอยากสอบถามไหมครับ?';
      return greeting;
    }
    
    // คำตอบทั่วไป
    return 'ขอบคุญสำหรับคำถามครับ! ผมให้ข้อมูลทั่วไปเท่านั้น สำหรับการใช้ยาเฉพาะบุคคล แนะนำให้ปรึกษาเภสัชกรหรือแพทย์ครับ \n\n📞 หากมีอาการฉุกเฉิน โทร 1669 \n🏥 หากต้องการคำแนะนำเฉพาะบุคคล ควรพบแพทย์ \n💊 ข้อมูลยา: ปรึกษาเภสัชกร';
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // จำลองการพิมพ์ของบอท
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        text: getHealthAdvice(inputText),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickResponse = (response) => {
    setInputText(response);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <div 
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50"
        style={{ zIndex: 1000 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-3 sm:p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 border-4 border-white"
        >
          <span className="text-xl sm:text-2xl">💬</span>
          {!isOpen && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold animate-pulse">
              !
            </div>
          )}
        </button>
      </div>

      {/* Chat Popup */}
      {isOpen && (
        <div 
          className="fixed bottom-16 sm:bottom-24 right-2 sm:right-6 w-[calc(100vw-1rem)] max-w-sm sm:w-80 h-[28rem] sm:h-[32rem] bg-white rounded-2xl shadow-2xl border-2 border-blue-200 flex flex-col z-50"
          style={{ zIndex: 1000 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl">🏥</span>
              <div>
                <h3 className="font-bold text-xs sm:text-sm">ผู้ช่วยสุขภาพ AI</h3>
                <p className="text-xs text-blue-100">พร้อมให้คำปรึกษา 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-lg sm:text-xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gradient-to-b from-blue-50/30 to-white touch-scroll">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-xs px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                  <span className="text-xs opacity-70 block mt-1">
                    {message.timestamp.toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 px-3 sm:px-4 py-2 rounded-xl rounded-bl-md text-xs sm:text-sm border border-gray-200 shadow-sm">
                  <span className="inline-flex space-x-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Responses */}
          <div className="px-2 sm:px-3 py-2 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600 mb-2 font-medium">คำถามแนะนำ:</div>
            <div className="flex flex-wrap gap-1">
              {quickResponses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickResponse(response)}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 min-h-[32px]"
                >
                  {response}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-gray-200 rounded-b-2xl bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="พิมพ์คำถามเกี่ยวกับสุขภาพ..."
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 sm:px-4 py-2 rounded-xl text-sm transition-colors shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HealthChatbot;
