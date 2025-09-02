-- PostgreSQL Migration Script for Render Deployment
-- สำหรับ health-management-db บน Render

-- 1. Users table
CREATE TABLE
IF NOT EXISTS users
(
    user_id SERIAL PRIMARY KEY,
    username VARCHAR
(50) UNIQUE NOT NULL,
    email VARCHAR
(100) UNIQUE NOT NULL,
    password_hash VARCHAR
(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User profiles table
CREATE TABLE
IF NOT EXISTS user_profiles
(
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    full_name VARCHAR
(100),
    date_of_birth DATE,
    gender VARCHAR
(10) CHECK
(gender IN
('male', 'female', 'other')),
    blood_group VARCHAR
(5),
    height_cm DECIMAL
(5,2),
    weight_kg DECIMAL
(5,2),
    phone VARCHAR
(20),
    emergency_contact VARCHAR
(100),
    medical_conditions TEXT,
    medications TEXT,
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE
);

-- 3. Health metrics table
CREATE TABLE
IF NOT EXISTS health_metrics
(
    metric_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Basic vitals
    weight_kg DECIMAL
(5,2),
    height_cm DECIMAL
(5,2),
    bmi DECIMAL
(4,2),
    body_fat_percentage DECIMAL
(4,2),
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate_bpm INTEGER,
    body_temperature_celsius DECIMAL
(4,2),
    
    -- Blood tests
    blood_sugar_mg DECIMAL
(6,2),
    uric_acid DECIMAL
(4,2),
    alt DECIMAL
(6,2),
    ast DECIMAL
(6,2),
    hemoglobin DECIMAL
(4,2),
    hematocrit DECIMAL
(4,2),
    iron DECIMAL
(6,2),
    tibc DECIMAL
(6,2),
    
    -- Additional metrics
    oxygen_saturation DECIMAL
(4,2),
    steps_count INTEGER,
    sleep_hours DECIMAL
(4,2),
    stress_level INTEGER CHECK
(stress_level BETWEEN 1 AND 10),
    energy_level INTEGER CHECK
(energy_level BETWEEN 1 AND 10),
    mood_score INTEGER CHECK
(mood_score BETWEEN 1 AND 10),
    
    -- Metadata
    measurement_date DATE NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE
);

-- 4. Health behavior/lifestyle table
CREATE TABLE
IF NOT EXISTS health_behavior
(
    behavior_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Exercise and activity
    exercise_minutes INTEGER DEFAULT 0,
    exercise_type VARCHAR
(100),
    activity_level VARCHAR
(20) CHECK
(activity_level IN
('sedentary', 'light', 'moderate', 'vigorous')) DEFAULT 'sedentary',
    
    -- Diet and nutrition
    calories_consumed INTEGER,
    water_intake_ml INTEGER DEFAULT 0,
    alcohol_units DECIMAL
(4,2) DEFAULT 0,
    smoking_cigarettes INTEGER DEFAULT 0,
    
    -- Sleep
    sleep_hours DECIMAL
(4,2),
    sleep_quality VARCHAR
(20) CHECK
(sleep_quality IN
('poor', 'fair', 'good', 'excellent')),
    
    -- Mental health
    stress_level INTEGER CHECK
(stress_level BETWEEN 1 AND 10),
    mood VARCHAR
(20) CHECK
(mood IN
('very_bad', 'bad', 'neutral', 'good', 'very_good')),
    
    -- Additional lifestyle factors
    screen_time_hours DECIMAL
(4,2),
    meditation_minutes INTEGER DEFAULT 0,
    social_interaction_hours DECIMAL
(4,2),
    
    -- Metadata
    behavior_date DATE NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE
);

-- 5. Health assessments table
CREATE TABLE
IF NOT EXISTS health_assessments
(
    assessment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    assessment_type VARCHAR
(50) CHECK
(assessment_type IN
('overall', 'cardiovascular', 'metabolic', 'mental', 'lifestyle')) NOT NULL,
    
    -- Assessment scores
    overall_score DECIMAL
(4,2),
    risk_level VARCHAR
(20) CHECK
(risk_level IN
('low', 'moderate', 'high', 'critical')),
    
    -- AI analysis results
    analysis_summary TEXT,
    recommendations TEXT,
    risk_factors TEXT,
    positive_indicators TEXT,
    
    -- Metadata
    assessment_date DATE NOT NULL,
    ai_model_version VARCHAR
(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX
IF NOT EXISTS idx_users_username ON users
(username);
CREATE INDEX
IF NOT EXISTS idx_users_email ON users
(email);
CREATE INDEX
IF NOT EXISTS idx_health_metrics_user_date ON health_metrics
(user_id, measurement_date DESC);
CREATE INDEX
IF NOT EXISTS idx_health_behavior_user_date ON health_behavior
(user_id, behavior_date DESC);
CREATE INDEX
IF NOT EXISTS idx_health_assessments_user_date ON health_assessments
(user_id, assessment_date DESC);

-- Insert success message
INSERT INTO users
    (username, email, password_hash)
VALUES
    ('system', 'system@health.app', 'system')
ON CONFLICT
(username) DO NOTHING;

SELECT 'Database migration completed successfully!' as message;
