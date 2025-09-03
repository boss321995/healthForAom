import pkg from 'pg';
const { Client } = pkg;

async function createMedicationTables() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'health_management',
    user: 'postgres',
    password: 'password'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
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
    console.log('✅ Medications table created');
    
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
    console.log('✅ Medication logs table created');
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ Indexes created');
    
    console.log('🎉 All medication tables created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createMedicationTables();
