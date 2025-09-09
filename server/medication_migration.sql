-- Medications table for tracking individual medications
CREATE TABLE
IF NOT EXISTS medications
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    medication_name VARCHAR
(255) NOT NULL,
    dosage VARCHAR
(100) NOT NULL,
    frequency VARCHAR
(100) NOT NULL,
    time_schedule VARCHAR
(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    condition VARCHAR
(100),
    reminder_enabled BOOLEAN DEFAULT true,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE
);

-- Medication logs table for tracking when medications are taken
CREATE TABLE
IF NOT EXISTS medication_logs
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    medication_id INTEGER NOT NULL,
    taken_time TIMESTAMP NOT NULL,
    status VARCHAR
(50) DEFAULT 'taken',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY
(user_id) REFERENCES users
(user_id) ON
DELETE CASCADE,
    FOREIGN KEY (medication_id)
REFERENCES medications
(id) ON
DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX
IF NOT EXISTS idx_medications_user_id ON medications
(user_id);
CREATE INDEX
IF NOT EXISTS idx_medications_is_active ON medications
(is_active);
CREATE INDEX
IF NOT EXISTS idx_medication_logs_user_id ON medication_logs
(user_id);
CREATE INDEX
IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs
(medication_id);
CREATE INDEX
IF NOT EXISTS idx_medication_logs_taken_time ON medication_logs
(taken_time);
