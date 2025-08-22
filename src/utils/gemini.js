import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

// Initialize Gemini AI
export const initGemini = () => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY || '882465106948';
  if (!genAI && apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

// Get health recommendations based on user data
export const getHealthRecommendations = async (healthData) => {
  try {
    const ai = initGemini();
    if (!ai) {
      throw new Error('Gemini AI not initialized');
    }

    const model = ai.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
    ในฐานะผู้เชี่ยวชาญด้านสุขภาพ โปรดวิเคราะห์ข้อมูลสุขภาพต่อไปนี้และให้คำแนะนำที่เหมาะสม:

    ข้อมูลผู้ใช้:
    - เพศ: ${healthData.gender}
    - อายุ: ${healthData.age} ปี
    - น้ำหนัก: ${healthData.weight} กก.
    - ส่วนสูง: ${healthData.height} ซม.
    - BMI: ${healthData.bmi}

    ค่าตรวจเลือด:
    - ความดันโลหิต: ${healthData.systolic_bp}/${healthData.diastolic_bp} mmHg
    - น้ำตาลในเลือดขณะอด: ${healthData.blood_sugar_fasting} mg/dL
    - HbA1c: ${healthData.hba1c}%
    - คอเลสเตอรอลรวม: ${healthData.cholesterol_total} mg/dL

    พฤติกรรม:
    - การสูบบุหรี่: ${healthData.smoking_status}
    - การออกกำลังกาย: ${healthData.exercise_frequency}
    - การนอนหลับ: ${healthData.sleep_hours} ชั่วโมง/คืน

    โปรดให้คำแนะนำเป็นภาษาไทยในรูปแบบ JSON ดังนี้:
    {
      "overallHealth": "คำอธิบายสุขภาพโดยรวม",
      "riskFactors": ["ปัจจัยเสี่ยงที่พบ"],
      "recommendations": {
        "diet": ["คำแนะนำด้านอาหาร"],
        "exercise": ["คำแนะนำด้านการออกกำลังกาย"],
        "lifestyle": ["คำแนะนำด้านการใช้ชีวิต"]
      },
      "followUp": "คำแนะนำการติดตาม"
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing Gemini response:', e);
    }

    // Fallback if JSON parsing fails
    return {
      overallHealth: "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้",
      riskFactors: [],
      recommendations: {
        diet: ["ปรึกษาแพทย์หรือนักโภชนาการ"],
        exercise: ["ปรึกษาผู้เชี่ยวชาญด้านการออกกำลังกาย"],
        lifestyle: ["ปรึกษาแพทย์เพื่อรับคำแนะนำที่เหมาะสม"]
      },
      followUp: "ควรปรึกษาแพทย์เพื่อรับคำแนะนำที่เหมาะสมกับสภาวะสุขภาพของคุณ"
    };

  } catch (error) {
    console.error('Error getting health recommendations:', error);
    return {
      overallHealth: "เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล",
      riskFactors: [],
      recommendations: {
        diet: ["ควรปรึกษาแพทย์หรือนักโภชนาการ"],
        exercise: ["ออกกำลังกายตามความเหมาะสม"],
        lifestyle: ["ดูแลสุขภาพอย่างสม่ำเสมอ"]
      },
      followUp: "หากมีปัญหาสุขภาพ ควรปรึกษาแพทย์"
    };
  }
};

// Generate personalized meal plan
export const generateMealPlan = async (userProfile, preferences = {}) => {
  try {
    const ai = initGemini();
    if (!ai) {
      throw new Error('Gemini AI not initialized');
    }

    const model = ai.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
    สร้างแผนการกินอาหาร 7 วันสำหรับผู้ใช้ที่มีข้อมูลดังนี้:
    
    ข้อมูลผู้ใช้:
    - อายุ: ${userProfile.age} ปี
    - เพศ: ${userProfile.gender}
    - น้ำหนัก: ${userProfile.weight} กก.
    - ส่วนสูง: ${userProfile.height} ซม.
    - BMI: ${userProfile.bmi}
    - เป้าหมาย: ${preferences.goal || 'สุขภาพดี'}
    
    ค่าสุขภาพ:
    - ความดันโลหิต: ${userProfile.bp || 'ปกติ'}
    - น้ำตาลในเลือด: ${userProfile.bloodSugar || 'ปกติ'}
    - คอเลสเตอรอล: ${userProfile.cholesterol || 'ปกติ'}

    โปรดสร้างแผนการกินที่:
    1. เหมาะสมกับสภาวะสุขภาพ
    2. เป็นอาหารไทยที่หาได้ง่าย
    3. มีคุณค่าทางโภชนาการครบถ้วน
    4. ระบุแคลอรี่โดยประมาณ

    ตอบเป็น JSON format ภาษาไทย:
    {
      "weeklyPlan": {
        "วันจันทร์": {
          "เช้า": "เมนูอาหาร (แคลอรี่)",
          "กลางวัน": "เมนูอาหาร (แคลอรี่)",
          "เย็น": "เมนูอาหาร (แคลอรี่)",
          "ว่าง": "ขนมหรือผลไม้"
        }
      },
      "totalCaloriesPerDay": "แคลอรี่รวมต่อวัน",
      "tips": ["เคล็ดลับการกิน"]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing meal plan response:', e);
    }

    return null;

  } catch (error) {
    console.error('Error generating meal plan:', error);
    return null;
  }
};

// Get exercise recommendations
export const getExerciseRecommendations = async (userProfile, fitnessLevel = 'beginner') => {
  try {
    const ai = initGemini();
    if (!ai) {
      throw new Error('Gemini AI not initialized');
    }

    const model = ai.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
    สร้างโปรแกรมการออกกำลังกายสำหรับผู้ใช้ที่มีข้อมูลดังนี้:
    
    - อายุ: ${userProfile.age} ปี
    - เพศ: ${userProfile.gender}
    - BMI: ${userProfile.bmi}
    - ระดับการออกกำลังกาย: ${fitnessLevel}
    - เป้าหมาย: ${userProfile.goal || 'สุขภาพดี'}

    โปรดแนะนำการออกกำลังกายที่:
    1. เหมาะสมกับวัยและสภาพร่างกาย
    2. ทำได้ที่บ้านหรือในชุมชน
    3. ปลอดภัยและมีประสิทธิภาพ
    4. มีตารางการออกกำลังกายรายสัปดาห์

    ตอบเป็น JSON format ภาษาไทย:
    {
      "weeklyPlan": {
        "วันจันทร์": {
          "type": "ประเภทการออกกำลังกาย",
          "duration": "ระยะเวลา (นาที)",
          "exercises": ["รายละเอียดท่า"],
          "intensity": "ระดับความหนัก"
        }
      },
      "tips": ["เคล็ดลับการออกกำลังกาย"],
      "precautions": ["ข้อควรระวัง"]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing exercise response:', e);
    }

    return null;

  } catch (error) {
    console.error('Error getting exercise recommendations:', error);
    return null;
  }
};
