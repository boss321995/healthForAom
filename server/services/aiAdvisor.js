import { GoogleGenerativeAI } from '@google/generative-ai';

const logAiEvent = (level, message, details = {}) => {
  const timestamp = new Date().toISOString();
  const logPayload = {
    timestamp,
    message,
    ...details,
  };

  if (level === 'error') {
    console.error('🤖 [AI Advisor]', logPayload);
  } else if (level === 'warn') {
    console.warn('🤖 [AI Advisor]', logPayload);
  } else {
    console.info('🤖 [AI Advisor]', logPayload);
  }
};

let cachedClient = null;
let cachedApiKey = null;

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL ||
  process.env.GENERATIVE_AI_MODEL ||
  'gemini-1.5-flash-latest';

const resolveApiKey = () => {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GENERATIVE_AI_API_KEY ||
    process.env.GENAI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.REACT_APP_GEMINI_API_KEY ||
    null
  );
};

const getClient = () => {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return null;
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenerativeAI(apiKey);
    cachedApiKey = apiKey;
  }
  return cachedClient;
};

const ensureArray = (input) => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const summarizeHistory = (records = [], limit = 5) => {
  return records
    .slice(Math.max(records.length - limit, 0))
    .map((record) => {
      const pieces = [];
      const date = formatDate(record.measurement_date || record.record_date || record.behavior_date || record.created_at);
      if (date) {
        pieces.push(`วันที่ ${date}`);
      }
      if (record.systolic_bp || record.diastolic_bp) {
        pieces.push(`ความดัน ${record.systolic_bp || '-'} / ${record.diastolic_bp || '-'}`);
      }
      if (record.blood_sugar || record.blood_sugar_mg) {
        const sugar = record.blood_sugar || record.blood_sugar_mg;
        pieces.push(`น้ำตาล ${sugar} mg/dL`);
      }
      if (record.weight_kg || record.weight) {
        pieces.push(`น้ำหนัก ${record.weight_kg || record.weight} กก.`);
      }
      if (record.sleep_hours || record.sleep_hours_per_night) {
        pieces.push(`การนอน ${record.sleep_hours || record.sleep_hours_per_night} ชม.`);
      }
      if (record.exercise_minutes || record.exercise_duration_minutes) {
        pieces.push(`ออกกำลังกาย ${record.exercise_minutes || record.exercise_duration_minutes} นาที`);
      }
      if (record.stress_level) {
        pieces.push(`ความเครียดระดับ ${record.stress_level}`);
      }
      if (record.notes) {
        pieces.push(`บันทึก: ${record.notes}`);
      }
      return pieces.join(' | ');
    })
    .filter(Boolean);
};

const normalizeAdvice = (rawAdvice = {}) => {
  const overall =
    rawAdvice.overall_assessment ||
    rawAdvice.overallAssessment ||
    rawAdvice.summary ||
    rawAdvice.summaryText ||
    rawAdvice.assessment ||
    '';

  const recSource = rawAdvice.recommendations || rawAdvice.actions || {};
  const normalizedRecommendations = {};
  if (Array.isArray(recSource)) {
    normalizedRecommendations.general = recSource;
  } else if (recSource && typeof recSource === 'object') {
    Object.entries(recSource).forEach(([key, value]) => {
      if (!value) return;
      normalizedRecommendations[key] = ensureArray(value);
    });
  }

  const riskFactors = ensureArray(rawAdvice.riskFactors || rawAdvice.risks || rawAdvice.concerns);
  const improvements = ensureArray(rawAdvice.improvements || rawAdvice.focusAreas || rawAdvice.strengths);
  const monitoringPlan = ensureArray(
    rawAdvice.monitoringPlan ||
      rawAdvice.followUp ||
      rawAdvice.follow_up ||
      rawAdvice.monitoring ||
      rawAdvice.nextActions ||
      rawAdvice.next_steps
  );

  const medicationNotes = ensureArray(rawAdvice.medicationNotes || rawAdvice.medication || rawAdvice.drugSafety);

  const meta = {
    source: rawAdvice.source || 'gemini',
    model: rawAdvice.model || DEFAULT_MODEL,
  };

  return {
    overall_assessment: overall,
    recommendations: normalizedRecommendations,
    riskFactors,
    improvements,
    monitoringPlan,
    medicationNotes,
    followUp: rawAdvice.followUp || rawAdvice.follow_up || rawAdvice.nextCheck || null,
    meta,
  };
};

const extractJson = (text) => {
  if (!text) return null;

  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const candidate = codeBlockMatch[1].trim();
    try {
      return JSON.parse(candidate);
    } catch (error) {
      console.error('❌ Failed to parse JSON from fenced code block', error.message);
    }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    const candidate = braceMatch[0];
    try {
      return JSON.parse(candidate);
    } catch (error) {
      console.error('❌ Failed to parse JSON from braces', error.message);
    }
  }

  return null;
};

const buildPrompt = ({
  profile = {},
  trends = {},
  healthHistory = [],
  behaviorHistory = [],
  medications = [],
  profileMedications = [],
  profileConditions = [],
}) => {
  const age = calculateAge(profile.date_of_birth);
  const gender = profile.gender || 'ไม่ระบุ';
  const height = profile.height_cm ? `${profile.height_cm} ซม.` : 'ไม่ระบุ';
  const weight = profile.weight_kg ? `${profile.weight_kg} กก.` : 'ไม่ระบุ';
  const bmi = trends?.bmi?.current ? `${Number(trends.bmi.current).toFixed(1)}` : profile.bmi || 'ไม่ระบุ';
  const bmiTrend = trends?.bmi?.trend || 'unknown';
  const bpTrend = trends?.bloodPressure?.trend || 'unknown';
  const bpRisk = trends?.bloodPressure?.riskLevel || 'unknown';
  const sugarTrend = trends?.bloodSugar?.trend || 'unknown';
  const lifestyle = trends?.lifestyle || {};
  const overallScore = trends?.overall?.score || null;

  const latestConditionSummary = profileConditions.length
    ? profileConditions.join(', ')
    : 'ไม่มีข้อมูลโรคประจำตัว';

  const medicationLines = medications.length
    ? medications.map((med) => {
        const name = med.medication_name || med.name || med.title || 'ไม่ระบุชื่อยา';
        const dose = med.dosage || med.dose || med.dose_mg || '';
        const frequency = med.frequency || med.frequency_per_day || '';
        const schedule = med.time_schedule || med.timing || '';
        const pieces = [name];
        if (dose) pieces.push(`ขนาด ${dose}`);
        if (frequency) pieces.push(`ความถี่ ${frequency}`);
        if (schedule) pieces.push(`ช่วงเวลา ${schedule}`);
        return pieces.join(' | ');
      })
    : profileMedications.length
    ? profileMedications
    : ['ไม่มีข้อมูลยาที่รับประทาน'];

  const vitalsHistorySummary = summarizeHistory(healthHistory, 4).join('\n- ');
  const behaviorHistorySummary = summarizeHistory(behaviorHistory, 4).join('\n- ');

  const lifestyleSummary = `ออกกำลังกายเฉลี่ย ${lifestyle?.exercise?.average ?? 'ไม่ระบุ'} นาที/สัปดาห์, ` +
    `การนอนเฉลี่ย ${lifestyle?.sleep?.average ?? 'ไม่ระบุ'} ชั่วโมง/คืน, ` +
    `ระดับความเครียด ${lifestyle?.stress?.level || 'ไม่ระบุ'}`;

  const overallSummary = overallScore
    ? `คะแนนสุขภาพรวมล่าสุด ${overallScore}/100`
    : 'ไม่มีคะแนนสุขภาพรวม';

  return `คุณเป็นแพทย์ผู้เชี่ยวชาญด้านเวชศาสตร์ครอบครัวที่ให้คำปรึกษาระยะไกล

ข้อมูลผู้ใช้ (ตอบเป็นภาษาไทย):
- เพศ: ${gender}
- อายุ: ${age ?? 'ไม่ระบุ'} ปี
- ส่วนสูง: ${height}
- น้ำหนักล่าสุด: ${weight}
- BMI ปัจจุบัน: ${bmi} (แนวโน้ม: ${bmiTrend})
- โรคประจำตัว: ${latestConditionSummary}
- ยาที่ใช้อยู่:
- ${medicationLines.join('\n- ')}

แนวโน้มสุขภาพในช่วง 6 เดือน:
- Blood pressure trend: ${bpTrend} (ระดับความเสี่ยง: ${bpRisk})
- Blood sugar trend: ${sugarTrend}
- Lifestyle summary: ${lifestyleSummary}
- ${overallSummary}

ประวัติค่าตรวจล่าสุด:
- ${vitalsHistorySummary || 'ไม่มีข้อมูล'}

พฤติกรรมและไลฟ์สไตล์ล่าสุด:
- ${behaviorHistorySummary || 'ไม่มีข้อมูล'}

โปรดวิเคราะห์ภาพรวมสุขภาพ เน้นความเสี่ยงตามโรคประจำตัวและยาที่ใช้ โดยเฉพาะผลต่อความดันโลหิตสูง น้ำตาลในเลือด และการโต้ตอบของยา

ตอบในรูปแบบ JSON (อย่าเพิ่มคำอธิบายเพิ่มเติม) โครงสร้างดังนี้:
{
  "overall_assessment": "สรุปสุขภาพโดยรวม",
  "riskFactors": ["รายการปัจจัยเสี่ยงสำคัญ"],
  "recommendations": {
    "diet": ["คำแนะนำด้านอาหาร"],
    "exercise": ["คำแนะนำการออกกำลังกาย"],
    "lifestyle": ["คำแนะนำการใช้ชีวิต"],
    "medication": ["คำแนะนำเกี่ยวกับยา"],
    "monitoring": ["การติดตามอาการ"],
    "warning": ["สัญญาณเตือนที่ควรพบแพทย์"]
  },
  "improvements": ["สิ่งที่ทำได้ดีหรือพัฒนาต่อ"],
  "monitoringPlan": ["สิ่งที่ต้องเฝ้าระวัง"],
  "followUp": "ช่วงเวลาหรือวิธีติดตามผลที่แนะนำ"
}
หากไม่มั่นใจหรือข้อมูลไม่เพียงพอ ให้ระบุในค่า followUp
`;
};

export const generateHealthAdvice = async (payload) => {
  const client = getClient();
  if (!client) {
    return {
      success: false,
      reason: 'missing_api_key',
    };
  }

  try {
    const modelName = DEFAULT_MODEL;
    const model = client.getGenerativeModel({ model: modelName });
    const prompt = buildPrompt(payload);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response?.text?.() ?? '';

    const parsed = extractJson(text);
    if (!parsed) {
      logAiEvent('warn', 'Gemini returned an unparseable response', {
        model: modelName,
        rawPreview: text?.slice?.(0, 500) || null,
      });
      return {
        success: false,
        reason: 'invalid_response_format',
        rawText: text,
        model: modelName,
      };
    }
  const advice = normalizeAdvice({ ...parsed, model: modelName, source: 'gemini' });

    logAiEvent('info', 'Gemini advice generated', {
      model: modelName,
      overviewLength: advice?.overall_assessment?.length || 0,
      recommendationSections: advice?.recommendations ? Object.keys(advice.recommendations) : [],
    });

    return {
      success: true,
      data: advice,
      rawText: text,
      model: modelName,
    };
  } catch (error) {
    const enriched = {
      model: DEFAULT_MODEL,
      reason: error?.message || 'unknown_error',
      status: error?.response?.status || null,
      statusText: error?.response?.statusText || null,
      errorType: error?.name || null,
    };

    if (error?.response?.data) {
      enriched.responseData = typeof error.response.data === 'string'
        ? error.response.data.slice(0, 500)
        : error.response.data;
    }

    logAiEvent('error', 'Gemini request failed', enriched);
    return {
      success: false,
      reason: error.message,
    };
  }
};

export default generateHealthAdvice;
