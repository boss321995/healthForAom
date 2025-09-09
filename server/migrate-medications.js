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
    console.log(`🗄️ [migration] Using DB_* envs (host=${config.host}, db=${config.database}, user=${config.user}, port=${config.port}, ssl=${!!config.ssl})`);
    return new Client(config);
  }

  if (process.env.DATABASE_URL) {
    console.log('🗄️ [migration] Using DATABASE_URL');
    return new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
    });
  }

  // Fallback dev defaults
  console.log('🗄️ [migration] Using default dev config');
  return new Client({
    host: 'localhost',
    database: 'health_management',
    user: 'postgres',
    password: '',
    port: 5432,
    ssl: false,
  });
}

async function runMigration() {
  // Use environment variables or fallback to default
  const client = buildClient();

  try {
    await client.connect();
  console.log('🔗 Connected to database for medication tables migration');
    console.log('🚀 Starting medication tables migration process...');
    
    // Check if users table exists first
    const usersExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersExists.rows[0].exists) {
      console.log('❌ Users table not found - skipping medication migration');
      return false;
    }
    console.log('✅ Users table verified');
    
    // Check if medications table exists
    const medicationsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medications'
      );
    `);
    
    if (!medicationsExists.rows[0].exists) {
      console.log('📋 Creating medications table...');
      // Create medications table
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`;
      
      await client.query(medicationsSQL);
      console.log('✅ Medications table created successfully');
    } else {
      console.log('✅ Medications table already exists');
    }
    
    // Check if medication_logs table exists
    const logsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'medication_logs'
      );
    `);
    
    if (!logsExists.rows[0].exists) {
      console.log('📋 Creating medication_logs table...');
      // Create medication_logs table
      const logsSQL = `
        CREATE TABLE medication_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            medication_id INTEGER NOT NULL,
            taken_time TIMESTAMP NOT NULL,
            status VARCHAR(50) DEFAULT 'taken',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
        );`;
      
      await client.query(logsSQL);
      console.log('✅ Medication logs table created successfully');
    } else {
      console.log('✅ Medication logs table already exists');
    }
    
    // Create indexes for better performance
    console.log('🔍 Creating indexes for better performance...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);');
    console.log('✅ All indexes created successfully');
    
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
