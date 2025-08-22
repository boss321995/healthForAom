-- Health Management System Database
-- Created for React.js Health Application

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: health_management
CREATE DATABASE IF NOT EXISTS `health_management` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `health_management`;

-- ===============================
-- 🏗️ ตารางหลัก (Main Tables)
-- ===============================

-- 1. ตาราง users - ข้อมูลผู้ใช้พื้นฐาน
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตาราง user_profiles - ข้อมูลโปรไฟล์
CREATE TABLE `user_profiles` (
  `profile_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(50),
  `last_name` varchar(50),
  `date_of_birth` date,
  `gender` enum('male','female','other'),
  `height_cm` decimal(5,2),
  `weight_kg` decimal(5,2),
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-'),
  `bmi` decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN height_cm > 0 THEN ROUND(weight_kg / POWER(height_cm/100, 2), 2)
      ELSE NULL 
    END
  ) STORED,
  `phone` varchar(20),
  `emergency_contact` varchar(100),
  `emergency_phone` varchar(20),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_profile` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตาราง health_metrics - ค่าตรวจสุขภาพ
CREATE TABLE `health_metrics` (
  `metric_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `measurement_date` date NOT NULL,
  `systolic_bp` int(11) COMMENT 'ความดันโลหิตบน',
  `diastolic_bp` int(11) COMMENT 'ความดันโลหิตล่าง',
  `heart_rate` int(11) COMMENT 'อัตราการเต้นหัวใจ',
  `blood_sugar_mg` decimal(5,2) COMMENT 'น้ำตาลในเลือด mg/dL',
  `cholesterol_total` decimal(5,2) COMMENT 'คอเลสเตอรอลรวม mg/dL',
  `cholesterol_hdl` decimal(5,2) COMMENT 'HDL mg/dL',
  `cholesterol_ldl` decimal(5,2) COMMENT 'LDL mg/dL',
  `triglycerides` decimal(5,2) COMMENT 'ไตรกลีเซอไรด์ mg/dL',
  `hba1c` decimal(4,2) COMMENT 'HbA1c %',
  `body_fat_percentage` decimal(4,2) COMMENT 'เปอร์เซ็นต์ไขมัน',
  `muscle_mass_kg` decimal(5,2) COMMENT 'มวลกล้ามเนื้อ',
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`metric_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_metrics` (`user_id`, `measurement_date`),
  INDEX `idx_measurement_date` (`measurement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตาราง health_behaviors - พฤติกรรมสุขภาพ
CREATE TABLE `health_behaviors` (
  `behavior_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `record_date` date NOT NULL,
  `smoking_status` enum('never','former','current') DEFAULT 'never',
  `cigarettes_per_day` int(11) DEFAULT 0,
  `alcohol_frequency` enum('never','rarely','weekly','daily') DEFAULT 'never',
  `alcohol_units_per_week` decimal(4,1) DEFAULT 0,
  `exercise_frequency` enum('never','rarely','1-2_times','3-4_times','daily') DEFAULT 'never',
  `exercise_duration_minutes` int(11) DEFAULT 0,
  `sleep_hours_per_night` decimal(3,1),
  `stress_level` enum('low','moderate','high') DEFAULT 'low',
  `diet_quality` enum('poor','fair','good','excellent') DEFAULT 'fair',
  `water_intake_liters` decimal(3,1),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`behavior_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_behaviors` (`user_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตาราง health_assessments - การประเมินความเสี่ยง
CREATE TABLE `health_assessments` (
  `assessment_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `assessment_type` enum('cardiovascular','diabetes','general_health','lifestyle') NOT NULL,
  `assessment_date` date NOT NULL,
  `score` decimal(5,2),
  `risk_level` enum('low','moderate','high','very_high'),
  `recommendations` text,
  `questions_answers` json COMMENT 'คำถามและคำตอบในรูปแบบ JSON',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessment_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_assessments` (`user_id`, `assessment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================
-- 📋 ตารางสำหรับฟีเจอร์พิเศษ
-- ===============================

-- ตาราง reference_values - ค่ามาตรฐาน
CREATE TABLE `reference_values` (
  `ref_id` int(11) NOT NULL AUTO_INCREMENT,
  `metric_type` varchar(50) NOT NULL,
  `gender` enum('male','female','both') DEFAULT 'both',
  `age_min` int(11),
  `age_max` int(11),
  `normal_min` decimal(8,2),
  `normal_max` decimal(8,2),
  `unit` varchar(20),
  `description` varchar(255),
  PRIMARY KEY (`ref_id`),
  INDEX `idx_metric_type` (`metric_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง health_goals - เป้าหมายสุขภาพ
CREATE TABLE `health_goals` (
  `goal_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `goal_type` enum('weight_loss','weight_gain','exercise','diet','quit_smoking','blood_pressure','cholesterol') NOT NULL,
  `target_value` decimal(8,2),
  `current_value` decimal(8,2),
  `target_date` date,
  `status` enum('active','completed','paused','cancelled') DEFAULT 'active',
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`goal_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_goals` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง notifications - ระบบแจ้งเตือน
CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('health_check','goal_reminder','abnormal_value','system') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT 0,
  `scheduled_date` datetime,
  `sent_at` datetime,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_notifications` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง activity_logs - บันทึกการใช้งาน
CREATE TABLE `activity_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11),
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50),
  `record_id` int(11),
  `old_values` json,
  `new_values` json,
  `ip_address` varchar(45),
  `user_agent` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_user_activity` (`user_id`, `created_at`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================
-- 📊 Views
-- ===============================

-- View: health_summary - สรุปข้อมูลสุขภาพล่าสุด
CREATE VIEW `health_summary` AS
SELECT 
    u.user_id,
    u.username,
    p.first_name,
    p.last_name,
    p.gender,
    YEAR(CURDATE()) - YEAR(p.date_of_birth) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(p.date_of_birth, '%m%d')) AS age,
    p.height_cm,
    p.weight_kg,
    p.bmi,
    p.blood_group,
    CASE 
        WHEN p.bmi < 18.5 THEN 'Underweight'
        WHEN p.bmi BETWEEN 18.5 AND 24.9 THEN 'Normal'
        WHEN p.bmi BETWEEN 25 AND 29.9 THEN 'Overweight'
        ELSE 'Obese'
    END AS bmi_category,
    -- ข้อมูลสุขภาพล่าสุด
    hm.measurement_date AS last_checkup,
    hm.systolic_bp,
    hm.diastolic_bp,
    hm.heart_rate,
    hm.blood_sugar_mg,
    hm.cholesterol_total,
    hm.hba1c,
    -- พฤติกรรมล่าสุด
    hb.smoking_status,
    hb.exercise_frequency,
    hb.sleep_hours_per_night,
    hb.stress_level
FROM users u
LEFT JOIN user_profiles p ON u.user_id = p.user_id
LEFT JOIN (
    SELECT user_id, 
           measurement_date, systolic_bp, diastolic_bp, heart_rate, 
           blood_sugar_mg, cholesterol_total, hba1c,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY measurement_date DESC) as rn
    FROM health_metrics
) hm ON u.user_id = hm.user_id AND hm.rn = 1
LEFT JOIN (
    SELECT user_id, 
           smoking_status, exercise_frequency, sleep_hours_per_night, stress_level,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY record_date DESC) as rn
    FROM health_behaviors
) hb ON u.user_id = hb.user_id AND hb.rn = 1
WHERE u.is_active = 1;

-- ===============================
-- ⚙️ Stored Procedures
-- ===============================

DELIMITER //

-- Stored Procedure: CalculateBMI
CREATE PROCEDURE CalculateBMI(
    IN p_user_id INT,
    IN p_height_cm DECIMAL(5,2),
    IN p_weight_kg DECIMAL(5,2),
    OUT p_bmi DECIMAL(5,2),
    OUT p_category VARCHAR(20)
)
BEGIN
    DECLARE v_bmi DECIMAL(5,2);
    
    -- คำนวณ BMI
    IF p_height_cm > 0 THEN
        SET v_bmi = ROUND(p_weight_kg / POWER(p_height_cm/100, 2), 2);
        SET p_bmi = v_bmi;
        
        -- จัดหมวดหมู่ BMI
        CASE
            WHEN v_bmi < 18.5 THEN SET p_category = 'Underweight';
            WHEN v_bmi BETWEEN 18.5 AND 24.9 THEN SET p_category = 'Normal';
            WHEN v_bmi BETWEEN 25 AND 29.9 THEN SET p_category = 'Overweight';
            ELSE SET p_category = 'Obese';
        END CASE;
    ELSE
        SET p_bmi = NULL;
        SET p_category = 'Invalid';
    END IF;
END //

-- Stored Procedure: GetHealthRiskAssessment
CREATE PROCEDURE GetHealthRiskAssessment(
    IN p_user_id INT,
    OUT p_cardiovascular_risk VARCHAR(20),
    OUT p_diabetes_risk VARCHAR(20),
    OUT p_recommendations TEXT
)
BEGIN
    DECLARE v_age INT;
    DECLARE v_gender ENUM('male','female','other');
    DECLARE v_bmi DECIMAL(5,2);
    DECLARE v_systolic_bp INT;
    DECLARE v_smoking_status ENUM('never','former','current');
    DECLARE v_exercise_frequency ENUM('never','rarely','1-2_times','3-4_times','daily');
    DECLARE v_cholesterol_total DECIMAL(5,2);
    DECLARE v_blood_sugar DECIMAL(5,2);
    
    -- ดึงข้อมูลผู้ใช้
    SELECT 
        YEAR(CURDATE()) - YEAR(p.date_of_birth) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(p.date_of_birth, '%m%d')),
        p.gender,
        p.bmi
    INTO v_age, v_gender, v_bmi
    FROM user_profiles p
    WHERE p.user_id = p_user_id;
    
    -- ดึงข้อมูลสุขภาพล่าสุด
    SELECT systolic_bp, cholesterol_total, blood_sugar_mg
    INTO v_systolic_bp, v_cholesterol_total, v_blood_sugar
    FROM health_metrics 
    WHERE user_id = p_user_id 
    ORDER BY measurement_date DESC 
    LIMIT 1;
    
    -- ดึงข้อมูลพฤติกรรมล่าสุด
    SELECT smoking_status, exercise_frequency
    INTO v_smoking_status, v_exercise_frequency
    FROM health_behaviors 
    WHERE user_id = p_user_id 
    ORDER BY record_date DESC 
    LIMIT 1;
    
    -- ประเมินความเสี่ยงโรคหัวใจ
    IF (v_age > 45 AND v_gender = 'male') OR (v_age > 55 AND v_gender = 'female') OR
       v_systolic_bp > 140 OR v_cholesterol_total > 240 OR v_smoking_status = 'current' OR
       v_bmi > 30 THEN
        SET p_cardiovascular_risk = 'high';
    ELSEIF v_age > 35 OR v_systolic_bp > 120 OR v_cholesterol_total > 200 OR v_bmi > 25 THEN
        SET p_cardiovascular_risk = 'moderate';
    ELSE
        SET p_cardiovascular_risk = 'low';
    END IF;
    
    -- ประเมินความเสี่ยงเบาหวาน
    IF v_blood_sugar > 125 OR v_bmi > 30 OR 
       (v_age > 45 AND v_exercise_frequency IN ('never', 'rarely')) THEN
        SET p_diabetes_risk = 'high';
    ELSEIF v_blood_sugar > 100 OR v_bmi > 25 OR v_age > 35 THEN
        SET p_diabetes_risk = 'moderate';
    ELSE
        SET p_diabetes_risk = 'low';
    END IF;
    
    -- สร้างคำแนะนำ
    SET p_recommendations = CONCAT(
        'Cardiovascular Risk: ', p_cardiovascular_risk, '. ',
        'Diabetes Risk: ', p_diabetes_risk, '. ',
        CASE 
            WHEN p_cardiovascular_risk = 'high' OR p_diabetes_risk = 'high' THEN
                'แนะนำให้ปรึกษาแพทย์เพื่อการตรวจสอบเพิ่มเติม '
            ELSE ''
        END,
        CASE 
            WHEN v_bmi > 25 THEN 'ควรลดน้ำหนัก '
            ELSE ''
        END,
        CASE 
            WHEN v_exercise_frequency IN ('never', 'rarely') THEN 'ควรออกกำลังกายสม่ำเสมอ '
            ELSE ''
        END,
        CASE 
            WHEN v_smoking_status = 'current' THEN 'ควรเลิกสูบบุหรี่ '
            ELSE ''
        END
    );
END //

DELIMITER ;

-- ===============================
-- 📝 ข้อมูลตัวอย่าง (Sample Data)
-- ===============================

-- ค่ามาตรฐานทางการแพทย์
INSERT INTO `reference_values` (`metric_type`, `gender`, `age_min`, `age_max`, `normal_min`, `normal_max`, `unit`, `description`) VALUES
('systolic_bp', 'both', 18, 65, 90, 120, 'mmHg', 'ความดันโลหิตบน'),
('diastolic_bp', 'both', 18, 65, 60, 80, 'mmHg', 'ความดันโลหิตล่าง'),
('heart_rate', 'both', 18, 65, 60, 100, 'bpm', 'อัตราการเต้นหัวใจ'),
('blood_sugar_fasting', 'both', 18, 65, 70, 100, 'mg/dL', 'น้ำตาลในเลือด (ขณะอด)'),
('cholesterol_total', 'both', 18, 65, 0, 200, 'mg/dL', 'คอเลสเตอรอลรวม'),
('cholesterol_hdl', 'male', 18, 65, 40, 60, 'mg/dL', 'HDL ชาย'),
('cholesterol_hdl', 'female', 18, 65, 50, 60, 'mg/dL', 'HDL หญิง'),
('cholesterol_ldl', 'both', 18, 65, 0, 100, 'mg/dL', 'LDL'),
('triglycerides', 'both', 18, 65, 0, 150, 'mg/dL', 'ไตรกลีเซอไรด์'),
('hba1c', 'both', 18, 65, 4.0, 5.6, '%', 'HbA1c'),
('bmi', 'both', 18, 65, 18.5, 24.9, 'kg/m²', 'ดัชนีมวลกาย');

-- ข้อมูลผู้ใช้ตัวอย่าง (รหัสผ่าน: "password123" แฮชด้วย bcrypt)
INSERT INTO `users` (`username`, `email`, `password_hash`, `role`) VALUES
('admin', 'admin@health-app.com', '$2b$10$rQY8LlMZGkGqZqZJQ8/8HuOvKkz3QG8QJ.WKz7Qk5DvXNOGjGjBV.', 'admin'),
('john_doe', 'john@example.com', '$2b$10$rQY8LlMZGkGqZqZJQ8/8HuOvKkz3QG8QJ.WKz7Qk5DvXNOGjGjBV.', 'user'),
('jane_smith', 'jane@example.com', '$2b$10$rQY8LlMZGkGqZqZJQ8/8HuOvKkz3QG8QJ.WKz7Qk5DvXNOGjGjBV.', 'user');

COMMIT;
