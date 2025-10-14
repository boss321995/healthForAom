-- healthForAom PostgreSQL schema reference
-- ใช้สำหรับตรวจสอบ/สร้างตารางบนฐานข้อมูล Production ที่เป็น PostgreSQL
-- หมายเหตุ: ปรับให้ตรงกับที่ server/index.js ใช้งานจริง (รวมตารางเสริม)

BEGIN;

-- 1. users ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. user_profiles ----------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id              SERIAL PRIMARY KEY,
    user_id                 INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name               VARCHAR(100),
    date_of_birth           DATE,
    gender                  VARCHAR(20),
    blood_group             VARCHAR(5),
    height_cm               DECIMAL(5,2),
    weight_kg               DECIMAL(5,2),
    phone                   VARCHAR(20),
    emergency_contact       VARCHAR(100),
    emergency_phone         VARCHAR(20),
    medical_conditions      TEXT,
    medications             TEXT,
    allergies               TEXT,
    allow_research_data     BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 3. health_metrics ---------------------------------------------------
CREATE TABLE IF NOT EXISTS health_metrics (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    measurement_date  DATE NOT NULL,
    weight_kg         DECIMAL(5,2),
    systolic_bp       INTEGER,
    diastolic_bp      INTEGER,
    heart_rate        INTEGER,
    blood_sugar       DECIMAL(5,2),
    body_temperature  DECIMAL(4,2),
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, measurement_date DESC);

-- 4. health_behaviors -------------------------------------------------
CREATE TABLE IF NOT EXISTS health_behaviors (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    behavior_date     DATE NOT NULL,
    sleep_hours       DECIMAL(3,1),
    exercise_minutes  INTEGER,
    water_glasses     INTEGER,
    steps             INTEGER,
    stress_level      INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    mood              INTEGER CHECK (mood BETWEEN 1 AND 10),
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_behaviors_user_date ON health_behaviors(user_id, behavior_date DESC);

-- 5. health_assessments -----------------------------------------------
CREATE TABLE IF NOT EXISTS health_assessments (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assessment_date  DATE NOT NULL,
    overall_health   INTEGER CHECK (overall_health BETWEEN 1 AND 10),
    energy_level     INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    appetite         INTEGER CHECK (appetite BETWEEN 1 AND 10),
    pain_level       INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    concerns         TEXT,
    goals            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_assessments_user_date ON health_assessments(user_id, assessment_date DESC);

-- 6. health_summary ---------------------------------------------------
CREATE TABLE IF NOT EXISTS health_summary (
    id                         SERIAL PRIMARY KEY,
    user_id                    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    overall_health_score       INTEGER DEFAULT 0,
    bmi                        DECIMAL(5,2),
    bmi_category               VARCHAR(50),
    blood_pressure_status      VARCHAR(50),
    diabetes_risk              VARCHAR(50),
    cardiovascular_risk        VARCHAR(50),
    last_checkup               DATE,
    next_recommended_checkup   DATE,
    health_goals               TEXT,
    medications                TEXT,
    allergies                  TEXT,
    medical_conditions         TEXT,
    lifestyle_recommendations  TEXT,
    emergency_notes            TEXT,
    created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_summary_user ON health_summary(user_id);

-- 7. activity_logs ----------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action      VARCHAR(100) NOT NULL,
    details     JSONB,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- 8. medications ------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_name   VARCHAR(255) NOT NULL,
    dosage            VARCHAR(100) NOT NULL,
    frequency         VARCHAR(100) NOT NULL,
    time_schedule     VARCHAR(255) NOT NULL,
    start_date        DATE,
    end_date          DATE,
    condition         VARCHAR(100),
    reminder_enabled  BOOLEAN DEFAULT TRUE,
    notes             TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);

-- 9. medication_logs --------------------------------------------------
CREATE TABLE IF NOT EXISTS medication_logs (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id  INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    taken_time     TIMESTAMP NOT NULL,
    status         VARCHAR(50) DEFAULT 'taken',
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);

-- 10. medical_images --------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_images (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename          VARCHAR(255) NOT NULL,
    file_type         VARCHAR(50)  NOT NULL,
    image_type        VARCHAR(50)  NOT NULL,
    file_size         INTEGER,
    analysis_result   JSONB,
    confidence_score  DECIMAL(5,2),
    risk_level        VARCHAR(20),
    recommendations   TEXT,
    ai_notes          TEXT,
    uploaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medical_images_user_id ON medical_images(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_images_image_type ON medical_images(image_type);
CREATE INDEX IF NOT EXISTS idx_medical_images_risk ON medical_images(risk_level);

COMMIT;
