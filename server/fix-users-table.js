// Fix Users Table Script
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'health_management',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

console.log('🔧 Fixing Users Table Structure');
const db = new Pool(dbConfig);

async function fixUsersTable() {
  try {
    console.log('🔍 Checking current users table structure...');
    
    // Check current users table structure
    const usersColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current users table columns:');
    usersColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if we need to fix the primary key
    const hasIdColumn = usersColumns.rows.find(col => col.column_name === 'id');
    const hasUserIdColumn = usersColumns.rows.find(col => col.column_name === 'user_id');
    
    if (hasIdColumn) {
      console.log('✅ Users table already has `id` column, no fix needed');
      return;
    }
    
    if (hasUserIdColumn) {
      console.log('🔧 Users table has `user_id` column, will rename to `id`');
      
      // Backup current data
      console.log('📦 Backing up users data...');
      const userData = await db.query('SELECT * FROM users');
      console.log(`✅ Backed up ${userData.rows.length} users`);
      
      // Drop all dependent tables first
      console.log('🗑️ Dropping dependent tables...');
      await db.query('DROP TABLE IF EXISTS medical_images CASCADE;');
      await db.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
      await db.query('DROP TABLE IF EXISTS medications CASCADE;');
      await db.query('DROP TABLE IF EXISTS health_assessments CASCADE;');
      await db.query('DROP TABLE IF EXISTS health_behaviors CASCADE;');
      await db.query('DROP TABLE IF EXISTS health_metrics CASCADE;');
      await db.query('DROP TABLE IF EXISTS user_profiles CASCADE;');
      
      // Drop and recreate users table with correct structure
      console.log('🔄 Recreating users table with `id` column...');
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
      
      // Restore data with new ID structure
      console.log('📥 Restoring users data...');
      for (const user of userData.rows) {
        await db.query(`
          INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.user_id, user.username, user.email, user.password_hash, user.created_at, user.updated_at]);
      }
      
      // Reset sequence to prevent conflicts
      const maxId = await db.query('SELECT MAX(id) as max_id FROM users');
      const nextId = (maxId.rows[0].max_id || 0) + 1;
      await db.query(`SELECT setval('users_id_seq', ${nextId})`);
      
      console.log('✅ Users table fixed successfully');
      console.log('📝 Note: All dependent tables were recreated and will be populated when server starts');
    }
    
  } catch (error) {
    console.error('❌ Fix error:', error.message);
    throw error;
  } finally {
    await db.end();
  }
}

fixUsersTable().catch(console.error);
