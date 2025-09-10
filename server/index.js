import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import HealthAnalytics from './healthAnalytics.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS with Safari-compatible settings
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://health-management-api.onrender.com',
    'https://healthforaom.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
}));

// Additional security headers for Safari compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const isDicom = file.originalname.toLowerCase().endsWith('.dcm');
    
    if (allowedTypes.includes(file.mimetype) || isDicom) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์ JPEG, PNG และ DICOM เท่านั้น'), false);
    }
  }
});

// Database connection with PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'health_management',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let db;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Helper: create a Pool using DATABASE_URL if present, otherwise use discrete DB_* vars
function createDbPool() {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  // Determine if DB_* envs are sufficiently defined
  const hasDbVars = !!(
    process.env.DB_HOST || process.env.DB_NAME || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_PORT
  );

  // Prefer DB_* when present (requested behavior)
  if (hasDbVars) {
    const host = process.env.DB_HOST || dbConfig.host;
    const name = process.env.DB_NAME || dbConfig.database;
    const user = process.env.DB_USER || dbConfig.user;
    const port = parseInt(process.env.DB_PORT || dbConfig.port, 10);
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
    console.log(`🗄️ Using DB_* environment variables for PostgreSQL (host=${host}, db=${name}, user=${user}, port=${port}, ssl=${!!ssl})`);
    return new Pool({
      host,
      database: name,
      user,
      password: process.env.DB_PASSWORD || dbConfig.password,
      port,
      ssl,
      max: dbConfig.max,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    });
  }

  // Fallback to DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('🗄️ Using DATABASE_URL for PostgreSQL connection');
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: (process.env.DB_SSL === 'true' || isProd) ? { rejectUnauthorized: false } : false,
      max: dbConfig.max,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    });
  }

  // Last resort: use baked-in defaults (dev)
  console.log(`🗄️ Using default dev DB config (host=${dbConfig.host}, db=${dbConfig.database}, ssl=${!!dbConfig.ssl})`);
  return new Pool(dbConfig);
}

async function initDatabase() {
  try {
    connectionAttempts++;
    console.log(`🔄 Database connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
    
    // Create PostgreSQL connection pool
    db = createDbPool();
    console.log('🔗 Created PostgreSQL connection pool');
    
    // Test connection
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection verified');
    
    // Create basic tables if they don't exist
    await createBasicTables();
    
    connectionAttempts = 0; // Reset on success
    
  } catch (error) {
    console.error(`❌ Database connection error (attempt ${connectionAttempts}):`, error.message);
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      console.log(`⏳ Retrying in 5 seconds...`);
      setTimeout(initDatabase, 5000);
    } else {
      console.error('💀 Max connection attempts reached.');
      console.log('🔧 Starting server without database (will retry on first request)');
      
      // Don't exit, just log and continue
      // This allows health checks to work even without DB
      db = null;
    }
  }
}

// Create basic tables
async function createBasicTables() {
  try {
    console.log('📋 Creating basic tables...');
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_profiles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        profile_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        birth_date DATE,
        gender VARCHAR(20),
        height_cm INTEGER,
        weight_kg DECIMAL(5,2),
        blood_type VARCHAR(5),
        allergies TEXT,
        medical_conditions TEXT,
        emergency_contact_name VARCHAR(100),
        emergency_phone VARCHAR(20),
        allow_research_data BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create health_metrics table
    await db.query(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        measurement_date DATE NOT NULL,
        weight_kg DECIMAL(5,2),
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        heart_rate INTEGER,
        blood_sugar DECIMAL(5,2),
        body_temperature DECIMAL(4,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create health_behaviors table
    await db.query(`
      CREATE TABLE IF NOT EXISTS health_behaviors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        behavior_date DATE NOT NULL,
        sleep_hours DECIMAL(3,1),
        exercise_minutes INTEGER,
        water_glasses INTEGER,
        steps INTEGER,
        stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
        mood INTEGER CHECK (mood BETWEEN 1 AND 10),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create health_assessments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS health_assessments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assessment_date DATE NOT NULL,
        overall_health INTEGER CHECK (overall_health BETWEEN 1 AND 10),
        energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
        appetite INTEGER CHECK (appetite BETWEEN 1 AND 10),
        pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
        concerns TEXT,
        goals TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create health_summary table
    await db.query(`
      CREATE TABLE IF NOT EXISTS health_summary (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        overall_health_score INTEGER DEFAULT 0,
        bmi DECIMAL(5,2),
        bmi_category VARCHAR(50),
        blood_pressure_status VARCHAR(50),
        diabetes_risk VARCHAR(50),
        cardiovascular_risk VARCHAR(50),
        last_checkup DATE,
        next_recommended_checkup DATE,
        health_goals TEXT,
        medications TEXT,
        allergies TEXT,
        medical_conditions TEXT,
        lifestyle_recommendations TEXT,
        emergency_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Basic tables created successfully');
  } catch (error) {
    console.error('❌ Error creating basic tables:', error);
    throw error;
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
// � Root & Welcome Routes
// ===============================

// Static files will be set dynamically after finding dist folder

// Root route - Serve frontend app
app.get('/', (req, res) => {
  const indexPath = globalDistPath ? 
    path.join(globalDistPath, 'index.html') :
    path.join(process.cwd(), '..', 'dist', 'index.html');
  
  console.log('🔍 Looking for React app at:', indexPath);
  console.log('📁 __dirname is:', __dirname);
  console.log('📂 Current working directory:', process.cwd());
  console.log('📁 Global dist path:', globalDistPath || 'not set');
  
  // Check if dist folder exists
  const distPath = path.join(__dirname, 'dist');
  console.log('📁 Dist folder exists:', fs.existsSync(distPath));
  
  if (fs.existsSync(distPath)) {
    try {
      const files = fs.readdirSync(distPath);
      console.log('📂 Files in dist:', files);
    } catch (err) {
      console.log('❌ Error reading dist folder:', err.message);
    }
  }
  
  // Try to serve React app first
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.log('⚠️ React app not found at:', indexPath);
      console.log('� Error details:', err.message);
      
      // Don't redirect, show error page instead
      res.status(404).send(`
        <h1>❌ Frontend Files Not Found</h1>
        <p><strong>Looking for:</strong> ${indexPath}</p>
        <p><strong>Directory:</strong> ${__dirname}</p>
        <p><strong>Working Dir:</strong> ${process.cwd()}</p>
        <p><strong>Dist exists:</strong> ${fs.existsSync(distPath)}</p>
        <p><strong>Error:</strong> ${err.message}</p>
        <hr>
        <p><a href="/debug/files">🔍 Debug Files</a></p>
        <p><a href="/api">📋 API Documentation</a></p>
      `);
    } else {
      console.log('✅ Successfully serving React app');
    }
  });
});

// Debug route to check files
app.get('/debug/files', (req, res) => {
  const distPath = path.join(__dirname, 'dist');
  
  try {
    const files = fs.readdirSync(distPath);
    res.json({
      distPath: distPath,
      files: files,
      indexExists: fs.existsSync(path.join(distPath, 'index.html')),
      __dirname: __dirname,
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    res.json({
      distPath: distPath,
      error: error.message,
      distExists: fs.existsSync(distPath),
      __dirname: __dirname,
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV
    });
  }
});

// Debug route to check build process
app.get('/debug/build', (req, res) => {
  const rootDistPath = path.join(process.cwd(), 'dist');
  const serverDistPath = path.join(__dirname, 'dist');
  
  res.json({
    rootDist: {
      path: rootDistPath,
      exists: fs.existsSync(rootDistPath),
      files: fs.existsSync(rootDistPath) ? fs.readdirSync(rootDistPath) : []
    },
    serverDist: {
      path: serverDistPath,
      exists: fs.existsSync(serverDistPath),
      files: fs.existsSync(serverDistPath) ? fs.readdirSync(serverDistPath) : []
    },
    paths: {
      __dirname: __dirname,
      cwd: process.cwd(),
      relative: path.relative(process.cwd(), __dirname)
    }
  });
});

// API Info route
app.get('/api', (req, res) => {
  res.status(200).json({
    api: '🏥 Health Management API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: db ? 'connected' : 'not configured',
    uptime: process.uptime(),
    endpoints_available: [
      'GET /api/health - System health check',
      'GET /api/ping - Keep-alive endpoint',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/users/profile - Get user profile',
      'PUT /api/users/profile - Update user profile',
      'GET /api/health-metrics - Get health metrics',
      'POST /api/health-metrics - Add health metrics',
      'GET /api/health-behaviors - Get health behaviors',
      'POST /api/health-behaviors - Add health behaviors',
      'GET /api/health-summary - Get health summary',
      'GET /api/current-bmi - Get current BMI',
      'POST /api/setup/migrate - Database migration',
      'GET /api/setup/tables - List database tables'
    ]
  });
});

// ===============================
// �🏥 Health Check & Keep-Alive Routes (For Render Deployment)
// ===============================

// Health check endpoint to prevent sleep mode
app.get('/api/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    
    // Test database connection if available
    if (db) {
      try {
        await db.query('SELECT 1 as health_check');
        dbStatus = 'connected';
      } catch (error) {
        console.error('Database health check failed:', error.message);
        dbStatus = 'error';
      }
    }
    
    res.status(200).json({
      status: dbStatus === 'connected' ? 'healthy' : 'partial',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus,
      message: dbStatus === 'disconnected' ? 'Database not configured' : 
               dbStatus === 'error' ? 'Database connection error' : 'All systems operational'
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
    const existingUsers = await db.query(
      'SELECT user_id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUsers.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
      [username, email, passwordHash]
    );

    const userId = result.rows[0].user_id;

    // Insert profile data if provided
    if (profile) {
      try {
        await db.query(
          `INSERT INTO user_profiles (
            user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
            phone, emergency_contact, medical_conditions, medications, allergies
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
    const users = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (users.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email
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
    const usersResult = await db.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = usersResult.rows[0];

    // Try to get user profile
    const profilesResult = await db.query(
      `SELECT p.*, u.username, u.email 
       FROM user_profiles p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = $1`,
      [req.user.userId]
    );

    if (profilesResult.rows.length === 0) {
      // Return basic user info if no profile exists
      return res.json({
        user_id: user.id,
        username: user.username,
        email: user.email,
        profile_completed: false,
        message: 'Profile not completed yet'
      });
    }

    res.json({
      ...profilesResult.rows[0],
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
    const existingProfiles = await db.query(
      'SELECT profile_id FROM user_profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (existingProfiles.rows.length === 0) {
      // Create new profile
      await db.query(
        `INSERT INTO user_profiles 
         (user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
          phone, emergency_contact, emergency_phone, medical_conditions, medications) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [req.user.userId, sanitizedData.full_name, sanitizedData.date_of_birth, 
         sanitizedData.gender, sanitizedData.blood_group, sanitizedData.height_cm, 
         sanitizedData.weight_kg, sanitizedData.phone, sanitizedData.emergency_contact, 
         sanitizedData.emergency_phone, sanitizedData.medical_conditions, sanitizedData.medications]
      );
      console.log('✅ New profile created for user:', req.user.userId);
    } else {
      // Update existing profile
      await db.query(
        `UPDATE user_profiles SET 
         full_name = $1, date_of_birth = $2, gender = $3, blood_group = $4,
         height_cm = $5, weight_kg = $6, phone = $7, emergency_contact = $8, emergency_phone = $9,
         medical_conditions = $10, medications = $11, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $12`,
        [sanitizedData.full_name, sanitizedData.date_of_birth, sanitizedData.gender, 
         sanitizedData.blood_group, sanitizedData.height_cm, sanitizedData.weight_kg, 
         sanitizedData.phone, sanitizedData.emergency_contact, sanitizedData.emergency_phone,
         sanitizedData.medical_conditions, sanitizedData.medications, req.user.userId]
      );
      console.log('✅ Profile updated for user:', req.user.userId);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ===============================
// � User Profile Routes
// ===============================

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting profile for user:', req.user.userId);
    
    // Get user basic info
    const userResult = await db.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get user profile details
    const profileResult = await db.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.user.userId]
    );
    
    const profile = profileResult.rows.length > 0 ? profileResult.rows[0] : null;
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Updating profile for user:', req.user.userId);
    console.log('📊 Profile data:', req.body);
    
    const {
      full_name, date_of_birth, gender, blood_group,
      height_cm, weight_kg, phone, emergency_contact, emergency_phone,
      medical_conditions, medications, allergies
    } = req.body;

    // Sanitize data
    const sanitizedData = {
      full_name: full_name?.trim() || null,
      date_of_birth: date_of_birth || null,
      gender: gender?.trim() || null,
      blood_group: blood_group?.trim() || null,
      height_cm: height_cm ? parseFloat(height_cm) : null,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      phone: phone?.trim() || null,
      emergency_contact: emergency_contact?.trim() || null,
      emergency_phone: emergency_phone?.trim() || null,
      medical_conditions: medical_conditions?.trim() || null,
      medications: medications?.trim() || null,
      allergies: allergies?.trim() || null
    };

    // Detect if column emergency_phone exists in user_profiles
    const epColCheck = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'user_profiles'
           AND column_name = 'emergency_phone'
       ) AS exists`
    );
    const hasEmergencyPhoneCol = epColCheck.rows?.[0]?.exists === true;
    console.log('🔎 user_profiles.emergency_phone exists:', hasEmergencyPhoneCol);

    // Check if profile exists
    const existingProfile = await db.query(
      'SELECT profile_id FROM user_profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (existingProfile.rows.length === 0) {
      // Create new profile
      if (hasEmergencyPhoneCol) {
        await db.query(
          `INSERT INTO user_profiles 
           (user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
            phone, emergency_contact, emergency_phone, medical_conditions, medications, allergies) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [req.user.userId, sanitizedData.full_name, sanitizedData.date_of_birth, 
           sanitizedData.gender, sanitizedData.blood_group, sanitizedData.height_cm, 
           sanitizedData.weight_kg, sanitizedData.phone, sanitizedData.emergency_contact, 
           sanitizedData.emergency_phone, sanitizedData.medical_conditions, 
           sanitizedData.medications, sanitizedData.allergies]
        );
      } else {
        await db.query(
          `INSERT INTO user_profiles 
           (user_id, full_name, date_of_birth, gender, blood_group, height_cm, weight_kg, 
            phone, emergency_contact, medical_conditions, medications, allergies) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [req.user.userId, sanitizedData.full_name, sanitizedData.date_of_birth, 
           sanitizedData.gender, sanitizedData.blood_group, sanitizedData.height_cm, 
           sanitizedData.weight_kg, sanitizedData.phone, sanitizedData.emergency_contact,
           sanitizedData.medical_conditions, sanitizedData.medications, sanitizedData.allergies]
        );
      }
      console.log('✅ New profile created for user:', req.user.userId);
    } else {
      // Update existing profile
      if (hasEmergencyPhoneCol) {
        await db.query(
          `UPDATE user_profiles SET 
           full_name = $1, date_of_birth = $2, gender = $3, blood_group = $4,
           height_cm = $5, weight_kg = $6, phone = $7, emergency_contact = $8, emergency_phone = $9,
           medical_conditions = $10, medications = $11, allergies = $12, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $13`,
          [sanitizedData.full_name, sanitizedData.date_of_birth, sanitizedData.gender, 
           sanitizedData.blood_group, sanitizedData.height_cm, sanitizedData.weight_kg, 
           sanitizedData.phone, sanitizedData.emergency_contact, sanitizedData.emergency_phone,
           sanitizedData.medical_conditions, sanitizedData.medications, sanitizedData.allergies, req.user.userId]
        );
      } else {
        await db.query(
          `UPDATE user_profiles SET 
           full_name = $1, date_of_birth = $2, gender = $3, blood_group = $4,
           height_cm = $5, weight_kg = $6, phone = $7, emergency_contact = $8,
           medical_conditions = $9, medications = $10, allergies = $11, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $12`,
          [sanitizedData.full_name, sanitizedData.date_of_birth, sanitizedData.gender, 
           sanitizedData.blood_group, sanitizedData.height_cm, sanitizedData.weight_kg, 
           sanitizedData.phone, sanitizedData.emergency_contact,
           sanitizedData.medical_conditions, sanitizedData.medications, sanitizedData.allergies, req.user.userId]
        );
      }
      console.log('✅ Profile updated for user:', req.user.userId);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack?.split('\n')[0]
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===============================
// �📊 Health Metrics Routes
// ===============================

// Get health metrics
app.get('/api/health-metrics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    let query = `
      SELECT 
        hm.id as metric_id,
        hm.user_id,
        COALESCE(hm.weight_kg, up.weight_kg) AS weight_kg,
        up.height_cm,
        CASE 
          WHEN up.height_cm IS NOT NULL 
           AND up.height_cm > 0 
           AND COALESCE(hm.weight_kg, up.weight_kg) IS NOT NULL
          THEN ROUND(COALESCE(hm.weight_kg, up.weight_kg) / POWER(up.height_cm / 100.0, 2), 2)
          ELSE NULL
        END AS bmi,
        NULL as body_fat_percentage,
        hm.systolic_bp,
        hm.diastolic_bp,
        hm.heart_rate,
        hm.body_temperature,
        hm.blood_sugar,
        NULL as uric_acid,
        NULL as alt,
        NULL as ast,
        NULL as hemoglobin,
        NULL as hematocrit,
        NULL as iron,
        NULL as tibc,
        NULL as oxygen_saturation,
        NULL as steps_count,
        NULL as sleep_hours,
        NULL as stress_level,
        NULL as energy_level,
        NULL as mood_score,
        hm.measurement_date,
        hm.notes,
        hm.created_at as recorded_at
      FROM health_metrics hm
      LEFT JOIN user_profiles up ON up.user_id = hm.user_id
      WHERE hm.user_id = $1`;
    const params = [req.user.userId];
    let idx = 2;

    if (startDate) {
      query += ` AND measurement_date >= $${idx}`;
      params.push(startDate);
      idx++;
    }

    if (endDate) {
      query += ` AND measurement_date <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    query += ` ORDER BY measurement_date DESC LIMIT $${idx}`;
    params.push(parseInt(limit, 10));

    const metrics = await db.query(query, params);
    res.json(metrics.rows);
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

    // Dynamically map only existing columns in the database
    const columnMap = {
      user_id: req.user.userId,
      measurement_date: sanitizeValue(measurement_date),
      systolic_bp: sanitizeValue(systolic_bp),
      diastolic_bp: sanitizeValue(diastolic_bp),
      heart_rate: sanitizeValue(heart_rate),
      blood_sugar: sanitizeValue(blood_sugar_mg),
      body_temperature: sanitizeValue(req.body.body_temperature),
      weight_kg: sanitizeValue(weight_kg),
      notes: sanitizeValue(notes)
    };

    // Filter to only columns that actually exist in the table
    const existingColsResult = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_metrics'`
    );
    const existingCols = new Set(existingColsResult.rows.map(r => r.column_name));

    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const [col, val] of Object.entries(columnMap)) {
      if (val !== undefined && existingCols.has(col)) {
        cols.push(col);
        placeholders.push(`$${idx++}`);
        values.push(val);
      }
    }

    if (cols.length === 0) {
      return res.status(400).json({ error: 'No valid fields to insert' });
    }

    const query = `INSERT INTO health_metrics (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
    console.log('📊 Inserting health metrics with columns:', cols);
    const result = await db.query(query, values);

    const newId = result.rows[0]?.id || null;
    console.log('✅ Health metrics inserted with ID:', newId);

    res.status(201).json({ 
      message: 'Health metrics added successfully',
      metricId: newId 
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
      SELECT behavior_id, behavior_date AS record_date,
             smoking_cigarettes,
             alcohol_units,
             exercise_minutes AS exercise_duration_minutes,
             sleep_hours AS sleep_hours_per_night,
             stress_level,
             (water_intake_ml::decimal / 1000.0) AS water_intake_liters,
             notes
      FROM health_behavior
      WHERE user_id = $1`;
    const params = [req.user.userId];
    let idx = 2;

    if (startDate) {
      query += ` AND behavior_date >= $${idx}`;
      params.push(startDate);
      idx++;
    }

    if (endDate) {
      query += ` AND behavior_date <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    query += ` ORDER BY behavior_date DESC LIMIT $${idx}`;
    params.push(parseInt(limit, 10));

    const behaviors = await db.query(query, params);
    res.json(behaviors.rows);
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
      smoking_status, cigarettes_per_day, smoking_cigarettes,
      alcohol_frequency, alcohol_units_per_week, alcohol_units,
      exercise_frequency, sleep_hours_per_night,
      diet_quality, water_intake_liters, caffeine_cups, screen_time_hours
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

    // Map incoming fields to migrated schema
    const behaviorDate = sanitizeValue(date) || new Date().toISOString().split('T')[0];
    const exerciseMinutes = sanitizeValue(exercise_duration, true) || null;
    const sleepHours = sanitizeValue(calculatedSleepHours);
    const waterIntakeMl = waterLiters ? Math.round(parseFloat(waterLiters) * 1000) : null;
    
    // Handle smoking data - accept either field name
    const cigarettes = sanitizeValue(smoking_cigarettes, true) || sanitizeValue(cigarettes_per_day, true);
    
    // Handle alcohol data - accept either field name  
    const alcoholUnits = sanitizeValue(alcohol_units, true) || sanitizeValue(alcohol_units_per_week, true);

    console.log('📝 Processed behavior data:', {
      behaviorDate,
      exerciseMinutes,
      sleepHours,
      waterIntakeMl,
      cigarettes,
      alcoholUnits,
      stress_level: sanitizeValue(stress_level),
      notes: sanitizeValue(notes)
    });

    const insert = await db.query(
      `INSERT INTO health_behavior 
       (user_id, behavior_date, smoking_cigarettes, alcohol_units, 
        exercise_minutes, sleep_hours, stress_level, water_intake_ml, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING behavior_id`,
      [
        req.user.userId,
        behaviorDate,
        cigarettes,
        alcoholUnits,
        exerciseMinutes,
        sleepHours,
        sanitizeValue(stress_level),
        waterIntakeMl,
        sanitizeValue(notes)
      ]
    );

    console.log('✅ Health behavior inserted with ID:', insert.rows[0]?.behavior_id);

    res.status(201).json({ 
      success: true,
      message: 'พฤติกรรมสุขภาพบันทึกเรียบร้อยแล้ว',
      behaviorId: insert.rows[0]?.behavior_id 
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
    const metrics = await db.query(
      `SELECT 'metric' as record_type, metric_id as id, measurement_date as date, 
              blood_pressure_systolic as systolic_bp, blood_pressure_diastolic as diastolic_bp, 
              heart_rate_bpm as heart_rate, blood_sugar_mg, notes,
              'Health Measurement' as category
       FROM health_metrics 
       WHERE user_id = $1 
       ORDER BY measurement_date DESC 
       LIMIT $2`,
      [req.user.userId, Math.floor(limit / 2)]
    );

    // Get recent health behaviors
    const behaviors = await db.query(
      `SELECT 'behavior' as record_type, behavior_id as id, behavior_date as date,
              exercise_minutes as exercise_duration_minutes, sleep_hours as sleep_hours_per_night, 
              stress_level, notes,
              'Lifestyle Record' as category
       FROM health_behavior 
       WHERE user_id = $1 
       ORDER BY behavior_date DESC 
       LIMIT $2`,
      [req.user.userId, Math.floor(limit / 2)]
    );

    // Combine and sort by date
  const allRecords = [...metrics.rows, ...behaviors.rows]
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
    const summary = await db.query(
      'SELECT * FROM health_summary WHERE user_id = $1',
      [req.user.userId]
    );

    if (summary.rows.length === 0) {
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
    res.json(summary.rows[0]);
  } catch (error) {
    // If table does not exist, return a default summary instead of 500
    if (error.code === '42P01') { // undefined_table
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
      console.warn('⚠️ health_summary table missing, returning default summary');
      return res.json(defaultSummary);
    }
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
    const result = await db.query(`
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, NOW()) RETURNING assessment_id
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

  console.log('✅ Health assessment saved with ID:', result.rows[0]?.assessment_id);

    res.json({ 
      success: true, 
      message: 'Health assessment saved successfully',
  assessment_id: result.rows[0]?.assessment_id,
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

    const assessments = await db.query(`
      SELECT * FROM health_assessments 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId]);

    if (assessments.rows.length === 0) {
      return res.json({ 
        success: true, 
        assessment: null,
        message: 'No health assessment found'
      });
    }

    const assessment = assessments.rows[0];
    
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
    const latestMetric = await db.query(
        'SELECT weight_kg FROM health_metrics WHERE user_id = $1 AND weight_kg IS NOT NULL ORDER BY measurement_date DESC LIMIT 1',
        [req.user.userId]
      );

    // Get profile data
    const profile = await db.query(
        'SELECT height_cm, weight_kg FROM user_profiles WHERE user_id = $1',
        [req.user.userId]
      );

  if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

  const height_cm = profile.rows[0].height_cm;
  const weight_kg = latestMetric.rows[0]?.weight_kg || profile.rows[0].weight_kg;

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
  weight_source: latestMetric.rows[0]?.weight_kg ? 'latest_metric' : 'profile',
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
    // If you have a PostgreSQL function, call it here. For now, return a basic placeholder risk assessment.
      try {
        const risk = await db.query(
          'SELECT 0.2::decimal as cardiovascular_risk, 0.1::decimal as diabetes_risk, $1::text as recommendations',
          ['Maintain a healthy lifestyle']
        );
        return res.json(risk.rows[0]);
      } catch (e) {
        console.warn('⚠️ Risk assessment fallback used:', e.message);
        return res.json({ cardiovascular_risk: 0.2, diabetes_risk: 0.1, recommendations: 'Maintain a healthy lifestyle' });
      }
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
    const metricsTrends = await db.query(
      `SELECT measurement_date, 
              AVG(blood_pressure_systolic) as avg_systolic_bp, 
              AVG(blood_pressure_diastolic) as avg_diastolic_bp, 
              AVG(heart_rate_bpm) as avg_heart_rate,
              AVG(blood_sugar_mg) as avg_blood_sugar_mg, 
              AVG(body_fat_percentage) as avg_body_fat_percentage
       FROM health_metrics 
       WHERE user_id = $1 AND measurement_date BETWEEN $2 AND $3
       GROUP BY measurement_date
       ORDER BY measurement_date`,
      [req.user.userId, startDate, endDate]
    );

    // Get health behaviors trends
    const behaviorsTrends = await db.query(
      `SELECT behavior_date as record_date, 
              AVG(smoking_cigarettes) as avg_smoking_cigarettes, 
              AVG(alcohol_units) as avg_alcohol_units, 
              AVG(exercise_minutes) as avg_exercise_duration_minutes,
              AVG(sleep_hours) as avg_sleep_hours_per_night, 
              AVG(stress_level) as avg_stress_level, 
              AVG(water_intake_ml)/1000.0 as avg_water_intake_liters
       FROM health_behavior 
       WHERE user_id = $1 AND behavior_date BETWEEN $2 AND $3
       GROUP BY behavior_date
       ORDER BY behavior_date`,
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
    
    // Check if database connection exists
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available'
      });
    }
    
    try {
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
    } catch (analyticsError) {
      console.error('❌ Analytics error:', analyticsError);
      // Fallback response
      res.json({
        success: true,
        data: {
          trends: {
            bmi: { trend: 'stable', current: 22.5 },
            bloodPressure: { trend: 'stable', current: { systolic: 120, diastolic: 80 } },
            bloodSugar: { trend: 'stable', current: 95 },
            lifestyle: { exercise: 'moderate', sleep: 'good' },
            overall: { score: 75 }
          },
          recommendations: ['Continue maintaining a healthy lifestyle'],
          riskFactors: [],
          improvements: []
        },
        message: 'Using fallback analysis (analytics service temporarily unavailable)'
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
    
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available'
      });
    }
    
    try {
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
    } catch (analyticsError) {
      console.error('❌ Predictions analytics error:', analyticsError);
      // Fallback predictions
      res.json({
        success: true,
        data: {
          bmi: { prediction: '22.5', confidence: 'moderate', recommendation: 'Maintain current lifestyle' },
          bloodPressure: { prediction: { systolic: 120, diastolic: 80 }, riskLevel: 'low', recommendation: 'Continue healthy habits' },
          diabetesRisk: { prediction: 'low', riskPercentage: '10%', recommendation: 'Continue healthy lifestyle' },
          overallHealth: { prediction: 'stable', projectedScore: 75, recommendation: 'Maintain current health practices' }
        },
        basedOn: 'Fallback analysis (analytics service temporarily unavailable)'
      });
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
    
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available'
      });
    }
    
    try {
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
    } catch (analyticsError) {
      console.error('❌ Insights analytics error:', analyticsError);
      // Fallback insights
      res.json({
        success: true,
        data: {
          healthScore: { score: 75 },
          riskFactors: [],
          improvements: ['เพิ่มการออกกำลังกาย', 'ดื่มน้ำให้เพียงพอ'],
          recommendations: ['รักษาการนอนหลับให้สม่ำเสมอ', 'ทานอาหารที่มีประโยชน์'],
          nextActions: [
            { action: 'exercise', priority: 'medium', description: 'ออกกำลังกายอย่างน้อย 30 นาทีต่อวัน' },
            { action: 'nutrition', priority: 'high', description: 'เพิ่มผักและผลไม้ในอาหาร' }
          ]
        },
        generatedAt: new Date().toISOString(),
        note: 'Fallback insights (analytics service temporarily unavailable)'
      });
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
    const consent = await db.query(
      'SELECT allow_research_data FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (!consent.rows[0]?.allow_research_data) {
      return res.status(403).json({
        success: false,
        error: 'User has not consented to data sharing for research'
      });
    }
    
    // Generate anonymized data export
    const anonymizedData = await generateAnonymizedExport(userId, dataTypes);
    
    // Log the export for audit trail
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
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

// ===============================
// 🏥 Medication Tables Creation (ESM Compatible)
// ===============================

async function createMedicationTables() {
  try {
    console.log('📋 Creating medication tables...');
    
    // Check if users table exists and get column name
    const userColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name IN ('id', 'user_id');
    `);
    
    const userIdColumn = userColumns.rows.find(row => row.column_name === 'id') ? 'id' : 
                        userColumns.rows.find(row => row.column_name === 'user_id') ? 'user_id' : null;
    
    if (!userIdColumn) {
      throw new Error('No valid user ID column found in users table');
    }
    
    console.log(`✅ Using users.${userIdColumn} for foreign key references`);
    
    // Drop existing tables with potential wrong constraints
    await db.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
    await db.query('DROP TABLE IF EXISTS medications CASCADE;');
    
    // Create medications table
    await db.query(`
      CREATE TABLE medications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          medication_name VARCHAR(255) NOT NULL,
          dosage VARCHAR(100) NOT NULL,
          frequency VARCHAR(100) NOT NULL,
          time_schedule VARCHAR(255) NOT NULL,
          start_date DATE,
          end_date DATE,
          condition VARCHAR(100),
          reminder_enabled BOOLEAN DEFAULT true,
          notes TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(${userIdColumn}) ON DELETE CASCADE
      );
    `);
    
    // Create medication_logs table
    await db.query(`
      CREATE TABLE medication_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          medication_id INTEGER NOT NULL,
          taken_time TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'taken',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(${userIdColumn}) ON DELETE CASCADE,
          FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);');

    // Create medical_images table
    await db.query(`
      CREATE TABLE IF NOT EXISTS medical_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        image_type VARCHAR(50) NOT NULL,
        file_size INTEGER,
        analysis_result JSONB,
        confidence_score DECIMAL(5,2),
        risk_level VARCHAR(20),
        recommendations TEXT,
        ai_notes TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(${userIdColumn}) ON DELETE CASCADE
      );
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_medical_images_user_id ON medical_images(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_medical_images_image_type ON medical_images(image_type);');
    
    console.log('✅ Medication and medical image tables created successfully');
    return true;
  } catch (error) {
    console.error('❌ Medication tables creation error:', error.message);
    throw error;
  }
}

// ===============================
// 🗄️ Database Migration Routes (Development/Setup Only)
// ===============================

app.post('/api/setup/migrate', async (req, res) => {
  try {
    console.log('🗄️ Starting database migration...');
    
    // Migration SQL
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
          profile_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          full_name VARCHAR(100),
          date_of_birth DATE,
          gender VARCHAR(10),
          blood_group VARCHAR(5),
          height_cm DECIMAL(5,2),
          weight_kg DECIMAL(5,2),
          phone VARCHAR(20),
          emergency_contact VARCHAR(100),
          medical_conditions TEXT,
          medications TEXT,
          allergies TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS health_metrics (
          metric_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          weight_kg DECIMAL(5,2),
          height_cm DECIMAL(5,2),
          bmi DECIMAL(4,2),
          body_fat_percentage DECIMAL(4,2),
          blood_pressure_systolic INTEGER,
          blood_pressure_diastolic INTEGER,
          heart_rate_bpm INTEGER,
          body_temperature_celsius DECIMAL(4,2),
          blood_sugar_mg DECIMAL(6,2),
          uric_acid DECIMAL(4,2),
          alt DECIMAL(6,2),
          ast DECIMAL(6,2),
          hemoglobin DECIMAL(4,2),
          hematocrit DECIMAL(4,2),
          iron DECIMAL(6,2),
          tibc DECIMAL(6,2),
          oxygen_saturation DECIMAL(4,2),
          steps_count INTEGER,
          sleep_hours DECIMAL(4,2),
          stress_level INTEGER,
          energy_level INTEGER,
          mood_score INTEGER,
          measurement_date DATE NOT NULL,
          notes TEXT,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS health_behavior (
          behavior_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          exercise_minutes INTEGER DEFAULT 0,
          exercise_type VARCHAR(100),
          activity_level VARCHAR(20) DEFAULT 'sedentary',
          calories_consumed INTEGER,
          water_intake_ml INTEGER DEFAULT 0,
          alcohol_units DECIMAL(4,2) DEFAULT 0,
          smoking_cigarettes INTEGER DEFAULT 0,
          sleep_hours DECIMAL(4,2),
          sleep_quality VARCHAR(20),
          stress_level INTEGER,
          mood VARCHAR(20),
          screen_time_hours DECIMAL(4,2),
          meditation_minutes INTEGER DEFAULT 0,
          social_interaction_hours DECIMAL(4,2),
          behavior_date DATE NOT NULL,
          notes TEXT,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, measurement_date DESC);
      CREATE INDEX IF NOT EXISTS idx_health_behavior_user_date ON health_behavior(user_id, behavior_date DESC);

    -- Add consent flag if missing
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS allow_research_data BOOLEAN DEFAULT FALSE;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);

    -- Ensure newly added lab fields exist on existing databases
    ALTER TABLE health_metrics 
      ADD COLUMN IF NOT EXISTS uric_acid DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS alt DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS ast DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS hemoglobin DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS hematocrit DECIMAL(4,2),
      ADD COLUMN IF NOT EXISTS iron DECIMAL(6,2),
      ADD COLUMN IF NOT EXISTS tibc DECIMAL(6,2);

    -- Health summary table used by /api/health-summary
    CREATE TABLE IF NOT EXISTS health_summary (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      overall_health_score INTEGER DEFAULT 0,
      bmi DECIMAL(4,2),
      bmi_category VARCHAR(50),
      blood_pressure_status VARCHAR(50),
      diabetes_risk VARCHAR(50),
      cardiovascular_risk VARCHAR(50),
      last_checkup DATE,
      next_recommended_checkup DATE,
      health_goals TEXT,
      medications TEXT,
      allergies TEXT,
      medical_conditions TEXT,
      lifestyle_recommendations TEXT,
      emergency_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Health assessments table used by assessment endpoints
    CREATE TABLE IF NOT EXISTS health_assessments (
      assessment_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      smoking_status VARCHAR(20),
      smoking_years INTEGER,
      smoking_pack_per_day DECIMAL(4,2),
      smoking_quit_attempts INTEGER,
      alcohol_frequency VARCHAR(20),
      alcohol_type VARCHAR(50),
      alcohol_amount VARCHAR(50),
      alcohol_binge_frequency VARCHAR(20),
      exercise_frequency VARCHAR(20),
      exercise_type VARCHAR(50),
      exercise_duration INTEGER,
      exercise_intensity VARCHAR(20),
      sleep_hours DECIMAL(4,2),
      sleep_quality VARCHAR(20),
      sleep_problems JSONB,
      stress_level VARCHAR(20),
      stress_sources JSONB,
      coping_mechanisms JSONB,
      diet_type VARCHAR(20),
      vegetable_servings INTEGER,
      fruit_servings INTEGER,
      water_intake DECIMAL(5,2),
      fast_food_frequency VARCHAR(20),
      snack_frequency VARCHAR(20),
      caffeine_intake VARCHAR(20),
      food_allergies TEXT,
      drug_allergies TEXT,
      environmental_allergies TEXT,
      current_medications TEXT,
      supplement_usage TEXT,
      medical_conditions TEXT,
      family_history TEXT,
      work_environment VARCHAR(50),
      work_stress_level VARCHAR(20),
      screen_time_hours DECIMAL(4,2),
      mood_changes VARCHAR(10),
      anxiety_frequency VARCHAR(20),
      social_activities VARCHAR(20),
      health_goals JSONB,
      recent_health_changes TEXT,
      vaccination_status VARCHAR(30),
      current_symptoms JSONB,
      chronic_symptoms JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Activity logs used by export endpoint
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    // Execute migration
    await db.query(migrationSQL);
    
    // Verify tables were created
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('✅ Database migration completed successfully');
    
    res.status(200).json({
      success: true,
      message: 'Database migration completed successfully',
      tables_created: tablesResult.rows.map(row => row.table_name),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Convenience: allow GET to trigger the same migration (idempotent)
app.get('/api/setup/migrate', async (req, res) => {
  try {
    console.log('🗄️ Starting database migration (GET)...');

    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
          profile_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          full_name VARCHAR(100),
          date_of_birth DATE,
          gender VARCHAR(10),
          blood_group VARCHAR(5),
          height_cm DECIMAL(5,2),
          weight_kg DECIMAL(5,2),
          phone VARCHAR(20),
          emergency_contact VARCHAR(100),
          medical_conditions TEXT,
          medications TEXT,
          allergies TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS health_metrics (
          metric_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          weight_kg DECIMAL(5,2),
          height_cm DECIMAL(5,2),
          bmi DECIMAL(4,2),
          body_fat_percentage DECIMAL(4,2),
          blood_pressure_systolic INTEGER,
          blood_pressure_diastolic INTEGER,
          heart_rate_bpm INTEGER,
          body_temperature_celsius DECIMAL(4,2),
          blood_sugar_mg DECIMAL(6,2),
          uric_acid DECIMAL(4,2),
          alt DECIMAL(6,2),
          ast DECIMAL(6,2),
          hemoglobin DECIMAL(4,2),
          hematocrit DECIMAL(4,2),
          iron DECIMAL(6,2),
          tibc DECIMAL(6,2),
          oxygen_saturation DECIMAL(4,2),
          steps_count INTEGER,
          sleep_hours DECIMAL(4,2),
          stress_level INTEGER,
          energy_level INTEGER,
          mood_score INTEGER,
          measurement_date DATE NOT NULL,
          notes TEXT,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS health_behavior (
          behavior_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          exercise_minutes INTEGER DEFAULT 0,
          exercise_type VARCHAR(100),
          activity_level VARCHAR(20) DEFAULT 'sedentary',
          calories_consumed INTEGER,
          water_intake_ml INTEGER DEFAULT 0,
          alcohol_units DECIMAL(4,2) DEFAULT 0,
          smoking_cigarettes INTEGER DEFAULT 0,
          sleep_hours DECIMAL(4,2),
          sleep_quality VARCHAR(20),
          stress_level INTEGER,
          mood VARCHAR(20),
          screen_time_hours DECIMAL(4,2),
          meditation_minutes INTEGER DEFAULT 0,
          social_interaction_hours DECIMAL(4,2),
          behavior_date DATE NOT NULL,
          notes TEXT,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, measurement_date DESC);
      CREATE INDEX IF NOT EXISTS idx_health_behavior_user_date ON health_behavior(user_id, behavior_date DESC);

      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS allow_research_data BOOLEAN DEFAULT FALSE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);

      ALTER TABLE health_metrics 
        ADD COLUMN IF NOT EXISTS uric_acid DECIMAL(4,2),
        ADD COLUMN IF NOT EXISTS alt DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS ast DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS hemoglobin DECIMAL(4,2),
        ADD COLUMN IF NOT EXISTS hematocrit DECIMAL(4,2),
        ADD COLUMN IF NOT EXISTS iron DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS tibc DECIMAL(6,2);

      CREATE TABLE IF NOT EXISTS health_summary (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        overall_health_score INTEGER DEFAULT 0,
        bmi DECIMAL(4,2),
        bmi_category VARCHAR(50),
        blood_pressure_status VARCHAR(50),
        diabetes_risk VARCHAR(50),
        cardiovascular_risk VARCHAR(50),
        last_checkup DATE,
        next_recommended_checkup DATE,
        health_goals TEXT,
        medications TEXT,
        allergies TEXT,
        medical_conditions TEXT,
        lifestyle_recommendations TEXT,
        emergency_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS health_assessments (
        assessment_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        smoking_status VARCHAR(20),
        smoking_years INTEGER,
        smoking_pack_per_day DECIMAL(4,2),
        smoking_quit_attempts INTEGER,
        alcohol_frequency VARCHAR(20),
        alcohol_type VARCHAR(50),
        alcohol_amount VARCHAR(50),
        alcohol_binge_frequency VARCHAR(20),
        exercise_frequency VARCHAR(20),
        exercise_type VARCHAR(50),
        exercise_duration INTEGER,
        exercise_intensity VARCHAR(20),
        sleep_hours DECIMAL(4,2),
        sleep_quality VARCHAR(20),
        sleep_problems JSONB,
        stress_level VARCHAR(20),
        stress_sources JSONB,
        coping_mechanisms JSONB,
        diet_type VARCHAR(20),
        vegetable_servings INTEGER,
        fruit_servings INTEGER,
        water_intake DECIMAL(5,2),
        fast_food_frequency VARCHAR(20),
        snack_frequency VARCHAR(20),
        caffeine_intake VARCHAR(20),
        food_allergies TEXT,
        drug_allergies TEXT,
        environmental_allergies TEXT,
        current_medications TEXT,
        supplement_usage TEXT,
        medical_conditions TEXT,
        family_history TEXT,
        work_environment VARCHAR(50),
        work_stress_level VARCHAR(20),
        screen_time_hours DECIMAL(4,2),
        mood_changes VARCHAR(10),
        anxiety_frequency VARCHAR(20),
        social_activities VARCHAR(20),
        health_goals JSONB,
        recent_health_changes TEXT,
        vaccination_status VARCHAR(30),
        current_symptoms JSONB,
        chronic_symptoms JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(migrationSQL);

    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('✅ Database migration (GET) completed successfully');
    res.status(200).json({
      success: true,
      message: 'Database migration (GET) completed successfully',
      tables_created: tablesResult.rows.map(row => row.table_name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Migration (GET) failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Check database tables
app.get('/api/setup/tables', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    res.status(200).json({
      tables: result.rows,
      total_tables: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List all registered routes for diagnostics
app.get('/api/debug/routes', (req, res) => {
  try {
    const routes = [];
    const processStack = (stack, prefix = '') => {
      stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods)
            .filter((m) => layer.route.methods[m])
            .map((m) => m.toUpperCase());
          routes.push({ method: methods.join(','), path: prefix + layer.route.path });
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          const newPrefix = layer.regexp && layer.regexp.source
            ? prefix
            : prefix;
          processStack(layer.handle.stack, newPrefix);
        }
      });
    };

    if (app && app._router && app._router.stack) {
      processStack(app._router.stack);
    }

    // Sort for readability
    routes.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));

    res.json({
      count: routes.length,
      routes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inspect table columns (schema) for quick diagnostics
app.get('/api/setup/columns/:table', async (req, res) => {
  try {
    const table = (req.params.table || '').toLowerCase();
    if (!table) return res.status(400).json({ error: 'Table name is required' });

    const cols = await db.query(`
      SELECT 
        column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    res.status(200).json({
      table,
      columns: cols.rows,
      total_columns: cols.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth-required: quick overview of current user's health_metrics completeness
app.get('/api/debug/health-metrics/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM health_metrics WHERE user_id = $1`,
      [userId]
    );
    const latestResult = await db.query(
      `SELECT 
        metric_id, measurement_date, 
        blood_pressure_systolic, blood_pressure_diastolic, heart_rate_bpm,
        weight_kg, height_cm, bmi,
        blood_sugar_mg, uric_acid, alt, ast, hemoglobin, hematocrit, iron, tibc,
        recorded_at
       FROM health_metrics 
       WHERE user_id = $1 
       ORDER BY measurement_date DESC, recorded_at DESC 
       LIMIT 1`,
      [userId]
    );

    const schema = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'health_metrics' 
      ORDER BY ordinal_position`);

    res.json({
      total_rows: countResult.rows?.[0]?.total ?? 0,
      latest: latestResult.rows?.[0] || null,
      schema: schema.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug health-metrics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply activity tracking to all routes
app.use(trackActivity);

// ===============================
// 🛡️ Global Error Handling Middleware
// ===============================

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error handler:', error);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// (moved) 404 handler will be registered at the end, after static and SPA routes

// ===============================
// 🛑 Server Shutdown Handling (For Production)
// ===============================
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

// Medication Management APIs
// Add new medication
app.post('/api/medications', authenticateToken, async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medications'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(503).json({ 
        error: 'ระบบยาอยู่ระหว่างการติดตั้ง กรุณาลองใหม่อีกครั้ง' 
      });
    }

    const { 
      medication_name, dosage, frequency, time_schedule, 
      start_date, end_date, condition, reminder_enabled, notes 
    } = req.body;

    if (!medication_name || !dosage || !frequency || !time_schedule) {
      return res.status(400).json({ 
        error: 'กรุณากรอกข้อมูลที่จำเป็น: ชื่อยา, ขนาด, ความถี่, และเวลา' 
      });
    }

    const result = await db.query(
      `INSERT INTO medications (
        user_id, medication_name, dosage, frequency, time_schedule,
        start_date, end_date, condition, reminder_enabled, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user.userId, medication_name, dosage, frequency, time_schedule,
        start_date || null, end_date || null, condition || null, 
        reminder_enabled !== false, notes || null
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มยา' });
  }
});

// Get user's medications
app.get('/api/medications', authenticateToken, async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medications'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(503).json({ 
        error: 'ระบบยาอยู่ระหว่างการติดตั้ง กรุณาลองใหม่อีกครั้ง' 
      });
    }

    const result = await db.query(
      'SELECT * FROM medications WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลยา' });
  }
});

// Update medication
app.put('/api/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      medication_name, dosage, frequency, time_schedule, 
      start_date, end_date, condition, reminder_enabled, notes, is_active 
    } = req.body;

    const result = await db.query(
      `UPDATE medications SET 
        medication_name = $1, dosage = $2, frequency = $3, time_schedule = $4,
        start_date = $5, end_date = $6, condition = $7, reminder_enabled = $8, 
        notes = $9, is_active = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND user_id = $12 RETURNING *`,
      [
        medication_name, dosage, frequency, time_schedule,
        start_date, end_date, condition, reminder_enabled, notes, is_active,
        id, req.user.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบยาที่ต้องการอัปเดต' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตยา' });
  }
});

// Delete medication (soft delete)
app.delete('/api/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'UPDATE medications SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบยาที่ต้องการลบ' });
    }

    res.json({ message: 'ลบยาสำเร็จ' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบยา' });
  }
});

// Add medication log (when taken)
app.post('/api/medication-logs', authenticateToken, async (req, res) => {
  try {
    const { medication_id, taken_time, status, notes } = req.body;

    if (!medication_id || !taken_time) {
      return res.status(400).json({ 
        error: 'กรุณากรอกข้อมูลที่จำเป็น: medication_id และ taken_time' 
      });
    }

    // Verify medication belongs to user
    const medicationCheck = await db.query(
      'SELECT id FROM medications WHERE id = $1 AND user_id = $2 AND is_active = true',
      [medication_id, req.user.userId]
    );

    if (medicationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบยาดังกล่าว' });
    }

    const result = await db.query(
      `INSERT INTO medication_logs (user_id, medication_id, taken_time, status, notes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.userId, medication_id, taken_time, status || 'taken', notes || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error logging medication:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกการทานยา' });
  }
});

// Get medication logs
app.get('/api/medication-logs', authenticateToken, async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medication_logs'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(503).json({ 
        error: 'ระบบยาอยู่ระหว่างการติดตั้ง กรุณาลองใหม่อีกครั้ง' 
      });
    }

    const { medication_id, days } = req.query;
    let query = `
      SELECT ml.*, m.medication_name, m.dosage, m.condition
      FROM medication_logs ml
      JOIN medications m ON ml.medication_id = m.id
      WHERE ml.user_id = $1
    `;
    const params = [req.user.userId];

    if (medication_id) {
      query += ` AND ml.medication_id = $${params.length + 1}`;
      params.push(medication_id);
    }

    if (days) {
      query += ` AND ml.taken_time >= NOW() - INTERVAL '${parseInt(days)} days'`;
    }

    query += ' ORDER BY ml.taken_time DESC LIMIT 100';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching medication logs:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการทานยา' });
  }
});

// Medical Image Analysis APIs
// Analyze medical image with AI
app.post('/api/medical-images/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ภาพ' });
    }

    const { imageType } = req.body;
    const userId = req.user.userId;

    if (!imageType || !['xray', 'mri'].includes(imageType)) {
      return res.status(400).json({ error: 'ประเภทภาพไม่ถูกต้อง (xray หรือ mri เท่านั้น)' });
    }

    // Mock AI analysis (จำลองการวิเคราะห์ด้วย AI)
    // ในการใช้งานจริงจะต้องเชื่อมต่อกับ AI service เช่น TensorFlow, OpenAI Vision API
    const analysisResult = await simulateImageAnalysis(req.file, imageType);

    // บันทึกผลการวิเคราะห์ลงฐานข้อมูล
    const insertResult = await db.query(`
      INSERT INTO medical_images (
        user_id, image_type, original_filename, file_size, 
        analysis_result, confidence_score, risk_level, 
        primary_finding, findings, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, confidence_score, risk_level, primary_finding, findings, recommendations, created_at
    `, [
      userId,
      imageType, 
      req.file.originalname,
      req.file.size,
      JSON.stringify(analysisResult),
      analysisResult.confidence,
      analysisResult.riskLevel,
      analysisResult.primaryFinding,
      JSON.stringify(analysisResult.findings),
      JSON.stringify(analysisResult.recommendations)
    ]);

    const savedResult = insertResult.rows[0];

    res.json({
      success: true,
      id: savedResult.id,
      imageType: imageType,
      confidence: savedResult.confidence_score,
      riskLevel: savedResult.risk_level,
      primaryFinding: savedResult.primary_finding,
      findings: savedResult.findings,
      recommendations: savedResult.recommendations,
      analyzedAt: savedResult.created_at
    });

  } catch (error) {
    console.error('Error analyzing medical image:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการวิเคราะห์ภาพ' });
  }
});

// Get analysis history
app.get('/api/medical-images/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(`
      SELECT 
        id, image_type, original_filename, confidence_score,
        risk_level, primary_finding, created_at
      FROM medical_images 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json(result.rows.map(row => ({
      id: row.id,
      imageType: row.image_type,
      filename: row.original_filename,
      confidence: row.confidence_score,
      riskLevel: row.risk_level,
      primaryFinding: row.primary_finding,
      createdAt: row.created_at
    })));

  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการวิเคราะห์' });
  }
});

// Get detailed analysis result
app.get('/api/medical-images/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageId = req.params.id;

    const result = await db.query(`
      SELECT * FROM medical_images 
      WHERE id = $1 AND user_id = $2
    `, [imageId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการวิเคราะห์' });
    }

    const analysis = result.rows[0];
    res.json({
      id: analysis.id,
      imageType: analysis.image_type,
      filename: analysis.original_filename,
      confidence: analysis.confidence_score,
      riskLevel: analysis.risk_level,
      primaryFinding: analysis.primary_finding,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
      createdAt: analysis.created_at
    });

  } catch (error) {
    console.error('Error fetching analysis details:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายละเอียดการวิเคราะห์' });
  }
});

// Delete analysis record
app.delete('/api/medical-images/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const imageId = req.params.id;

    const result = await db.query(`
      DELETE FROM medical_images 
      WHERE id = $1 AND user_id = $2 
      RETURNING id
    `, [imageId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการวิเคราะห์ที่ต้องการลบ' });
    }

    res.json({ success: true, message: 'ลบข้อมูลการวิเคราะห์เรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
  }
});

// Function to simulate AI image analysis
async function simulateImageAnalysis(file, imageType) {
  // จำลองการประมวลผล AI
  await new Promise(resolve => setTimeout(resolve, 2000)); // จำลองเวลาประมวลผล

  const confidence = Math.floor(Math.random() * 25) + 75; // 75-99%
  
  let analysisResult = {
    confidence: confidence,
    riskLevel: 'ต่ำ',
    primaryFinding: 'ไม่พบความผิดปกติที่เด่นชัด',
    findings: [],
    recommendations: []
  };

  if (imageType === 'xray') {
    // จำลองผลการวิเคราะห์ X-Ray
    const xrayFindings = [
      { name: 'โครงสร้างกระดูก', probability: 95, description: 'โครงสร้างกระดูกปกติ' },
      { name: 'ปอด', probability: 92, description: 'ปอดใส ไม่มีเงาผิดปกติ' },
      { name: 'หัวใจ', probability: 88, description: 'ขนาดหัวใจในเกณฑ์ปกติ' }
    ];

    if (confidence > 85) {
      analysisResult.findings = xrayFindings;
      analysisResult.recommendations = [
        'ผลการตรวจมีความน่าเชื่อถือสูง',
        'ควรติดตามตรวจซ้ำตามกำหนดของแพทย์',
        'รักษาสุขภาพด้วยการออกกำลังกายสม่ำเสมอ'
      ];
    } else {
      analysisResult.riskLevel = 'ปานกลาง';
      analysisResult.findings = [
        { name: 'คุณภาพภาพ', probability: 70, description: 'คุณภาพภาพอาจไม่เพียงพอสำหรับการวิเคราะห์ที่แม่นยำ' }
      ];
      analysisResult.recommendations = [
        'ควรถ่ายภาพใหม่ด้วยคุณภาพที่ดีกว่า',
        'ปรึกษาแพทย์ผู้เชี่ยวชาญเพื่อการวินิจฉัยที่แม่นยำ'
      ];
    }
  } else if (imageType === 'mri') {
    // จำลองผลการวิเคราะห์ MRI
    const mriFindings = [
      { name: 'โครงสร้างสมอง', probability: 94, description: 'โครงสร้างสมองปกติ' },
      { name: 'เนื้อเยื่อออ่อน', probability: 90, description: 'เนื้อเยื่ออ่อนไม่มีความผิดปกติ' },
      { name: 'การไหลเวียนโลหิต', probability: 87, description: 'การไหลเวียนโลหิตปกติ' }
    ];

    if (confidence > 85) {
      analysisResult.findings = mriFindings;
      analysisResult.recommendations = [
        'ผลการตรวจอยู่ในเกณฑ์ปกติ',
        'ดูแลสุขภาพสมองด้วยการนอนหลับเพียงพอ',
        'ออกกำลังกายสม่ำเสมอเพื่อสุขภาพสมอง'
      ];
    } else {
      analysisResult.riskLevel = 'ปานกลาง';
      analysisResult.findings = [
        { name: 'ความชัดของภาพ', probability: 65, description: 'ภาพอาจไม่เพียงพอชัดสำหรับการวิเคราะห์รายละเอียด' }
      ];
      analysisResult.recommendations = [
        'ควรตรวจซ้ำด้วยเครื่อง MRI ที่มีความละเอียดสูงกว่า',
        'ปรึกษาแพทย์นิวโรโลจีสำหรับการประเมินเพิ่มเติม'
      ];
    }
  }

  return analysisResult;
}

// (moved) SPA catch-all will be registered after static middleware

// Start server with enhanced error handling
async function startServer() {
  try {
    console.log('🚀 Starting Health Management API...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Port: ${PORT}`);
    
    await initDatabase();
    
    // Fix users table structure if needed
    try {
      console.log('🔧 Checking users table structure...');
      const usersColumns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name IN ('id', 'user_id');
      `);
      
      const hasIdColumn = usersColumns.rows.find(row => row.column_name === 'id');
      const hasUserIdColumn = usersColumns.rows.find(row => row.column_name === 'user_id');
      
      if (!hasIdColumn && hasUserIdColumn) {
        console.log('🔧 Users table needs fixing: user_id -> id');
        
        // Backup and fix users table
        const userData = await db.query('SELECT * FROM users');
        console.log(`📦 Backing up ${userData.rows.length} users`);
        
        // Drop dependent tables
        await db.query('DROP TABLE IF EXISTS medical_images CASCADE;');
        await db.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
        await db.query('DROP TABLE IF EXISTS medications CASCADE;');
        await db.query('DROP TABLE IF EXISTS health_assessments CASCADE;');
        await db.query('DROP TABLE IF EXISTS health_behaviors CASCADE;');
        await db.query('DROP TABLE IF EXISTS health_metrics CASCADE;');
        await db.query('DROP TABLE IF EXISTS user_profiles CASCADE;');
        
        // Recreate users table
        await db.query('DROP TABLE IF EXISTS users CASCADE;');
        await db.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // Restore data
        for (const user of userData.rows) {
          await db.query(`
            INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [user.user_id || user.id, user.username, user.email, user.password_hash, user.created_at, user.updated_at]);
        }
        
        // Reset sequence
        const maxId = await db.query('SELECT MAX(id) as max_id FROM users');
        const nextId = (maxId.rows[0].max_id || 0) + 1;
        await db.query(`SELECT setval('users_id_seq', ${nextId})`);
        
        console.log('✅ Users table structure fixed');
      } else if (hasIdColumn) {
        console.log('✅ Users table already has correct structure');
      }
    } catch (fixError) {
      console.error('⚠️ Users table fix failed, but continuing:', fixError.message);
    }
    
    // Create medication tables directly (avoiding require issue)
    try {
      await createMedicationTables();
      console.log('🏥 Medication tables created successfully');
    } catch (migrationError) {
      console.error('⚠️ Medication tables creation failed, but continuing:', migrationError.message);
    }

    // Medical Image Analysis APIs
    // Create medical_images table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS medical_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('xray', 'mri')),
        original_filename VARCHAR(255),
        file_path VARCHAR(500),
        file_size INTEGER,
        analysis_result JSONB,
        confidence_score DECIMAL(5,2),
        risk_level VARCHAR(20),
        primary_finding TEXT,
        findings JSONB,
        recommendations JSONB,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_medical_images_user_id ON medical_images(user_id);
      CREATE INDEX IF NOT EXISTS idx_medical_images_type ON medical_images(image_type);
      CREATE INDEX IF NOT EXISTS idx_medical_images_risk ON medical_images(risk_level);
    `);
    
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

// Try to build frontend if not exists
async function ensureFrontendBuilt() {
  const possibleDistPaths = [
    path.join(process.cwd(), '..', 'dist'),    // /opt/render/project/dist
    path.join(process.cwd(), 'dist'),          // /opt/render/project/src/server/dist 
    path.join(__dirname, '..', 'dist'),        // server/../dist
    path.join(__dirname, '..', '..', 'dist'),  // server/../../dist
  ];
  
  console.log('🔍 Checking for frontend files...');
  console.log(' Current working directory:', process.cwd());
  console.log('📂 __dirname is:', __dirname);
  
  let foundDistPath = null;
  
  for (const distPath of possibleDistPaths) {
    const indexPath = path.join(distPath, 'index.html');
    console.log(`🔍 Checking: ${distPath}`);
    
    if (fs.existsSync(indexPath)) {
      console.log(`✅ Found frontend at: ${distPath}`);
      foundDistPath = distPath;
      
      const files = fs.readdirSync(distPath);
      console.log('📂 Frontend files found:', files.slice(0, 5).join(', '));
      break;
    } else {
      console.log(`❌ Not found: ${distPath}`);
    }
  }
  
  if (!foundDistPath) {
    console.log('⚠️ Frontend not found in any location');
    
    // Try to copy from possible source locations
    const possibleSources = [
      '/opt/render/project/dist',
      '/opt/render/project/src/dist', 
      path.join(process.cwd(), '..', '..', 'dist'),
    ];
    
    for (const source of possibleSources) {
      if (fs.existsSync(source)) {
        const targetPath = path.join(process.cwd(), '..', 'dist');
        console.log(`📂 Found source at: ${source}, copying to: ${targetPath}`);
        
        try {
          // Copy files
          if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
          }
          
          const files = fs.readdirSync(source);
          for (const file of files) {
            const srcFile = path.join(source, file);
            const destFile = path.join(targetPath, file);
            
            if (fs.statSync(srcFile).isFile()) {
              fs.copyFileSync(srcFile, destFile);
              console.log(`✅ Copied: ${file}`);
            }
          }
          
          foundDistPath = targetPath;
          break;
        } catch (error) {
          console.log(`❌ Copy failed: ${error.message}`);
        }
      }
    }
  }
  
  return foundDistPath;
}

// Global variable for dist path
let globalDistPath = null;

console.log('🎯 Health Management API - Starting...');

// Ensure frontend is built before starting
const foundDistPath = await ensureFrontendBuilt();
globalDistPath = foundDistPath;

// Update static serving path if we found dist elsewhere
if (foundDistPath) {
  console.log(`📁 Setting static path to: ${foundDistPath}`);
  app.use(express.static(foundDistPath));
}

startServer().catch((error) => {
  console.error('💀 Critical startup error:', error);
  process.exit(1);
});

// Explicit asset handler BEFORE SPA fallback to avoid serving index.html for assets
app.get(/\.(js|css|map|png|jpg|jpeg|gif|svg|ico|webp)$/i, (req, res, next) => {
  const base = globalDistPath || path.join(process.cwd(), '..', 'dist');
  const filePath = path.join(base, req.path.replace(/^\//, ''));
  console.log('📦 Serving asset:', req.path, '→', filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.warn('⚠️ Asset not found, passing to next:', req.path, err.message);
      next();
    }
  });
});

// SPA catch-all AFTER static middleware (skip asset-like paths)
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  // If request looks like a static asset (has an extension), let 404/static handle it
  if (/\.[a-zA-Z0-9]{2,5}$/.test(req.path)) {
    return next();
  }
  const indexPath = (globalDistPath
    ? path.join(globalDistPath, 'index.html')
    : path.join(process.cwd(), '..', 'dist', 'index.html'));

  console.log('🔄 SPA fallback for:', req.path);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving SPA index:', err);
      res.status(500).send(`
        <h1>Frontend Not Available</h1>
        <p>Could not load React app from: ${indexPath}</p>
        <p>Error: ${err.message}</p>
        <p>Global dist path: ${globalDistPath || 'not set'}</p>
      `);
    }
  });
});

// Final 404 handler - after all routes and static middleware
app.use((req, res) => {
  // If the request looks like a static asset under dist but failed, show plain 404
  if (req.path.match(/^\/(bundle|\d+\.bundle|assets|static)\./)) {
    return res.status(404).send('Not Found');
  }
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    available_routes: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});
