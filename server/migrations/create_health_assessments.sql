-- Health Assessment Table Migration
-- This table stores comprehensive lifestyle and health assessment data

CREATE TABLE IF NOT EXISTS health_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- Smoking Assessment
  smoking_status ENUM('never', 'current', 'former', 'occasional') DEFAULT 'never',
  smoking_years INT NULL,
  smoking_pack_per_day DECIMAL(3,1) NULL,
  smoking_quit_attempts INT NULL,
  
  -- Alcohol Assessment  
  alcohol_frequency ENUM('never', 'rarely', 'monthly', 'weekly', 'few_times_week', 'daily') DEFAULT 'never',
  alcohol_type VARCHAR(50) NULL,
  alcohol_amount VARCHAR(50) NULL,
  alcohol_binge_frequency ENUM('never', 'rarely', 'monthly', 'weekly', 'frequent') DEFAULT 'never',
  
  -- Exercise Assessment
  exercise_frequency ENUM('never', 'rarely', '1-2_week', '3-4_week', '5+_week', 'daily') DEFAULT 'never',
  exercise_type VARCHAR(100) NULL,
  exercise_duration INT NULL, -- minutes
  exercise_intensity ENUM('light', 'moderate', 'vigorous', 'intense') DEFAULT 'light',
  
  -- Sleep Assessment
  sleep_hours DECIMAL(3,1) NULL,
  sleep_quality ENUM('excellent', 'good', 'fair', 'poor', 'very_poor') DEFAULT 'good',
  sleep_problems JSON NULL, -- Array of sleep problems
  
  -- Stress & Mental Health
  stress_level ENUM('very_low', 'low', 'moderate', 'high', 'very_high') DEFAULT 'low',
  stress_sources JSON NULL, -- Array of stress sources
  coping_mechanisms JSON NULL, -- Array of coping strategies
  mood_changes ENUM('no', 'mild', 'moderate', 'severe') DEFAULT 'no',
  anxiety_frequency ENUM('never', 'rarely', 'sometimes', 'often', 'always') DEFAULT 'rarely',
  social_activities ENUM('very_active', 'active', 'sometimes', 'rarely', 'never') DEFAULT 'sometimes',
  
  -- Diet & Nutrition
  diet_type VARCHAR(50) DEFAULT 'mixed',
  vegetable_servings INT NULL,
  fruit_servings INT NULL,
  water_intake INT NULL, -- glasses per day
  fast_food_frequency ENUM('never', 'rarely', 'weekly', 'few_times_week', 'daily') DEFAULT 'rarely',
  snack_frequency ENUM('never', 'rarely', 'sometimes', 'often', 'always') DEFAULT 'sometimes',
  caffeine_intake ENUM('none', 'low', 'moderate', 'high') DEFAULT 'moderate',
  
  -- Allergies & Medical History
  food_allergies TEXT NULL,
  drug_allergies TEXT NULL,
  environmental_allergies TEXT NULL,
  current_medications TEXT NULL,
  supplement_usage TEXT NULL,
  medical_conditions TEXT NULL,
  family_history TEXT NULL,
  
  -- Work & Environment
  work_environment VARCHAR(100) DEFAULT 'office',
  work_stress_level ENUM('very_low', 'low', 'moderate', 'high', 'very_high') DEFAULT 'moderate',
  screen_time_hours INT NULL,
  
  -- Health Goals & Status
  health_goals JSON NULL, -- Array of health goals
  recent_health_changes TEXT NULL,
  vaccination_status ENUM('up_to_date', 'partially', 'none', 'unknown') DEFAULT 'up_to_date',
  current_symptoms JSON NULL, -- Array of current symptoms
  chronic_symptoms JSON NULL, -- Array of chronic symptoms
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_assessment (user_id, created_at),
  INDEX idx_smoking_status (smoking_status),
  INDEX idx_exercise_frequency (exercise_frequency),
  INDEX idx_created_at (created_at)
);

-- Add some indexes for better query performance
CREATE INDEX idx_health_assessments_user_latest ON health_assessments (user_id, created_at DESC);
CREATE INDEX idx_health_assessments_lifestyle ON health_assessments (smoking_status, alcohol_frequency, exercise_frequency);

-- Sample comment for documentation
ALTER TABLE health_assessments COMMENT = 'Comprehensive health and lifestyle assessment data for AI analysis and health recommendations';
