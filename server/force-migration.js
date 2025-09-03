const { Client } = require('pg');

async function forceMigration() {
  console.log('🔧 Force Migration: Creating medication tables immediately');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Drop existing tables if they exist (force recreation)
    console.log('🧹 Cleaning up existing tables...');
    await client.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
    await client.query('DROP TABLE IF EXISTS medications CASCADE;');
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
    
    await client.query(medicationsSQL);
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
    
    await client.query(logsSQL);
    console.log('✅ Medication logs table created');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query('CREATE INDEX idx_medications_user_id ON medications(user_id);');
    await client.query('CREATE INDEX idx_medications_is_active ON medications(is_active);');
    await client.query('CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id);');
    await client.query('CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ All indexes created');
    
    console.log('🎉 Force migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Force migration failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  forceMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = forceMigration;
