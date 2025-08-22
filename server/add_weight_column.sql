-- Add weight_kg column to health_metrics and user_profiles tables
-- This script adds weight columns to track weight changes for BMI calculation

USE health_management;

-- Add weight_kg column to health_metrics table
ALTER TABLE health_metrics 
ADD weight_kg DECIMAL(5,2) NULL 
COMMENT 'น้ำหนักในหน่วยกิโลกรัม สำหรับคำนวณ BMI';

-- Add weight_kg column to user_profiles table (if not exists)
ALTER TABLE user_profiles 
ADD weight_kg DECIMAL(5,2) NULL 
COMMENT 'น้ำหนักปัจจุบันในหน่วยกิโลกรัม สำหรับคำนวณ BMI';

-- Show updated table structures
DESCRIBE health_metrics;
DESCRIBE user_profiles;

-- Sample query to verify the new columns
SELECT 
    metric_id,
    user_id,
    measurement_date,
    weight_kg,
    body_fat_percentage,
    muscle_mass_kg,
    notes
FROM health_metrics 
WHERE weight_kg IS NOT NULL
ORDER BY measurement_date DESC
LIMIT 5;

-- Sample query for user profiles
SELECT 
    profile_id,
    user_id,
    first_name,
    last_name,
    height_cm,
    weight_kg,
    blood_group
FROM user_profiles 
WHERE weight_kg IS NOT NULL
LIMIT 5;
