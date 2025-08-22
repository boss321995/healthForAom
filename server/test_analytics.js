const mysql = require('mysql2/promise');
const HealthAnalytics = require('./healthAnalytics.js');

async function testAnalytics() {
  console.log('🧪 Testing HealthAnalytics...');
  
  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'health_management'
    });

    // Create HealthAnalytics instance
    const analytics = new HealthAnalytics(connection);
    
    // Test with user ID 1 (assuming exists)
    console.log('📊 Testing analyzeHealthTrends...');
    const result = await analytics.analyzeHealthTrends(1, '6months');
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
    await connection.end();
    console.log('🎯 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAnalytics();
