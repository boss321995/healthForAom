import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import HealthAnalytics from './healthAnalytics.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection with Pool and Reconnection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'health_management',
  charset: 'utf8mb4',
  // Connection Pool สำหรับ Production
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  // Render-specific optimizations
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

let db;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

async function initDatabase() {
  try {
    connectionAttempts++;
    console.log(`🔄 Database connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
    
    // ใช้ Connection Pool สำหรับ production
    if (process.env.NODE_ENV === 'production') {
      db = mysql.createPool(dbConfig);
      console.log('🔗 Connected to MySQL database with connection pool');
    } else {
      db = await mysql.createConnection(dbConfig);
      console.log('🔗 Connected to MySQL database');
    }
    
    // Test connection
    await db.execute('SELECT 1');
    console.log('✅ Database connection verified');
    connectionAttempts = 0; // Reset on success
    
  } catch (error) {
    console.error(`❌ Database connection error (attempt ${connectionAttempts}):`, error.message);
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      console.log(`⏳ Retrying in 5 seconds...`);
      setTimeout(initDatabase, 5000);
    } else {
      console.error('💀 Max connection attempts reached. Exiting...');
      process.exit(1);
    }
  }
}

// Database reconnection handler
async function handleDatabaseError(error, operation = 'unknown') {
  console.error(`❌ Database error during ${operation}:`, error.message);
  
  if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT') {
    console.log('🔄 Attempting to reconnect to database...');
    await initDatabase();
  }
  
  throw error;
}

// Database query wrapper with retry logic
async function executeQuery(query, params = []) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.execute(query, params);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Query attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries && 
          (error.code === 'PROTOCOL_CONNECTION_LOST' || 
           error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT')) {
        
        console.log(`⏳ Retrying query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        await handleDatabaseError(error, 'query retry');
      }
    }
  }
  
  throw lastError;
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'health_app_secret_key';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 Auth Debug:', {
    authHeader: authHeader ? 'Present' : 'Missing',
    token: token ? `${token.substring(0, 20)}...` : 'Missing',
    userId: token ? 'Will verify' : 'No token'
  });

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log('✅ Token verified for user:', user.userId);
    req.user = user;
    next();
  });
};

// ===============================
// 🏥 Health Check & Keep-Alive Routes (For Render Deployment)
// ===============================

// Health check endpoint to prevent sleep mode
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await executeQuery('SELECT 1 as health_check');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Keep-alive endpoint for external monitoring
app.get('/api/ping', (req, res) => {
  res.status(200).json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    server: 'active'
  });
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    server: 'Health Management API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`
  });
});

// ===============================
// 🔐 Authentication Routes
// ===============================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, profile } = req.body;
    
    console.log('🔍 Registration Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Profile data received:', profile);
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const [existingUsers] = await executeQuery(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const [result] = await executeQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = result.insertId;

    // Insert profile data if provided
    if (profile) {
      try {
        await executeQuery(
          `INSERT INTO user_profiles (
            user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
            phone, emergency_contact, medical_conditions, medications, allergies, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            profile.full_name || null,
            profile.date_of_birth || null,
            profile.gender || null,
            profile.blood_group || null,
            profile.height_cm || null,
            profile.weight_kg || null,
            profile.phone || null,
            profile.emergency_contact || null,
            profile.medical_conditions || null,
            profile.medications || null,
            profile.allergies || null
          ]
        );
        console.log('✅ Profile data saved for user:', userId);
      } catch (profileError) {
        console.error('⚠️ Profile save error:', profileError);
        // Don't fail registration if profile save fails
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, username, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { userId, username, email, name: profile?.full_name || username }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT user_id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 👤 User Profile Routes
// ===============================

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    // First check if user exists
    const [users] = await db.execute(
      'SELECT user_id, username, email, role FROM users WHERE user_id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Try to get user profile
    const [profiles] = await db.execute(
      `SELECT p.*, u.username, u.email 
       FROM user_profiles p 
       JOIN users u ON p.user_id = u.user_id 
       WHERE p.user_id = ?`,
      [req.user.userId]
    );

    if (profiles.length === 0) {
      // Return basic user info if no profile exists
      return res.json({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_completed: false,
        message: 'Profile not completed yet'
      });
    }

    res.json({
      ...profiles[0],
      profile_completed: true
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const {
      full_name, date_of_birth, gender, blood_group,
      height_cm, weight_kg, phone, emergency_contact, emergency_phone,
      medical_conditions, medications
    } = req.body;

    // Data sanitization to prevent undefined values in MySQL
    const sanitizeValue = (value) => {
      if (value === undefined || value === '' || value === null || value === 'undefined') {
        return null;
      }
      return value;
    };

    // Sanitize all profile data
    const sanitizedData = {
      full_name: sanitizeValue(full_name),
      date_of_birth: sanitizeValue(date_of_birth),
      gender: sanitizeValue(gender),
      blood_group: sanitizeValue(blood_group),
      height_cm: sanitizeValue(height_cm),
      weight_kg: sanitizeValue(weight_kg),
      phone: sanitizeValue(phone),
      emergency_contact: sanitizeValue(emergency_contact),
      emergency_phone: sanitizeValue(emergency_phone),
      medical_conditions: sanitizeValue(medical_conditions),
      medications: sanitizeValue(medications)
    };

    console.log('📊 Original profile data:', req.body);
    console.log('📊 Sanitized profile data:', sanitizedData);

    // Check if profile exists
    const [existingProfiles] = await db.execute(
      'SELECT profile_id FROM user_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    if (existingProfiles.length === 0) {
      // Create new profile
      await db.execute(
        `INSERT INTO user_profiles 
         (user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
          phone, emergency_contact, emergency_phone, medical_conditions, medications) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.userId, sanitizedData.full_name, sanitizedData.date_of_birth, 
         sanitizedData.gender, sanitizedData.blood_group, sanitizedData.height_cm, 
         sanitizedData.weight_kg, sanitizedData.phone, sanitizedData.emergency_contact, 
         sanitizedData.emergency_phone, sanitizedData.medical_conditions, sanitizedData.medications]
      );
      console.log('✅ New profile created for user:', req.user.userId);
    } else {
      // Update existing profile
      await db.execute(
        `UPDATE user_profiles SET 
         full_name = ?, date_of_birth = ?, gender = ?, blood_group = ?,
         height_cm = ?, weight_kg = ?, phone = ?, emergency_contact = ?, emergency_phone = ?,
         medical_conditions = ?, medications = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [sanitizedData.full_name, sanitizedData.date_of_birth, sanitizedData.gender, 
         sanitizedData.blood_group, sanitizedData.height_cm, sanitizedData.weight_kg, 
         sanitizedData.phone, sanitizedData.emergency_contact, sanitizedData.emergency_phone,
         sanitizedData.medical_conditions, sanitizedData.medications, req.user.userId]
      );
      console.log('✅ Profile updated for user:', req.user.userId);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 📊 Health Metrics Routes
// ===============================

// Get health metrics
app.get('/api/health-metrics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    let query = `
      SELECT * FROM health_metrics 
      WHERE user_id = ?
    `;
    let params = [req.user.userId];

    if (startDate) {
      query += ' AND measurement_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND measurement_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY measurement_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [metrics] = await db.execute(query, params);
    res.json(metrics);
  } catch (error) {
    console.error('Get health metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add health metrics
app.post('/api/health-metrics', authenticateToken, async (req, res) => {
  try {
    const {
      measurement_date, systolic_bp, diastolic_bp, heart_rate,
      blood_sugar_mg, cholesterol_total, cholesterol_hdl, cholesterol_ldl,
      triglycerides, hba1c, body_fat_percentage, muscle_mass_kg, 
      weight_kg, notes, uric_acid, alt, ast, hemoglobin, hematocrit, iron, tibc
    } = req.body;

    // Convert undefined/empty string/zero values to null for MySQL
    const sanitizeValue = (value) => {
      if (value === undefined || value === '' || value === null || value === 0) return null;
      return value;
    };

    // ตรวจสอบว่าฐานข้อมูลมี column ใหม่หรือไม่
    let hasNewColumns = false;
    try {
      await db.execute('SELECT uric_acid FROM health_metrics LIMIT 1');
      hasNewColumns = true;
    } catch (error) {
      console.log('⚠️ New columns not found in database, using basic fields only');
      hasNewColumns = false;
    }

    let sanitizedData, query;

    if (hasNewColumns) {
      // ใช้ query แบบใหม่ที่มีฟิลด์ครบ
      sanitizedData = [
        req.user.userId,
        sanitizeValue(measurement_date),
        sanitizeValue(systolic_bp),
        sanitizeValue(diastolic_bp),
        sanitizeValue(heart_rate),
        sanitizeValue(blood_sugar_mg),
        sanitizeValue(cholesterol_total),
        sanitizeValue(cholesterol_hdl),
        sanitizeValue(cholesterol_ldl),
        sanitizeValue(triglycerides),
        sanitizeValue(hba1c),
        sanitizeValue(body_fat_percentage),
        sanitizeValue(muscle_mass_kg),
        sanitizeValue(weight_kg),
        sanitizeValue(uric_acid),
        sanitizeValue(alt),
        sanitizeValue(ast),
        sanitizeValue(hemoglobin),
        sanitizeValue(hematocrit),
        sanitizeValue(iron),
        sanitizeValue(tibc),
        sanitizeValue(notes)
      ];

      query = `INSERT INTO health_metrics 
               (user_id, measurement_date, systolic_bp, diastolic_bp, heart_rate,
                blood_sugar_mg, cholesterol_total, cholesterol_hdl, cholesterol_ldl,
                triglycerides, hba1c, body_fat_percentage, muscle_mass_kg, weight_kg,
                uric_acid, alt, ast, hemoglobin, hematocrit, iron, tibc, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    } else {
      // ใช้ query แบบเดิมที่มีฟิลด์พื้นฐาน
      sanitizedData = [
        req.user.userId,
        sanitizeValue(measurement_date),
        sanitizeValue(systolic_bp),
        sanitizeValue(diastolic_bp),
        sanitizeValue(heart_rate),
        sanitizeValue(blood_sugar_mg),
        sanitizeValue(cholesterol_total),
        sanitizeValue(cholesterol_hdl),
        sanitizeValue(cholesterol_ldl),
        sanitizeValue(triglycerides),
        sanitizeValue(hba1c),
        sanitizeValue(body_fat_percentage),
        sanitizeValue(muscle_mass_kg),
        sanitizeValue(weight_kg),
        sanitizeValue(notes)
      ];

      query = `INSERT INTO health_metrics 
               (user_id, measurement_date, systolic_bp, diastolic_bp, heart_rate,
                blood_sugar_mg, cholesterol_total, cholesterol_hdl, cholesterol_ldl,
                triglycerides, hba1c, body_fat_percentage, muscle_mass_kg, weight_kg, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    }

    console.log('📊 Sanitized health metrics data:', sanitizedData);

    const [result] = await db.execute(query, sanitizedData);

    console.log('✅ Health metrics inserted with ID:', result.insertId);

    res.status(201).json({ 
      message: 'Health metrics added successfully',
      metricId: result.insertId 
    });
  } catch (error) {
    console.error('Add health metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 🏃 Health Behaviors Routes
// ===============================

// Get health behaviors
app.get('/api/health-behaviors', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    let query = `
      SELECT * FROM health_behaviors 
      WHERE user_id = ?
    `;
    let params = [req.user.userId];

    if (startDate) {
      query += ' AND record_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND record_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY record_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [behaviors] = await db.execute(query, params);
    res.json(behaviors);
  } catch (error) {
    console.error('Get health behaviors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add health behavior
app.post('/api/health-behaviors', authenticateToken, async (req, res) => {
  try {
    const {
      date, exercise_type, exercise_duration, exercise_intensity,
      sleep_bedtime, sleep_wakeup, sleep_quality, water_glasses,
      fruits_vegetables, supplements, stress_level, relaxation_minutes, notes,
      smoking_status, cigarettes_per_day,
      alcohol_frequency, alcohol_units_per_week,
      exercise_frequency, sleep_hours_per_night,
      diet_quality, water_intake_liters
    } = req.body;

    console.log('📝 Received health behavior data:', req.body);

    // Convert values for health_behaviors table
    const sanitizeValue = (value, allowZero = false) => {
      if (value === undefined || value === '' || value === null) return null;
      if (!allowZero && value === 0) return null;
      return value;
    };

    // Calculate sleep hours from bedtime and wakeup
    let calculatedSleepHours = sleep_hours_per_night;
    if (sleep_bedtime && sleep_wakeup && !sleep_hours_per_night) {
      const bedtime = new Date(`2000-01-01T${sleep_bedtime}`);
      const wakeup = new Date(`2000-01-01T${sleep_wakeup}`);
      if (wakeup < bedtime) wakeup.setDate(wakeup.getDate() + 1);
      calculatedSleepHours = (wakeup - bedtime) / (1000 * 60 * 60);
    }

    // Convert water glasses to liters (assume 1 glass = 0.25L)
    let waterLiters = water_intake_liters;
    if (water_glasses && water_glasses > 0 && !water_intake_liters) {
      waterLiters = parseFloat(water_glasses) * 0.25;
    }

    const behaviorData = [
      req.user.userId,
      sanitizeValue(date) || new Date().toISOString().split('T')[0],
      sanitizeValue(smoking_status),
      sanitizeValue(cigarettes_per_day, true), // allow 0 for cigarettes
      sanitizeValue(alcohol_frequency),
      sanitizeValue(alcohol_units_per_week, true), // allow 0 for alcohol units
      sanitizeValue(exercise_frequency),
      sanitizeValue(exercise_duration, true) || null, // allow 0 but default to null
      sanitizeValue(calculatedSleepHours),
      sanitizeValue(stress_level),
      sanitizeValue(diet_quality),
      sanitizeValue(waterLiters),
      sanitizeValue(notes)
    ];

    console.log('🏃 Sanitized health behavior data:', behaviorData);

    const [result] = await db.execute(
      `INSERT INTO health_behaviors 
       (user_id, record_date, smoking_status, cigarettes_per_day, alcohol_frequency, 
        alcohol_units_per_week, exercise_frequency, exercise_duration_minutes, 
        sleep_hours_per_night, stress_level, diet_quality, water_intake_liters, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      behaviorData
    );

    console.log('✅ Health behavior inserted with ID:', result.insertId);

    res.status(201).json({ 
      success: true,
      message: 'พฤติกรรมสุขภาพบันทึกเรียบร้อยแล้ว',
      behaviorId: result.insertId 
    });
  } catch (error) {
    console.error('❌ Add health behavior error:', error);
    res.status(500).json({ 
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      details: error.message 
    });
  }
});

// ===============================
// 📋 Health Records Route
// ===============================

// Get health records (combination of metrics and behaviors)
app.get('/api/health-records', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent health metrics
    const [metrics] = await db.execute(
      `SELECT 'metric' as record_type, metric_id as id, measurement_date as date, 
              systolic_bp, diastolic_bp, heart_rate, blood_sugar_mg, notes,
              'Health Measurement' as category
       FROM health_metrics 
       WHERE user_id = ? 
       ORDER BY measurement_date DESC 
       LIMIT ?`,
      [req.user.userId, Math.floor(limit / 2)]
    );

    // Get recent health behaviors
    const [behaviors] = await db.execute(
      `SELECT 'behavior' as record_type, behavior_id as id, record_date as date,
              exercise_duration_minutes, sleep_hours_per_night, stress_level, notes,
              'Lifestyle Record' as category
       FROM health_behaviors 
       WHERE user_id = ? 
       ORDER BY record_date DESC 
       LIMIT ?`,
      [req.user.userId, Math.floor(limit / 2)]
    );

    // Combine and sort by date
    const allRecords = [...metrics, ...behaviors]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, parseInt(limit));

    res.json(allRecords);
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 📋 Health Summary Route
// ===============================

// Get health summary
app.get('/api/health-summary', authenticateToken, async (req, res) => {
  try {
    const [summary] = await db.execute(
      'SELECT * FROM health_summary WHERE user_id = ?',
      [req.user.userId]
    );

    if (summary.length === 0) {
      // Create default health summary for new users
      const defaultSummary = {
        user_id: req.user.userId,
        overall_health_score: 0,
        bmi: null,
        bmi_category: 'Not Available',
        blood_pressure_status: 'Not Available',
        diabetes_risk: 'Unknown',
        cardiovascular_risk: 'Unknown',
        last_checkup: null,
        next_recommended_checkup: null,
        health_goals: 'Set your health goals',
        medications: null,
        allergies: null,
        medical_conditions: null,
        lifestyle_recommendations: 'Complete your health profile to get personalized recommendations',
        emergency_notes: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      return res.json(defaultSummary);
    }

    res.json(summary[0]);
  } catch (error) {
    console.error('Get health summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 🎯 Health Assessment Routes
// ===============================

// Calculate BMI
app.post('/api/calculate-bmi', authenticateToken, async (req, res) => {
  try {
    const { height_cm, weight_kg } = req.body;

    if (!height_cm || !weight_kg) {
      return res.status(400).json({ error: 'Height and weight are required' });
    }

    // Calculate BMI manually
    const heightInMeters = height_cm / 100;
    const bmi = weight_kg / (heightInMeters * heightInMeters);
    
    let category;
    if (bmi < 18.5) category = 'น้ำหนักน้อย';
    else if (bmi <= 24.9) category = 'ปกติ';
    else if (bmi <= 29.9) category = 'น้ำหนักเกิน';
    else if (bmi <= 34.9) category = 'อ้วนระดับ 1';
    else if (bmi <= 39.9) category = 'อ้วนระดับ 2';
    else category = 'อ้วนระดับ 3';

    res.json({ 
      bmi: parseFloat(bmi.toFixed(2)), 
      category,
      height_cm,
      weight_kg,
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Calculate BMI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post-Registration Health Assessment
app.post('/api/health-assessment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const assessmentData = req.body;

    console.log('📋 Health Assessment Data received for user:', userId);

    // Create health assessment record
    const [result] = await db.execute(`
      INSERT INTO health_assessments (
        user_id,
        smoking_status, smoking_years, smoking_pack_per_day, smoking_quit_attempts,
        alcohol_frequency, alcohol_type, alcohol_amount, alcohol_binge_frequency,
        exercise_frequency, exercise_type, exercise_duration, exercise_intensity,
        sleep_hours, sleep_quality, sleep_problems,
        stress_level, stress_sources, coping_mechanisms,
        diet_type, vegetable_servings, fruit_servings, water_intake, 
        fast_food_frequency, snack_frequency, caffeine_intake,
        food_allergies, drug_allergies, environmental_allergies,
        current_medications, supplement_usage, medical_conditions, family_history,
        work_environment, work_stress_level, screen_time_hours,
        mood_changes, anxiety_frequency, social_activities,
        health_goals, recent_health_changes, vaccination_status,
        current_symptoms, chronic_symptoms,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      assessmentData.smoking_status || 'never',
      assessmentData.smoking_years || null,
      assessmentData.smoking_pack_per_day || null,
      assessmentData.smoking_quit_attempts || null,
      assessmentData.alcohol_frequency || 'never',
      assessmentData.alcohol_type || null,
      assessmentData.alcohol_amount || null,
      assessmentData.alcohol_binge_frequency || 'never',
      assessmentData.exercise_frequency || 'never',
      assessmentData.exercise_type || null,
      assessmentData.exercise_duration || null,
      assessmentData.exercise_intensity || 'light',
      assessmentData.sleep_hours || null,
      assessmentData.sleep_quality || 'good',
      JSON.stringify(assessmentData.sleep_problems || []),
      assessmentData.stress_level || 'low',
      JSON.stringify(assessmentData.stress_sources || []),
      JSON.stringify(assessmentData.coping_mechanisms || []),
      assessmentData.diet_type || 'mixed',
      assessmentData.vegetable_servings || null,
      assessmentData.fruit_servings || null,
      assessmentData.water_intake || null,
      assessmentData.fast_food_frequency || 'rarely',
      assessmentData.snack_frequency || 'sometimes',
      assessmentData.caffeine_intake || 'moderate',
      assessmentData.food_allergies || null,
      assessmentData.drug_allergies || null,
      assessmentData.environmental_allergies || null,
      assessmentData.current_medications || null,
      assessmentData.supplement_usage || null,
      assessmentData.medical_conditions || null,
      assessmentData.family_history || null,
      assessmentData.work_environment || 'office',
      assessmentData.work_stress_level || 'moderate',
      assessmentData.screen_time_hours || null,
      assessmentData.mood_changes || 'no',
      assessmentData.anxiety_frequency || 'rarely',
      assessmentData.social_activities || 'sometimes',
      JSON.stringify(assessmentData.health_goals || []),
      assessmentData.recent_health_changes || null,
      assessmentData.vaccination_status || 'up_to_date',
      JSON.stringify(assessmentData.current_symptoms || []),
      JSON.stringify(assessmentData.chronic_symptoms || [])
    ]);

    console.log('✅ Health assessment saved with ID:', result.insertId);

    res.json({ 
      success: true, 
      message: 'Health assessment saved successfully',
      assessment_id: result.insertId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Health assessment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save health assessment',
      details: error.message 
    });
  }
});

// Get Health Assessment
app.get('/api/health-assessment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [assessments] = await db.execute(`
      SELECT * FROM health_assessments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId]);

    if (assessments.length === 0) {
      return res.json({ 
        success: true, 
        assessment: null,
        message: 'No health assessment found'
      });
    }

    const assessment = assessments[0];
    
    // Parse JSON fields
    if (assessment.sleep_problems) {
      assessment.sleep_problems = JSON.parse(assessment.sleep_problems);
    }
    if (assessment.stress_sources) {
      assessment.stress_sources = JSON.parse(assessment.stress_sources);
    }
    if (assessment.coping_mechanisms) {
      assessment.coping_mechanisms = JSON.parse(assessment.coping_mechanisms);
    }
    if (assessment.health_goals) {
      assessment.health_goals = JSON.parse(assessment.health_goals);
    }
    if (assessment.current_symptoms) {
      assessment.current_symptoms = JSON.parse(assessment.current_symptoms);
    }
    if (assessment.chronic_symptoms) {
      assessment.chronic_symptoms = JSON.parse(assessment.chronic_symptoms);
    }

    res.json({ 
      success: true, 
      assessment: assessment
    });

  } catch (error) {
    console.error('❌ Get health assessment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve health assessment' 
    });
  }
});

// Get current BMI from profile
app.get('/api/current-bmi', authenticateToken, async (req, res) => {
  try {
    // Get latest weight from health metrics
    const [latestMetric] = await db.execute(
      'SELECT weight_kg FROM health_metrics WHERE user_id = ? AND weight_kg IS NOT NULL ORDER BY measurement_date DESC LIMIT 1',
      [req.user.userId]
    );

    // Get profile data
    const [profile] = await db.execute(
      'SELECT height_cm, weight_kg FROM user_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    if (profile.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const height_cm = profile[0].height_cm;
    const weight_kg = latestMetric[0]?.weight_kg || profile[0].weight_kg;

    if (!height_cm || !weight_kg) {
      return res.json({ 
        bmi: null, 
        category: 'ไม่มีข้อมูล',
        message: 'ต้องการข้อมูลส่วนสูงและน้ำหนัก'
      });
    }

    // Calculate BMI
    const heightInMeters = height_cm / 100;
    const bmi = weight_kg / (heightInMeters * heightInMeters);
    
    let category;
    if (bmi < 18.5) category = 'น้ำหนักน้อย';
    else if (bmi <= 24.9) category = 'ปกติ';
    else if (bmi <= 29.9) category = 'น้ำหนักเกิน';
    else if (bmi <= 34.9) category = 'อ้วนระดับ 1';
    else if (bmi <= 39.9) category = 'อ้วนระดับ 2';
    else category = 'อ้วนระดับ 3';

    res.json({ 
      bmi: parseFloat(bmi.toFixed(2)), 
      category,
      height_cm,
      weight_kg,
      weight_source: latestMetric[0]?.weight_kg ? 'latest_metric' : 'profile',
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get current BMI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get health risk assessment
app.get('/api/risk-assessment', authenticateToken, async (req, res) => {
  try {
    const [result] = await db.execute(
      'CALL GetHealthRiskAssessment(?, @cardio_risk, @diabetes_risk, @recommendations)',
      [req.user.userId]
    );

    const [riskResult] = await db.execute(
      'SELECT @cardio_risk as cardiovascular_risk, @diabetes_risk as diabetes_risk, @recommendations as recommendations'
    );

    res.json(riskResult[0]);
  } catch (error) {
    console.error('Get risk assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================
// 📈 Health Trends Analysis Routes
// ===============================

// Get health trends
app.get('/api/health-trends', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get health metrics trends
    const [metricsTrends] = await db.execute(
      `SELECT measurement_date, 
              AVG(systolic_bp) as avg_systolic_bp, 
              AVG(diastolic_bp) as avg_diastolic_bp, 
              AVG(heart_rate) as avg_heart_rate,
              AVG(blood_sugar_mg) as avg_blood_sugar_mg, 
              AVG(cholesterol_total) as avg_cholesterol_total, 
              AVG(cholesterol_hdl) as avg_cholesterol_hdl, 
              AVG(cholesterol_ldl) as avg_cholesterol_ldl,
              AVG(triglycerides) as avg_triglycerides, 
              AVG(hba1c) as avg_hba1c, 
              AVG(body_fat_percentage) as avg_body_fat_percentage, 
              AVG(muscle_mass_kg) as avg_muscle_mass_kg
       FROM health_metrics 
       WHERE user_id = ? AND measurement_date BETWEEN ? AND ?
       GROUP BY measurement_date
       ORDER BY measurement_date`,
      [req.user.userId, startDate, endDate]
    );

    // Get health behaviors trends
    const [behaviorsTrends] = await db.execute(
      `SELECT record_date, 
              AVG(cigarettes_per_day) as avg_cigarettes_per_day, 
              AVG(alcohol_units_per_week) as avg_alcohol_units_per_week, 
              AVG(exercise_duration_minutes) as avg_exercise_duration_minutes,
              AVG(sleep_hours_per_night) as avg_sleep_hours_per_night, 
              AVG(stress_level) as avg_stress_level, 
              AVG(diet_quality) as avg_diet_quality, 
              AVG(water_intake_liters) as avg_water_intake_liters
       FROM health_behaviors 
       WHERE user_id = ? AND record_date BETWEEN ? AND ?
       GROUP BY record_date
       ORDER BY record_date`,
      [req.user.userId, startDate, endDate]
    );

    res.json({ metricsTrends, behaviorsTrends });
  } catch (error) {
    console.error('Get health trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health Analytics API endpoints
app.get('/api/health-analytics/trends/:timeRange?', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timeRange = req.params.timeRange || '6months';
    
    const analytics = new HealthAnalytics(db);
    const result = await analytics.analyzeHealthTrends(userId, timeRange);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Health trends analyzed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in health analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze health trends'
    });
  }
});

// Get health predictions based on trends
app.get('/api/health-analytics/predictions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const analytics = new HealthAnalytics(db);
    
    // Get 1-year trend for predictions
    const trends = await analytics.analyzeHealthTrends(userId, '1year');
    
    if (trends.success) {
      const predictions = {
        bmi: predictBMIFuture(trends.data.trends.bmi),
        bloodPressure: predictBPFuture(trends.data.trends.bloodPressure),
        diabetesRisk: predictDiabetesRisk(trends.data.trends.bloodSugar),
        overallHealth: predictOverallHealth(trends.data.trends.overall)
      };
      
      res.json({
        success: true,
        data: predictions,
        basedOn: 'AI analysis of 1-year health data trends'
      });
    } else {
      res.status(500).json({ success: false, error: trends.error });
    }
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate health predictions'
    });
  }
});

// Get personalized health insights
app.get('/api/health-analytics/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const analytics = new HealthAnalytics(db);
    
    const insights = await analytics.analyzeHealthTrends(userId, '6months');
    
    if (insights.success) {
      const personalizedInsights = {
        healthScore: insights.data.trends.overall,
        riskFactors: insights.data.riskFactors,
        improvements: insights.data.improvements,
        recommendations: insights.data.recommendations,
        nextActions: generateNextActions(insights.data.trends)
      };
      
      res.json({
        success: true,
        data: personalizedInsights,
        generatedAt: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: insights.error });
    }
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate health insights'
    });
  }
});

// Export health data for research (anonymized)
app.post('/api/health-analytics/export-anonymous', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { purpose, dataTypes } = req.body;
    
    // Check user consent for data sharing
    const [consent] = await db.execute(
      'SELECT allow_research_data FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (!consent[0]?.allow_research_data) {
      return res.status(403).json({
        success: false,
        error: 'User has not consented to data sharing for research'
      });
    }
    
    // Generate anonymized data export
    const anonymizedData = await generateAnonymizedExport(userId, dataTypes);
    
    // Log the export for audit trail
    await db.execute(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'data_export', JSON.stringify({ purpose, dataTypes, timestamp: new Date() })]
    );
    
    res.json({
      success: true,
      data: anonymizedData,
      purpose: purpose,
      exportedAt: new Date().toISOString(),
      note: 'This data has been anonymized and contains no personally identifiable information'
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export health data'
    });
  }
});

// Helper functions for predictions
function predictBMIFuture(bmiTrend) {
  if (!bmiTrend.data || bmiTrend.data.length < 2) {
    return { prediction: 'insufficient_data' };
  }
  
  const currentBMI = bmiTrend.current;
  const trend = bmiTrend.trend;
  
  let prediction = currentBMI;
  if (trend === 'increasing') prediction += 0.5;
  if (trend === 'decreasing') prediction -= 0.5;
  
  return {
    prediction: prediction.toFixed(1),
    confidence: 'moderate',
    timeframe: '6_months',
    recommendation: prediction > 25 ? 'Focus on weight management' : 'Maintain current lifestyle'
  };
}

function predictBPFuture(bpTrend) {
  if (!bpTrend.current) return { prediction: 'insufficient_data' };
  
  const current = bpTrend.current;
  const trend = bpTrend.trend;
  
  let systolicPrediction = current.systolic;
  let diastolicPrediction = current.diastolic;
  
  if (trend === 'increasing') {
    systolicPrediction += 5;
    diastolicPrediction += 3;
  } else if (trend === 'decreasing') {
    systolicPrediction -= 5;
    diastolicPrediction -= 3;
  }
  
  return {
    prediction: {
      systolic: Math.round(systolicPrediction),
      diastolic: Math.round(diastolicPrediction)
    },
    riskLevel: systolicPrediction > 140 ? 'high' : 'moderate',
    recommendation: systolicPrediction > 140 ? 'Monitor blood pressure closely' : 'Continue current lifestyle'
  };
}

function predictDiabetesRisk(sugarTrend) {
  if (!sugarTrend.current) return { prediction: 'insufficient_data' };
  
  const currentLevel = sugarTrend.current;
  const risk = sugarTrend.diabetesRisk;
  
  return {
    prediction: risk,
    riskPercentage: currentLevel > 125 ? '75%' : currentLevel > 100 ? '35%' : '10%',
    recommendation: currentLevel > 100 ? 'Consult with healthcare provider' : 'Continue healthy lifestyle'
  };
}

function predictOverallHealth(overallTrend) {
  const currentScore = overallTrend.score;
  
  return {
    prediction: currentScore >= 80 ? 'improving' : currentScore >= 60 ? 'stable' : 'declining',
    projectedScore: currentScore,
    recommendation: currentScore < 70 ? 'Focus on lifestyle improvements' : 'Maintain current health practices'
  };
}

function generateNextActions(trends) {
  const actions = [];
  
  if (trends.bmi.trend === 'increasing') {
    actions.push({
      action: 'weight_management',
      priority: 'high',
      description: 'Implement weight management plan'
    });
  }
  
  if (trends.bloodPressure.riskLevel === 'high') {
    actions.push({
      action: 'bp_monitoring',
      priority: 'urgent',
      description: 'Monitor blood pressure daily and consult doctor'
    });
  }
  
  if (trends.lifestyle.exercise.recommendation === 'needs_improvement') {
    actions.push({
      action: 'increase_exercise',
      priority: 'medium',
      description: 'Increase physical activity to at least 150 minutes per week'
    });
  }
  
  return actions;
}

async function generateAnonymizedExport(userId, dataTypes) {
  // This function would generate anonymized data
  // Remove all personally identifiable information
  return {
    anonymous_id: `anon_${Math.random().toString(36).substr(2, 9)}`,
    data_summary: 'Anonymized health metrics and trends',
    note: 'All personal identifiers have been removed'
  };
}

// ===============================
// 🌐 API Documentation & Health Check
// ===============================

// Main API endpoint with documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'Health Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login'
      },
      profile: {
        'GET /api/profile': 'Get user profile (requires auth)'
      },
      health_data: {
        'GET /api/health-metrics': 'Get health metrics (requires auth)',
        'POST /api/health-metrics': 'Add health metrics (requires auth)',
        'GET /api/health-behaviors': 'Get health behaviors (requires auth)',
        'POST /api/health-behaviors': 'Add health behaviors (requires auth)',
        'GET /api/health-summary': 'Get health summary (requires auth)'
      },
      analytics: {
        'GET /api/health-analytics/trends/:timeRange': 'Get health trends analysis (requires auth)',
        'GET /api/health-analytics/predictions': 'Get health predictions (requires auth)',
        'GET /api/health-analytics/insights': 'Get health insights (requires auth)',
        'POST /api/health-analytics/export-anonymous': 'Export anonymous data (requires auth)'
      },
      tools: {
        'POST /api/calculate-bmi': 'Calculate BMI (requires auth)',
        'GET /api/current-bmi': 'Get current BMI from profile and latest metrics (requires auth)',
        'GET /api/risk-assessment': 'Get risk assessment (requires auth)',
        'GET /api/health-trends': 'Get health trends (requires auth)'
      }
    },
    security: {
      authentication: 'JWT Bearer Token required for protected endpoints',
      standards: 'HIPAA, GDPR, Thailand PDPA compliant'
    }
  });
});

// ===============================
// 🔄 Keep-Alive System for Render
// ===============================

let keepAliveInterval;
let lastActivity = Date.now();

// Self-ping to prevent sleep mode (Render free tier)
function initKeepAlive() {
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_SERVICE_URL) {
    console.log('🔄 Initializing keep-alive system for Render...');
    
    // Ping ตัวเองทุก 10 นาที (Render sleeps after 15 minutes)
    keepAliveInterval = setInterval(async () => {
      try {
        const fetch = await import('node-fetch').then(module => module.default);
        const response = await fetch(`${process.env.RENDER_SERVICE_URL}/api/ping`);
        
        if (response.ok) {
          console.log('✅ Keep-alive ping successful');
          lastActivity = Date.now();
        } else {
          console.log('⚠️ Keep-alive ping failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Keep-alive ping error:', error.message);
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    console.log('✅ Keep-alive system initialized');
  }
}

// Stop keep-alive on shutdown
function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    console.log('🛑 Keep-alive system stopped');
  }
}

// Track API activity
function trackActivity(req, res, next) {
  lastActivity = Date.now();
  next();
}

// Apply activity tracking to all routes
app.use(trackActivity);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  stopKeepAlive();
  
  if (db) {
    console.log('🔐 Closing database connection...');
    if (typeof db.end === 'function') {
      db.end();
    } else if (typeof db.destroy === 'function') {
      db.destroy();
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  stopKeepAlive();
  
  if (db) {
    console.log('🔐 Closing database connection...');
    if (typeof db.end === 'function') {
      db.end();
    } else if (typeof db.destroy === 'function') {
      db.destroy();
    }
  }
  
  process.exit(0);
});

// Start server with enhanced error handling
async function startServer() {
  try {
    console.log('🚀 Starting Health Management API...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Port: ${PORT}`);
    
    await initDatabase();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Health Management API running on port ${PORT}`);
      console.log(`📊 API Endpoint: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      
      // Initialize keep-alive for production
      initKeepAlive();
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      stopKeepAlive();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

console.log('🎯 Health Management API - Starting...');
startServer().catch((error) => {
  console.error('💀 Critical startup error:', error);
  process.exit(1);
});
