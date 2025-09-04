const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://boss321995.github.io',
  credentials: true
}));
app.use(express.json());

// Database connection
let db;
if (process.env.NODE_ENV === 'production') {
  // Production: Use DATABASE_URL from Render
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Development: Use local settings
  db = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'health_management',
    user: 'postgres',
    password: 'password',
  });
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authenticate token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Force migration function
async function forceMigration() {
  console.log('🔧 Force Migration: Creating medication tables immediately');
  
  try {
    // Check if users table exists first
    const usersCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersCheck.rows[0].exists) {
      console.log('❌ Users table not found - skipping medication migration');
      return false;
    }
    
    // Drop existing tables if they exist (force recreation)
    console.log('🧹 Cleaning up existing medication tables...');
    await db.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
    await db.query('DROP TABLE IF EXISTS medications CASCADE;');
    console.log('✅ Cleanup complete');
    
    // Create medications table
    console.log('📋 Creating medications table...');
    const medicationsSQL = `
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
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );`;
    
    await db.query(medicationsSQL);
    console.log('✅ Medications table created');
    
    // Create medication_logs table
    console.log('📋 Creating medication_logs table...');
    const logsSQL = `
      CREATE TABLE medication_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          medication_id INTEGER NOT NULL,
          taken_time TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'taken',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
      );`;
    
    await db.query(logsSQL);
    console.log('✅ Medication logs table created');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await db.query('CREATE INDEX idx_medications_user_id ON medications(user_id);');
    await db.query('CREATE INDEX idx_medications_is_active ON medications(is_active);');
    await db.query('CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id);');
    await db.query('CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ All indexes created');
    
    console.log('🎉 Force migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Force migration failed:', error.message);
    return false;
  }
}

// Medication APIs with table checks
app.get('/api/medications', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Medications API called by user:', req.user.userId);
    
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medications'
      );
    `);
    
    console.log('🔍 Medications table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Medications table not found, returning 503');
      return res.status(503).json({ 
        error: 'ระบบยาอยู่ระหว่างการติดตั้ง กรุณาลองใหม่อีกครั้ง' 
      });
    }

    const result = await db.query(
      'SELECT * FROM medications WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [req.user.userId]
    );
    
    console.log('✅ Medications query successful, found:', result.rows.length, 'items');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error in medications API:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลยา' });
  }
});

app.get('/api/medication-logs', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Medication logs API called by user:', req.user.userId);
    
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medication_logs'
      );
    `);
    
    console.log('🔍 Medication logs table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Medication logs table not found, returning 503');
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
    console.log('✅ Medication logs query successful, found:', result.rows.length, 'items');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error in medication logs API:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการทานยา' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'health-management-lite'
  });
});

// Catch-all for missing endpoints
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found', 
    method: req.method, 
    path: req.originalUrl,
    available_endpoints: ['/api/medications', '/api/medication-logs', '/health']
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Health Management API (Lite Version)...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🗄️ Database URL: ${process.env.DATABASE_URL ? 'Found' : 'Missing'}`);
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is missing!');
      process.exit(1);
    }
    
    // Test database connection with timeout
    console.log('🔌 Testing database connection...');
    
    const connectionTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );
    
    const dbTest = await Promise.race([
      db.query('SELECT NOW() as current_time, version() as db_version'),
      connectionTimeout
    ]);
    
    console.log('✅ Database connected:', dbTest.rows[0].current_time);
    console.log('📊 Database version:', dbTest.rows[0].db_version.substring(0, 50) + '...');
    
    // Run force migration
    console.log('🔧 Running force migration...');
    const migrationSuccess = await forceMigration();
    
    if (migrationSuccess) {
      console.log('✅ Medication tables ready!');
    } else {
      console.log('⚠️ Medication migration skipped or failed');
    }
    
    // Test medication table access
    try {
      const testQuery = await db.query("SELECT 1 FROM medications LIMIT 1");
      console.log('✅ Medications table accessible');
    } catch (testError) {
      console.log('❌ Medications table test failed:', testError.message);
    }
    
    app.listen(PORT, () => {
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}`);
      console.log('📋 Available endpoints:');
      console.log('  - GET /api/medications');
      console.log('  - GET /api/medication-logs');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

startServer();
