// Database Structure Debug Script
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

console.log('🔍 Database Structure Debug');
console.log('Config:', { ...dbConfig, password: '***' });

const db = new Pool(dbConfig);

async function debugDatabase() {
  try {
    // Check if users table exists and its structure
    console.log('\n📋 Checking users table structure...');
    const usersColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    if (usersColumns.rows.length === 0) {
      console.log('❌ Users table does not exist');
    } else {
      console.log('✅ Users table structure:');
      usersColumns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default || ''}`);
      });
    }
    
    // Check all tables and their foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const constraints = await db.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'users';
    `);
    
    if (constraints.rows.length === 0) {
      console.log('✅ No foreign key constraints to users table found');
    } else {
      console.log('📊 Foreign key constraints to users table:');
      constraints.rows.forEach(constraint => {
        console.log(`  ${constraint.table_name}.${constraint.column_name} -> users.${constraint.foreign_column_name}`);
      });
    }
    
    // List all tables
    console.log('\n📋 All tables in database:');
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await db.end();
  }
}

debugDatabase().catch(console.error);
