const { Client } = require('pg');

function buildClient() {
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const hasDbVars = !!(
    process.env.DB_HOST || process.env.DB_NAME || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_PORT
  );

  if (hasDbVars) {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'health_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
    console.log(`🗄️ [fix-migration] Using DB_* envs (host=${config.host}, db=${config.database}, user=${config.user}, port=${config.port}, ssl=${!!config.ssl})`);
    return new Client(config);
  }

  if (process.env.DATABASE_URL) {
    console.log('🗄️ [fix-migration] Using DATABASE_URL');
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });
  }

  // Fallback dev defaults
  console.log('🗄️ [fix-migration] Using default dev config');
  return new Client({
    host: 'localhost',
    database: 'health_management',
    user: 'postgres',
    password: '',
    port: 5432,
    ssl: false,
  });
}

async function fixMedicationTables() {
  const client = buildClient();

  try {
    await client.connect();
    console.log('🔗 Connected to database for medication tables fix');
    
    // Check if users table exists first
    const usersExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersExists.rows[0].exists) {
      console.log('❌ Users table not found - cannot proceed');
      return false;
    }
    console.log('✅ Users table verified');

    // Check what column users table actually has
    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name IN ('id', 'user_id');
    `);
    
    const userIdColumn = userColumns.rows.find(row => row.column_name === 'id') ? 'id' : 
                        userColumns.rows.find(row => row.column_name === 'user_id') ? 'user_id' : null;
    
    if (!userIdColumn) {
      console.log('❌ No valid user ID column found in users table');
      return false;
    }
    
    console.log(`✅ Found users.${userIdColumn} column`);
    
    // Drop existing medication tables if they have wrong foreign key constraints
    console.log('🗑️ Dropping existing medication tables with wrong constraints...');
    await client.query('DROP TABLE IF EXISTS medication_logs CASCADE;');
    await client.query('DROP TABLE IF EXISTS medications CASCADE;');
    console.log('✅ Old tables dropped');
    
    // Create medications table with correct foreign key
    console.log('📋 Creating medications table with correct foreign key...');
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
          FOREIGN KEY (user_id) REFERENCES users(${userIdColumn}) ON DELETE CASCADE
      );`;
    
    await client.query(medicationsSQL);
    console.log('✅ Medications table created successfully');
    
    // Create medication_logs table with correct foreign key
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
          FOREIGN KEY (user_id) REFERENCES users(${userIdColumn}) ON DELETE CASCADE,
          FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
      );`;
    
    await client.query(logsSQL);
    console.log('✅ Medication logs table created successfully');
    
    // Create indexes for better performance
    console.log('🔍 Creating indexes for better performance...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ All indexes created successfully');
    
    console.log('🎉 Medication tables fix completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Fix error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Export for use in main app
module.exports = fixMedicationTables;

// Run if called directly
if (require.main === module) {
  fixMedicationTables()
    .then(() => {
      console.log('Fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}
