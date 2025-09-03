const { Client } = require('pg');

async function runMigration() {
  // Use environment variables or fallback to default
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database for migration');
    
    // Create medications table
    const medicationsSQL = `
      CREATE TABLE IF NOT EXISTS medications (
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
    console.log('✅ Medications table created/verified');
    
    // Create medication_logs table
    const logsSQL = `
      CREATE TABLE IF NOT EXISTS medication_logs (
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
    console.log('✅ Medication logs table created/verified');
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ Indexes created/verified');
    
    console.log('🎉 Medication tables migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Export for use in main app
module.exports = runMigration;

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
