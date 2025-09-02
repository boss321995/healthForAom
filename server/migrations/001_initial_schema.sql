-- Database Migration Script for Health Management System
-- สำหรับ Production Deployment บน Render

-- Create database (if using MySQL/PostgreSQL)
-- CREATE DATABASE IF NOT EXISTS health_management;
-- USE health_management;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- 2. User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    blood_group VARCHAR(5),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    phone VARCHAR(20),
    emergency_contact VARCHAR(100),
    medical_conditions TEXT,
    medications TEXT,
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- 3. Health metrics table (ตาราง Enhanced ที่มีฟิลด์ lab tests เพิ่มเติม)
CREATE TABLE IF NOT EXISTS health_metrics (
    metric_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Basic vitals
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    bmi DECIMAL(4,2),
    body_fat_percentage DECIMAL(4,2),
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate_bpm INT,
    body_temperature_celsius DECIMAL(4,2),
    
    -- Blood tests (ฟิลด์ใหม่ที่เพิ่ม)
    blood_sugar_mg DECIMAL(6,2),
    uric_acid DECIMAL(4,2),
    alt DECIMAL(6,2),
    ast DECIMAL(6,2),
    hemoglobin DECIMAL(4,2),
    hematocrit DECIMAL(4,2),
    iron DECIMAL(6,2),
    tibc DECIMAL(6,2),
    
    -- Additional metrics
    oxygen_saturation DECIMAL(4,2),
    steps_count INT,
    sleep_hours DECIMAL(4,2),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
    mood_score INT CHECK (mood_score BETWEEN 1 AND 10),
    
    -- Metadata
    measurement_date DATE NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, measurement_date),
    INDEX idx_recorded_at (recorded_at)
);

-- 4. Health behavior/lifestyle table
CREATE TABLE IF NOT EXISTS health_behavior (
    behavior_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Exercise and activity
    exercise_minutes INT DEFAULT 0,
    exercise_type VARCHAR(100),
    activity_level ENUM('sedentary', 'light', 'moderate', 'vigorous') DEFAULT 'sedentary',
    
    -- Diet and nutrition
    calories_consumed INT,
    water_intake_ml INT DEFAULT 0,
    alcohol_units DECIMAL(4,2) DEFAULT 0,
    smoking_cigarettes INT DEFAULT 0,
    
    -- Sleep
    sleep_hours DECIMAL(4,2),
    sleep_quality ENUM('poor', 'fair', 'good', 'excellent'),
    
    -- Mental health
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    mood ENUM('very_bad', 'bad', 'neutral', 'good', 'very_good'),
    
    -- Additional lifestyle factors
    screen_time_hours DECIMAL(4,2),
    meditation_minutes INT DEFAULT 0,
    social_interaction_hours DECIMAL(4,2),
    
    -- Metadata
    behavior_date DATE NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_behavior_date (user_id, behavior_date),
    INDEX idx_recorded_at (recorded_at)
);

-- 5. Health assessments table (for AI analysis results)
CREATE TABLE IF NOT EXISTS health_assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_type ENUM('overall', 'cardiovascular', 'metabolic', 'mental', 'lifestyle') NOT NULL,
    
    -- Assessment scores
    overall_score DECIMAL(4,2),
    risk_level ENUM('low', 'moderate', 'high', 'critical'),
    
    -- AI analysis results
    analysis_summary TEXT,
    recommendations TEXT,
    risk_factors TEXT,
    positive_indicators TEXT,
    
    -- Metadata
    assessment_date DATE NOT NULL,
    ai_model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_assessment (user_id, assessment_date),
    INDEX idx_risk_level (risk_level)
);

-- 6. Health goals table
CREATE TABLE IF NOT EXISTS health_goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    goal_type ENUM('weight_loss', 'weight_gain', 'exercise', 'diet', 'sleep', 'stress', 'general') NOT NULL,
    goal_title VARCHAR(200) NOT NULL,
    goal_description TEXT,
    
    -- Target values
    target_value DECIMAL(10,2),
    target_unit VARCHAR(20),
    current_value DECIMAL(10,2),
    
    -- Timeline
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    completed_date DATE NULL,
    
    -- Status
    status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_goals (user_id, status),
    INDEX idx_target_date (target_date)
);

-- 7. System health monitoring table (for Render deployment monitoring)
CREATE TABLE IF NOT EXISTS system_health (
    health_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Server metrics
    server_status ENUM('healthy', 'warning', 'critical') DEFAULT 'healthy',
    response_time_ms INT,
    memory_usage_mb DECIMAL(10,2),
    cpu_usage_percentage DECIMAL(5,2),
    
    -- Database metrics
    db_connection_status ENUM('connected', 'disconnected', 'slow') DEFAULT 'connected',
    db_response_time_ms INT,
    active_connections INT,
    
    -- Keep-alive status
    last_keep_alive TIMESTAMP,
    sleep_mode_count INT DEFAULT 0,
    wake_up_count INT DEFAULT 0,
    
    -- Error tracking
    error_count_last_hour INT DEFAULT 0,
    last_error_message TEXT,
    
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_checked_at (checked_at),
    INDEX idx_server_status (server_status)
);

-- Insert initial system health record
INSERT INTO system_health (server_status, db_connection_status) 
VALUES ('healthy', 'connected')
ON DUPLICATE KEY UPDATE 
    server_status = 'healthy',
    db_connection_status = 'connected',
    checked_at = CURRENT_TIMESTAMP;

-- Create view for latest health metrics per user
CREATE OR REPLACE VIEW latest_health_metrics AS
SELECT hm.*
FROM health_metrics hm
INNER JOIN (
    SELECT user_id, MAX(measurement_date) as latest_date
    FROM health_metrics
    GROUP BY user_id
) latest ON hm.user_id = latest.user_id AND hm.measurement_date = latest.latest_date;

-- Create view for user dashboard summary
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    u.user_id,
    u.username,
    up.full_name,
    up.age,
    lhm.weight_kg,
    lhm.bmi,
    lhm.blood_pressure_systolic,
    lhm.blood_pressure_diastolic,
    lhm.heart_rate_bpm,
    lhm.blood_sugar_mg,
    lhm.measurement_date as last_measurement_date,
    ha.overall_score as last_assessment_score,
    ha.risk_level as current_risk_level
FROM users u
LEFT JOIN user_profiles up ON u.user_id = up.user_id
LEFT JOIN latest_health_metrics lhm ON u.user_id = lhm.user_id
LEFT JOIN (
    SELECT user_id, overall_score, risk_level,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY assessment_date DESC) as rn
    FROM health_assessments
) ha ON u.user_id = ha.user_id AND ha.rn = 1;

-- Performance indexes for production
CREATE INDEX idx_health_metrics_composite ON health_metrics(user_id, measurement_date DESC, recorded_at DESC);
CREATE INDEX idx_health_behavior_composite ON health_behavior(user_id, behavior_date DESC, recorded_at DESC);
CREATE INDEX idx_assessments_composite ON health_assessments(user_id, assessment_date DESC, risk_level);

COMMIT;
