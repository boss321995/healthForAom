import { generateHealthAdvice } from './services/aiAdvisor.js';
// Note: Database connection will be passed from main server
// No direct database import needed

// Health Analytics API for AI Trend Analysis
class HealthAnalytics {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  parseList(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[\r\n,;•\u2022\u2023]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  normalizeHealthHistory(records = [], profile = {}) {
    const heightCm = profile?.height_cm ?? profile?.height ?? null;
    return records.map((record) => {
      const weightValue = record.weight_kg ?? record.weight ?? record.weightKg ?? record.body_weight ?? null;
      const parsedWeight = weightValue != null && !Number.isNaN(Number(weightValue)) ? Number(weightValue) : null;
      const normalized = {
        ...record,
        weight_kg: parsedWeight,
        weight: parsedWeight,
        height: heightCm != null && !Number.isNaN(Number(heightCm)) ? Number(heightCm) : null,
        height_cm: heightCm != null && !Number.isNaN(Number(heightCm)) ? Number(heightCm) : null,
      };
      return normalized;
    });
  }

  normalizeBehaviorHistory(records = []) {
    return records.map((record) => {
      const exerciseMinutes = record.exercise_duration_minutes ?? record.exercise_minutes ?? record.exercise_duration ?? null;
      const sleepHours = record.sleep_hours_per_night ?? record.sleep_hours ?? null;
      return {
        ...record,
        exercise_duration_minutes:
          exerciseMinutes != null && !Number.isNaN(Number(exerciseMinutes)) ? Number(exerciseMinutes) : null,
        sleep_hours_per_night:
          sleepHours != null && !Number.isNaN(Number(sleepHours)) ? Number(sleepHours) : null,
        stress_level:
          record.stress_level != null && !Number.isNaN(Number(record.stress_level)) ? Number(record.stress_level) : null,
      };
    });
  }

  async getUserProfile(userId) {
    if (!this.db) return null;
    try {
      const query = `
        SELECT up.*, u.username, u.email
        FROM user_profiles up
        JOIN users u ON u.id = up.user_id
        WHERE up.user_id = $1
        ORDER BY up.updated_at DESC NULLS LAST
        LIMIT 1
      `;
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching user profile for AI advisor:', error.message);
      return null;
    }
  }

  async getActiveMedications(userId) {
    if (!this.db) return [];
    try {
      const query = `
        SELECT medication_name, dosage, frequency, time_schedule, start_date, end_date, condition, reminder_enabled, notes
        FROM medications
        WHERE user_id = $1 AND (is_active = TRUE OR is_active IS NULL)
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      `;
      const result = await this.db.query(query, [userId]);
      return result.rows || [];
    } catch (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        console.warn('ℹ️ Medications table not available for AI advisor context yet');
        return [];
      }
      console.error('❌ Error fetching medications for AI advisor:', error.message);
      return [];
    }
  }

  // วิเคราะห์แนวโน้มสุขภาพของผู้ใช้
  async analyzeHealthTrends(userId, timeRange = '6months') {
    try {
      const [healthHistoryRaw, behaviorHistoryRaw, profile] = await Promise.all([
        this.getHealthHistory(userId, timeRange),
        this.getBehaviorHistory(userId, timeRange),
        this.getUserProfile(userId)
      ]);

      const activeMedications = await this.getActiveMedications(userId);
      const profileConditions = this.parseList(profile?.medical_conditions);
      const profileMedications = this.parseList(profile?.medications);

      const healthHistory = this.normalizeHealthHistory(healthHistoryRaw, profile || {});
      const behaviorHistory = this.normalizeBehaviorHistory(behaviorHistoryRaw);
      
      console.log('📊 Health history count:', healthHistory.length);
      console.log('🏃 Behavior history count:', behaviorHistory.length);
      
      const trends = {
        bmi: this.analyzeBMITrend(healthHistory),
        bloodPressure: this.analyzeBloodPressureTrend(healthHistory),
        bloodSugar: this.analyzeBloodSugarTrend(healthHistory),
        lifestyle: this.analyzeLifestyleTrend(behaviorHistory),
        overall: this.calculateOverallHealthScore(healthHistory, behaviorHistory)
      };

      console.log('📈 Generated trends:', trends);

      // ใช้ AI ให้คำแนะนำตามแนวโน้ม
      const aiRecommendations = await this.generateTrendRecommendations(trends, {
        profile,
        healthHistory,
        behaviorHistory,
        medications: activeMedications,
        profileMedications,
        profileConditions
      });
      
      return {
        success: true,
        data: {
          trends,
          recommendations: aiRecommendations,
          riskFactors: this.identifyRiskFactors(trends),
          improvements: this.identifyImprovements(trends),
          context: {
            profileAvailable: Boolean(profile),
            conditionCount: profileConditions.length,
            medicationSources: {
              activeMedications: activeMedications.length,
              profileMedicationEntries: profileMedications.length
            }
          }
        }
      };
    } catch (error) {
      console.error('Error analyzing health trends:', error);
      return { success: false, error: error.message };
    }
  }

  // ดึงข้อมูลสุขภาพย้อนหลัง
  async getHealthHistory(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const query = `
      SELECT 
        measurement_date,
        systolic_bp,
        diastolic_bp,
        heart_rate,
        blood_sugar,
        body_temperature,
        weight_kg,
        created_at as recorded_at
      FROM health_metrics 
      WHERE user_id = $1 AND measurement_date >= $2
      ORDER BY measurement_date ASC
    `;
    
    const result = await this.db.query(query, [userId, timeCondition]);
    return result.rows;
  }

  // ดึงข้อมูลพฤติกรรมย้อนหลัง
  async getBehaviorHistory(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const query = `
      SELECT 
        behavior_date as record_date,
        exercise_minutes,
        sleep_hours,
        water_glasses,
        steps,
        stress_level,
        mood,
        notes,
        created_at as recorded_at
      FROM health_behaviors 
      WHERE user_id = $1 AND behavior_date >= $2
      ORDER BY behavior_date ASC
    `;
    
    const result = await this.db.query(query, [userId, timeCondition]);
    return result.rows;
  }

  // วิเคราะห์แนวโน้ม BMI
  analyzeBMITrend(healthHistory) {
    if (!healthHistory.length) return { trend: 'no_data', risk: 'unknown' };

    // คำนวณ BMI จากข้อมูลที่มี (ต้องมี weight และ height จาก user_profiles)
    const bmiData = healthHistory.map(record => {
      // สมมติว่ามีข้อมูล weight และ height
      const bmi = this.calculateBMI(record.weight, record.height);
      return {
        date: record.measurement_date,
        bmi: bmi,
        category: this.getBMICategory(bmi)
      };
    }).filter(item => item.bmi);

    if (bmiData.length < 2) return { trend: 'insufficient_data' };

    const firstBMI = bmiData[0].bmi;
    const lastBMI = bmiData[bmiData.length - 1].bmi;
    const change = lastBMI - firstBMI;
    const changePercentage = (change / firstBMI) * 100;

    return {
      trend: change > 0.5 ? 'increasing' : change < -0.5 ? 'decreasing' : 'stable',
      change: change,
      changePercentage: changePercentage.toFixed(2),
      current: lastBMI,
      category: this.getBMICategory(lastBMI),
      data: bmiData
    };
  }

  // วิเคราะห์แนวโน้มความดันโลหิต
  analyzeBloodPressureTrend(healthHistory) {
    const bpData = healthHistory
      .filter(record => record.systolic_bp && record.diastolic_bp)
      .map(record => ({
        date: record.measurement_date,
        systolic: record.systolic_bp,
        diastolic: record.diastolic_bp,
        category: this.getBPCategory(record.systolic_bp, record.diastolic_bp)
      }));

    if (bpData.length < 2) return { trend: 'insufficient_data' };

    const avgSystolic = bpData.reduce((sum, item) => sum + item.systolic, 0) / bpData.length;
    const avgDiastolic = bpData.reduce((sum, item) => sum + item.diastolic, 0) / bpData.length;
    
    const recentAvg = bpData.slice(-3).reduce((sum, item) => sum + item.systolic, 0) / Math.min(3, bpData.length);
    const earlierAvg = bpData.slice(0, 3).reduce((sum, item) => sum + item.systolic, 0) / Math.min(3, bpData.length);

    return {
      trend: recentAvg > earlierAvg + 5 ? 'increasing' : recentAvg < earlierAvg - 5 ? 'decreasing' : 'stable',
      averages: { systolic: avgSystolic.toFixed(1), diastolic: avgDiastolic.toFixed(1) },
      current: bpData[bpData.length - 1],
      riskLevel: this.getBPRiskLevel(avgSystolic, avgDiastolic),
      data: bpData
    };
  }

  // วิเคราะห์แนวโน้มน้ำตาลในเลือด
  analyzeBloodSugarTrend(healthHistory) {
    const sugarData = healthHistory
      .filter(record => record.blood_sugar_mg)
      .map(record => ({
        date: record.measurement_date,
        level: record.blood_sugar_mg,
        hba1c: record.hba1c,
        category: this.getBloodSugarCategory(record.blood_sugar_mg)
      }));

    if (sugarData.length < 2) return { trend: 'insufficient_data' };

    const avgLevel = sugarData.reduce((sum, item) => sum + item.level, 0) / sugarData.length;
    const firstLevel = sugarData[0].level;
    const lastLevel = sugarData[sugarData.length - 1].level;

    return {
      trend: lastLevel > firstLevel + 10 ? 'increasing' : lastLevel < firstLevel - 10 ? 'decreasing' : 'stable',
      average: avgLevel.toFixed(1),
      current: lastLevel,
      diabetesRisk: this.getDiabetesRisk(avgLevel),
      data: sugarData
    };
  }

  // วิเคราะห์แนวโน้มไลฟ์สไตล์
  analyzeLifestyleTrend(behaviorHistory) {
    if (!behaviorHistory.length) return { 
      exercise: { average: '0', recommendation: 'needs_improvement' },
      sleep: { average: '0', recommendation: 'needs_improvement' },
      stress: { average: '0', level: 'low' }
    };

    const exerciseRecords = behaviorHistory.filter(record => record.exercise_duration_minutes);
    const avgExercise = exerciseRecords.length > 0 
      ? exerciseRecords.reduce((sum, record) => sum + record.exercise_duration_minutes, 0) / exerciseRecords.length 
      : 0;

    const sleepRecords = behaviorHistory.filter(record => record.sleep_hours_per_night);
    const avgSleep = sleepRecords.length > 0
      ? sleepRecords.reduce((sum, record) => sum + record.sleep_hours_per_night, 0) / sleepRecords.length
      : 0;

    const stressRecords = behaviorHistory.filter(record => record.stress_level);
    const avgStress = stressRecords.length > 0
      ? stressRecords.reduce((sum, record) => sum + this.getStressScore(record.stress_level), 0) / stressRecords.length
      : 0;

    return {
      exercise: {
        average: avgExercise.toFixed(1),
        recommendation: avgExercise >= 150 ? 'good' : 'needs_improvement'
      },
      sleep: {
        average: avgSleep.toFixed(1),
        recommendation: avgSleep >= 7 && avgSleep <= 9 ? 'good' : 'needs_improvement'
      },
      stress: {
        average: avgStress.toFixed(1),
        level: avgStress <= 3 ? 'low' : avgStress <= 6 ? 'moderate' : 'high'
      }
    };
  }

  // คำนวณคะแนนสุขภาพรวม
  calculateOverallHealthScore(healthHistory, behaviorHistory) {
    let score = 100;
    const factors = [];

    // ประเมินจาก BMI
    if (healthHistory.length > 0) {
      const latestHealth = healthHistory[healthHistory.length - 1];
      // สมมติมีข้อมูล BMI
      // score = this.adjustScoreForBMI(score, latestHealth.bmi);
    }

    // ประเมินจากพฤติกรรม
    if (behaviorHistory.length > 0) {
      const lifestyle = this.analyzeLifestyleTrend(behaviorHistory);
      if (lifestyle.exercise.recommendation === 'needs_improvement') score -= 15;
      if (lifestyle.sleep.recommendation === 'needs_improvement') score -= 10;
      if (lifestyle.stress.level === 'high') score -= 20;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      grade: this.getHealthGrade(score),
      factors: factors
    };
  }

  // สร้างคำแนะนำจาก AI ตามแนวโน้ม
  async generateTrendRecommendations(trends, context = {}) {
    try {
      const aiResult = await generateHealthAdvice({
        trends,
        profile: context.profile,
        healthHistory: context.healthHistory,
        behaviorHistory: context.behaviorHistory,
        medications: context.medications,
        profileMedications: context.profileMedications,
        profileConditions: context.profileConditions
      });

      if (aiResult?.success && aiResult.data) {
        return {
          ...aiResult.data,
          meta: {
            ...(aiResult.data.meta || {}),
            source: 'ai',
            generatedAt: new Date().toISOString()
          }
        };
      }

      console.warn('⚠️ Falling back to default recommendations:', aiResult?.reason);
      return this.getDefaultRecommendations({
        trends,
        context,
        failureReason: aiResult?.reason,
        rawAiText: aiResult?.rawText
      });
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getDefaultRecommendations({ trends, context, failureReason: error.message });
    }
  }

  // ระบุปัจจัยเสี่ยง
  identifyRiskFactors(trends) {
    const risks = [];

    if (trends?.bmi?.trend === 'increasing' && trends?.bmi?.category === 'อ้วน') {
      risks.push({
        type: 'obesity',
        level: 'high',
        description: 'น้ำหนักเพิ่มขึ้นอย่างต่อเนื่อง'
      });
    }

    if (trends?.bloodPressure?.riskLevel === 'high') {
      risks.push({
        type: 'hypertension',
        level: 'high',
        description: 'ความดันโลหิตสูงเกินปกติ'
      });
    }

    if (trends?.bloodSugar?.diabetesRisk === 'high') {
      risks.push({
        type: 'diabetes',
        level: 'high',
        description: 'ความเสี่ยงเบาหวานสูง'
      });
    }

    if (trends?.lifestyle?.stress?.level === 'high') {
      risks.push({
        type: 'stress',
        level: 'moderate',
        description: 'ระดับความเครียดสูง'
      });
    }

    return risks;
  }

  // ระบุจุดที่ปรับปรุงได้
  identifyImprovements(trends) {
    const improvements = [];

    if (trends?.bmi?.trend === 'decreasing') {
      improvements.push({
        area: 'weight_management',
        progress: 'good',
        description: 'การควบคุมน้ำหนักดีขึ้น'
      });
    }

    if (trends?.lifestyle?.exercise?.recommendation === 'good') {
      improvements.push({
        area: 'physical_activity',
        progress: 'excellent',
        description: 'การออกกำลังกายเพียงพอแล้ว'
      });
    }

    if (trends?.lifestyle?.sleep?.recommendation === 'good') {
      improvements.push({
        area: 'sleep_quality',
        progress: 'good',
        description: 'คุณภาพการนอนหลับดีขึ้น'
      });
    }

    if (trends?.bloodPressure?.riskLevel === 'low') {
      improvements.push({
        area: 'cardiovascular_health',
        progress: 'excellent',
        description: 'สุขภาพหัวใจและหลอดเลือดดี'
      });
    }

    return improvements;
  }

  // Helper methods
  calculateBMI(weight, height) {
    if (!weight || !height) return null;
    return weight / Math.pow(height / 100, 2);
  }

  getBMICategory(bmi) {
    if (bmi < 18.5) return 'น้ำหนักน้อย';
    if (bmi < 25) return 'ปกติ';
    if (bmi < 30) return 'น้ำหนักเกิน';
    return 'อ้วน';
  }

  getBPCategory(systolic, diastolic) {
    if (systolic < 120 && diastolic < 80) return 'ปกติ';
    if (systolic < 130 && diastolic < 80) return 'สูงเล็กน้อย';
    if (systolic < 140 || diastolic < 90) return 'สูงระดับ 1';
    return 'สูงระดับ 2';
  }

  getBPRiskLevel(systolic, diastolic) {
    if (systolic >= 140 || diastolic >= 90) return 'high';
    if (systolic >= 130 || diastolic >= 80) return 'moderate';
    return 'low';
  }

  getBloodSugarCategory(level) {
    if (level < 100) return 'ปกติ';
    if (level < 126) return 'ก่อนเบาหวาน';
    return 'เบาหวาน';
  }

  getDiabetesRisk(avgLevel) {
    if (avgLevel >= 126) return 'high';
    if (avgLevel >= 100) return 'moderate';
    return 'low';
  }

  getStressScore(level) {
    const scores = { 'low': 2, 'moderate': 5, 'high': 8 };
    return scores[level] || 5;
  }

  getHealthGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getTimeCondition(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1month': return new Date(now.setMonth(now.getMonth() - 1));
      case '3months': return new Date(now.setMonth(now.getMonth() - 3));
      case '6months': return new Date(now.setMonth(now.getMonth() - 6));
      case '1year': return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return new Date(now.setMonth(now.getMonth() - 6));
    }
  }

  getDefaultRecommendations({ trends = {}, context = {}, failureReason = null } = {}) {
    const dietTips = [];
    const exerciseTips = [];
    const lifestyleTips = [];
    const medicationGuidance = [];
    const monitoringTips = [];
    const warningSignals = [];
    const improvements = [];
    const riskFactors = [];

    const addUnique = (arr, value) => {
      if (!value || arr.includes(value)) return;
      arr.push(value);
    };

    const bpTrend = trends?.bloodPressure || {};
    const bmiTrend = trends?.bmi || {};
    const sugarTrend = trends?.bloodSugar || {};
    const lifestyleTrend = trends?.lifestyle || {};

    if (bpTrend.riskLevel === 'high') {
      addUnique(dietTips, 'ลดการบริโภคโซเดียม เลี่ยงอาหารหมักดองและอาหารสำเร็จรูป');
      addUnique(lifestyleTips, 'วัดความดันโลหิตอย่างน้อยวันละ 2 ครั้งและบันทึกไว้ทุกครั้ง');
      addUnique(monitoringTips, 'ติดตามความดันโลหิตทุกเช้า-เย็น และพบแพทย์หากเกิน 140/90 mmHg');
      addUnique(medicationGuidance, 'ทานยาลดความดันโลหิตตรงเวลา ห้ามหยุดยาเอง');
      riskFactors.push({ title: 'ความดันโลหิตสูง', description: 'มีแนวโน้มความดันสูง ต้องควบคุมโซเดียมและติดตามใกล้ชิด' });
      addUnique(warningSignals, 'หากมีอาการแน่นหน้าอก เวียนศีรษะ หรือปวดศีรษะรุนแรงให้พบแพทย์ทันที');
    } else if (bpTrend.riskLevel === 'moderate') {
      addUnique(dietTips, 'จำกัดอาหารรสเค็ม จัดเมนูที่ใช้สมุนไพรแทนเกลือ');
      addUnique(monitoringTips, 'วัดความดันอย่างน้อยสัปดาห์ละ 3 ครั้ง');
    }

    if (bmiTrend.current && Number(bmiTrend.current) > 25) {
      addUnique(dietTips, 'เพิ่มผักผลไม้ ลดน้ำตาลและอาหารทอดเพื่อควบคุมน้ำหนัก');
      addUnique(exerciseTips, 'ออกกำลังกายแบบคาร์ดิโอระดับปานกลาง 150 นาทีต่อสัปดาห์ร่วมกับฝึกแรงต้าน');
      riskFactors.push({ title: 'น้ำหนักเกิน', description: 'BMI สูงกว่ามาตรฐานต้องควบคุมการกินและออกกำลังกายสม่ำเสมอ' });
    } else if (bmiTrend.trend === 'decreasing') {
      addUnique(improvements, 'น้ำหนักมีแนวโน้มลดลง เป็นสัญญาณที่ดี ควรรักษาพฤติกรรมนี้ต่อเนื่อง');
    }

    if (sugarTrend.diabetesRisk === 'high') {
      addUnique(dietTips, 'ลดคาร์โบไฮเดรตขัดสี เลือกธัญพืชไม่ขัดสีและเพิ่มไฟเบอร์ทุกมื้อ');
      addUnique(monitoringTips, 'ตรวจระดับน้ำตาลปลายนิ้วตามที่แพทย์กำหนดและบันทึกค่า');
      riskFactors.push({ title: 'ความเสี่ยงเบาหวาน', description: 'ระดับน้ำตาลสูง ต้องควบคุมอาหารและติดตาม HbA1c' });
      addUnique(warningSignals, 'หากมีอาการกระหายน้ำ ปัสสาวะบ่อย หรือแผลหายช้า ให้ปรึกษาแพทย์');
    } else if (sugarTrend.trend === 'decreasing') {
      addUnique(improvements, 'น้ำตาลในเลือดมีแนวโน้มดีขึ้น รักษาพฤติกรรมการกินและออกกำลังกายต่อไป');
    }

    const exerciseAverage = lifestyleTrend?.exercise?.average;
    if (exerciseAverage) {
      const value = Number(exerciseAverage);
      if (!Number.isNaN(value) && value < 150) {
        addUnique(exerciseTips, 'ตั้งเป้าออกกำลังกายให้ครบอย่างน้อย 150 นาที/สัปดาห์');
      } else if (!Number.isNaN(value) && value >= 150) {
        addUnique(improvements, 'การออกกำลังกายเพียงพอแล้ว รักษาความสม่ำเสมอ');
      }
    }

    const sleepAverage = lifestyleTrend?.sleep?.average;
    if (sleepAverage) {
      const value = Number(sleepAverage);
      if (!Number.isNaN(value) && (value < 7 || value > 9)) {
        addUnique(lifestyleTips, 'จัดเวลานอนให้ได้ 7-8 ชั่วโมงต่อคืนและหลีกเลี่ยงหน้าจอก่อนนอน');
      } else if (!Number.isNaN(value)) {
        addUnique(improvements, 'การนอนได้ตามเป้าหมาย 7-8 ชั่วโมง ถือว่าดี');
      }
    }

    if (lifestyleTrend?.stress?.level === 'high') {
      addUnique(lifestyleTips, 'ฝึกการหายใจลึก โยคะ หรือสมาธิวันละ 10 นาทีเพื่อลดความเครียด');
      addUnique(monitoringTips, 'ประเมินความเครียดทุกสัปดาห์และหากนอนไม่หลับติดต่อกันควรพบแพทย์');
      riskFactors.push({ title: 'ความเครียดสูง', description: 'ระดับความเครียดสูง อาจกระทบความดันและน้ำตาลในเลือด' });
    }

    const recommendations = {};
  if (dietTips.length) recommendations.diet = [...dietTips];
  if (exerciseTips.length) recommendations.exercise = [...exerciseTips];
  if (lifestyleTips.length) recommendations.lifestyle = [...lifestyleTips];
  if (medicationGuidance.length) recommendations.medication = [...medicationGuidance];
  if (monitoringTips.length) recommendations.monitoring = [...monitoringTips];
  if (warningSignals.length) recommendations.warning = [...warningSignals];

    const overallParts = [];
    if (bpTrend.riskLevel === 'high') overallParts.push('ความดันโลหิตยังสูง ต้องควบคุมอาหารและติดตามใกล้ชิด');
    if (sugarTrend.diabetesRisk === 'high') overallParts.push('น้ำตาลในเลือดสูง ต้องควบคุมอาหารและพบแพทย์ตามนัด');
    if (!overallParts.length) {
      overallParts.push('ข้อมูล AI ไม่พร้อม จึงแสดงคำแนะนำทั่วไปตามแนวโน้มที่มีอยู่');
    }

    return {
      overall_assessment: overallParts.join(' '),
      recommendations,
      riskFactors,
      improvements,
  monitoringPlan: [...monitoringTips],
  medicationNotes: [...medicationGuidance],
      followUp: 'ติดตามผลกับแพทย์ประจำตัวภายใน 1-3 เดือนหรือเร็วกว่าหากมีอาการ',
      meta: {
        source: 'fallback',
        reason: failureReason || 'ai_unavailable',
        generatedAt: new Date().toISOString(),
        usedContext: {
          hasBehaviorHistory: Array.isArray(context?.behaviorHistory) && context.behaviorHistory.length > 0,
          hasHealthHistory: Array.isArray(context?.healthHistory) && context.healthHistory.length > 0,
        }
      }
    };
  }
}

export default HealthAnalytics;
