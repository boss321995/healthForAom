-- Insert test health data for analytics demonstration
-- User 1 test data

-- Health metrics data for trend analysis
INSERT INTO health_metrics (user_id, weight, height, blood_pressure_systolic, blood_pressure_diastolic, blood_sugar, created_at) VALUES
(1, 70.5, 170, 120, 80, 95, '2024-06-01 10:00:00'),
(1, 71.0, 170, 125, 82, 98, '2024-07-01 10:00:00'),
(1, 71.5, 170, 122, 81, 97, '2024-08-01 10:00:00'),
(1, 72.0, 170, 128, 84, 102, '2024-09-01 10:00:00'),
(1, 72.5, 170, 130, 85, 105, '2024-10-01 10:00:00'),
(1, 73.0, 170, 132, 87, 108, '2024-11-01 10:00:00'),
(1, 73.5, 170, 135, 90, 110, '2024-12-01 10:00:00');

-- Health behaviors data
INSERT INTO health_behaviors (user_id, exercise_frequency, exercise_duration, smoking_status, alcohol_consumption, sleep_hours, stress_level, diet_quality, water_intake, created_at) VALUES
(1, 3, 45, 'never', 'occasional', 7, 'moderate', 'good', 8, '2024-06-01 10:00:00'),
(1, 4, 50, 'never', 'occasional', 7, 'moderate', 'good', 8, '2024-07-01 10:00:00'),
(1, 3, 40, 'never', 'occasional', 6, 'high', 'fair', 7, '2024-08-01 10:00:00'),
(1, 2, 30, 'never', 'moderate', 6, 'high', 'fair', 6, '2024-09-01 10:00:00'),
(1, 2, 25, 'never', 'moderate', 5, 'very_high', 'poor', 5, '2024-10-01 10:00:00'),
(1, 1, 20, 'never', 'frequent', 5, 'very_high', 'poor', 4, '2024-11-01 10:00:00'),
(1, 1, 15, 'never', 'frequent', 4, 'very_high', 'poor', 4, '2024-12-01 10:00:00');

-- Health assessments data
INSERT INTO health_assessments (user_id, assessment_type, score, recommendations, risk_factors, created_at) VALUES
(1, 'comprehensive', 85, 'ออกกำลังกายสม่ำเสมอ, ลดน้ำหนัก, ควบคุมความเครียด', 'น้ำหนักเกิน, ความเครียด', '2024-06-01 10:00:00'),
(1, 'comprehensive', 80, 'ออกกำลังกายเพิ่มขึ้น, ควบคุมอาหาร, จัดการความเครียด', 'น้ำหนักเกิน, ความดันโลหิตขอบเขต', '2024-07-01 10:00:00'),
(1, 'comprehensive', 75, 'ปรับปรุงพฤติกรรมการออกกำลังกาย, ควบคุมน้ำตาลในเลือด', 'น้ำหนักเกิน, ความดันโลหิตสูง, ความเครียด', '2024-08-01 10:00:00'),
(1, 'comprehensive', 70, 'เพิ่มการออกกำลังกาย, ปรับปรุงคุณภาพการนอน, ลดความเครียด', 'โรคอ้วน, ความดันโลหิตสูง, น้ำตาลในเลือดสูง', '2024-09-01 10:00:00'),
(1, 'comprehensive', 65, 'เปลี่ยนแปลงวิถีชีวิต, ออกกำลังกายเร่งด่วน, ปรึกษาแพทย์', 'โรคอ้วน, ความดันโลหิตสูง, เบาหวานขอบเขต', '2024-10-01 10:00:00'),
(1, 'comprehensive', 60, 'ปรึกษาแพทย์เร่งด่วน, เปลี่ยนแปลงวิถีชีวิตโดยสิ้นเชิง', 'โรคอ้วน, ความดันโลหิตสูงมาก, เบาหวาน', '2024-11-01 10:00:00'),
(1, 'comprehensive', 55, 'ต้องการการดูแลทางการแพทย์ด่วน, เปลี่ยนแปลงวิถีชีวิตทันที', 'โรคอ้วนรุนแรง, ความดันโลหิตสูงอันตราย, เบาหวาน', '2024-12-01 10:00:00');

-- Update user profile for more realistic data
UPDATE users SET
  date_of_birth = '1985-05-15',
  gender = 'male',
  phone = '0812345678',
  emergency_contact = 'คุณสมหญิง 0823456789'
WHERE id = 1;

-- Additional test data for demo purposes
INSERT INTO health_goals (user_id, goal_type, target_value, current_value, target_date, status, created_at) VALUES
(1, 'weight_loss', 68.0, 73.5, '2025-03-01', 'active', NOW()),
(1, 'exercise', 5, 1, '2025-02-01', 'active', NOW()),
(1, 'blood_pressure', 120, 135, '2025-01-15', 'active', NOW());

-- Medical history
INSERT INTO medical_history (user_id, condition_name, diagnosis_date, status, medications, notes, created_at) VALUES
(1, 'ความดันโลหิตสูงขอบเขต', '2024-09-01', 'active', 'ไม่มี', 'ควรควบคุมด้วยการออกกำลังกายและอาหาร', NOW()),
(1, 'น้ำหนักเกิน', '2024-07-01', 'active', 'ไม่มี', 'BMI อยู่ในเกณฑ์เกิน ควรลดน้ำหนัก 5-10 กิโลกรัม', NOW());

-- Family health history
INSERT INTO family_health_history (user_id, relation, condition_name, age_of_onset, notes, created_at) VALUES
(1, 'father', 'เบาหวานชนิดที่ 2', 55, 'เริ่มป่วยตอนอายุ 55 ปี', NOW()),
(1, 'mother', 'ความดันโลหิตสูง', 50, 'ควบคุมด้วยยา', NOW()),
(1, 'grandfather_paternal', 'โรคหัวใจ', 65, 'เสียชีวิตด้วยโรคหัวใจ', NOW());
