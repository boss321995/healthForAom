import express from 'express';
import mysql from 'mysql2/promise';
// import { getHealthRecommendations } from '../src/utils/gemini.js';

// Health Analytics API for AI Trend Analysis
class HealthAnalytics {
  constructor(dbConnection) {
    this.db = dbConnection;
  }

  // วิเคราะห์แนวโน้มสุขภาพของผู้ใช้
  async analyzeHealthTrends(userId, timeRange = '6months') {
    try {
      const healthHistory = await this.getHealthHistory(userId, timeRange);
      const behaviorHistory = await this.getBehaviorHistory(userId, timeRange);
      
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
      const aiRecommendations = await this.generateTrendRecommendations(trends);
      
      return {
        success: true,
        data: {
          trends,
          recommendations: aiRecommendations,
          riskFactors: this.identifyRiskFactors(trends),
          improvements: this.identifyImprovements(trends)
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
        blood_sugar_mg,
        cholesterol_total,
        cholesterol_hdl,
        cholesterol_ldl,
        triglycerides,
        hba1c,
        body_fat_percentage,
        muscle_mass_kg,
        created_at
      FROM health_metrics 
      WHERE user_id = ? AND measurement_date >= ?
      ORDER BY measurement_date ASC
    `;
    
    const [rows] = await this.db.execute(query, [userId, timeCondition]);
    return rows;
  }

  // ดึงข้อมูลพฤติกรรมย้อนหลัง
  async getBehaviorHistory(userId, timeRange) {
    const timeCondition = this.getTimeCondition(timeRange);
    
    const query = `
      SELECT 
        record_date,
        exercise_frequency,
        exercise_duration_minutes,
        smoking_status,
        cigarettes_per_day,
        alcohol_frequency,
        alcohol_units_per_week,
        sleep_hours_per_night,
        stress_level,
        diet_quality,
        water_intake_liters,
        created_at
      FROM health_behaviors 
      WHERE user_id = ? AND record_date >= ?
      ORDER BY record_date ASC
    `;
    
    const [rows] = await this.db.execute(query, [userId, timeCondition]);
    return rows;
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
  async generateTrendRecommendations(trends) {
    try {
      const trendSummary = {
        bmi_trend: trends.bmi.trend,
        bp_trend: trends.bloodPressure.trend,
        sugar_trend: trends.bloodSugar.trend,
        lifestyle_score: trends.overall.score,
        risk_factors: trends.bloodPressure.riskLevel
      };

      // return await getHealthRecommendations(trendSummary);
      return this.getDefaultRecommendations();
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getDefaultRecommendations();
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

  getDefaultRecommendations() {
    return {
      overall_assessment: "ควรปรึกษาแพทย์เพื่อประเมินสุขภาพ",
      recommendations: {
        diet: ["รับประทานอาหารที่มีประโยชน์"],
        exercise: ["ออกกำลังกายสม่ำเสมอ"],
        lifestyle: ["นอนหลับให้เพียงพอ"]
      }
    };
  }
}

export default HealthAnalytics;
