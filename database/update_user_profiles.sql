-- Update user_profiles table to match the form data structure
-- เพิ่มคอลัมน์และแก้ไขโครงสร้างให้ตรงกับฟอร์มสมัครสมาชิก

USE health_management;

-- เพิ่มคอลัมน์ที่ขาดหายไป
ALTER TABLE user_profiles 
ADD full_name VARCHAR(100) AFTER user_id;

ALTER TABLE user_profiles 
ADD medical_conditions TEXT AFTER emergency_phone;

ALTER TABLE user_profiles 
ADD medications TEXT AFTER medical_conditions;

ALTER TABLE user_profiles 
ADD allergies TEXT AFTER medications;

ALTER TABLE user_profiles 
ADD allow_research_data BOOLEAN DEFAULT TRUE AFTER allergies;

-- อัพเดทข้อมูลที่มีอยู่แล้ว (ถ้ามี first_name และ last_name)
UPDATE user_profiles 
SET full_name = CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, ''))
WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- ตรวจสอบโครงสร้างตาราง
DESCRIBE user_profiles;

-- แสดงข้อมูลที่มีอยู่
SELECT user_id, full_name, first_name, last_name, date_of_birth, gender, height_cm, weight_kg, 
       phone, emergency_contact, medical_conditions, medications, allergies 
FROM user_profiles;
