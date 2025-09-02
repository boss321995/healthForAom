// API Connection Manager with Retry Logic for Render Deployment
// ระบบจัดการการเชื่อมต่อ API ที่มีการ retry และ reconnect สำหรับ Render

import React from 'react';

class ApiManager {
  constructor(baseURL = 'https://health-management-api.onrender.com/api') {
    // Use production API URL by default
    this.baseURL = process.env.REACT_APP_API_URL || baseURL;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 30000; // 30 seconds
    
    // Keep track of connection status
    this.isConnected = true;
    this.connectionListeners = [];
    
    console.log('🚀 ApiManager initialized with:', this.baseURL);
    
    // Wake up server on first load
    this.wakeUpServer();
  }

  // Add connection status listener
  onConnectionChange(callback) {
    this.connectionListeners.push(callback);
  }

  // Notify all listeners about connection changes
  notifyConnectionChange(isConnected) {
    if (this.isConnected !== isConnected) {
      this.isConnected = isConnected;
      this.connectionListeners.forEach(callback => callback(isConnected));
    }
  }

  // Wake up server from sleep mode
  async wakeUpServer() {
    try {
      console.log('🔄 Waking up server...');
      await this.fetchWithRetry('/ping', { method: 'GET' });
      console.log('✅ Server is awake');
      this.notifyConnectionChange(true);
    } catch (error) {
      console.warn('⚠️ Failed to wake up server:', error.message);
      this.notifyConnectionChange(false);
    }
  }

  // Enhanced fetch with retry logic
  async fetchWithRetry(endpoint, options = {}, attempt = 1) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Default options
    const defaultOptions = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if server is waking up (common on Render free tier)
      if (response.status === 503 && attempt === 1) {
        console.log('🔄 Server appears to be sleeping, waking up...');
        await this.delay(5000); // Wait 5 seconds for server to wake up
        return this.fetchWithRetry(endpoint, options, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      this.notifyConnectionChange(true);
      return response;

    } catch (error) {
      console.error(`❌ Request failed (attempt ${attempt}):`, error.message);

      // Handle specific errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be sleeping');
      }

      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('timeout')) {
        
        this.notifyConnectionChange(false);

        // Retry logic
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.delay(delay);
          return this.fetchWithRetry(endpoint, options, attempt + 1);
        }
      }

      throw error;
    }
  }

  // Helper method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // GET request with retry
  async get(endpoint, options = {}) {
    const response = await this.fetchWithRetry(endpoint, { method: 'GET', ...options });
    return response.json();
  }

  // POST request with retry
  async post(endpoint, data, options = {}) {
    const response = await this.fetchWithRetry(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
    return response.json();
  }

  // PUT request with retry
  async put(endpoint, data, options = {}) {
    const response = await this.fetchWithRetry(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
    return response.json();
  }

  // DELETE request with retry
  async delete(endpoint, options = {}) {
    const response = await this.fetchWithRetry(endpoint, { method: 'DELETE', ...options });
    return response.json();
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.get('/health');
      this.notifyConnectionChange(true);
      return result;
    } catch (error) {
      this.notifyConnectionChange(false);
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const apiManager = new ApiManager();

// Connection status hook for React components
export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = React.useState(apiManager.getConnectionStatus());
  
  React.useEffect(() => {
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
    };
    
    apiManager.onConnectionChange(handleConnectionChange);
    
    return () => {
      // Remove listener (Note: proper implementation would need a remove method)
    };
  }, []);
  
  return isConnected;
};

// Connection indicator component
export const ConnectionIndicator = () => {
  const isConnected = useConnectionStatus();
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: isConnected ? '#4CAF50' : '#f44336',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    }}>
      {isConnected ? '🟢 เชื่อมต่อแล้ว' : '🔴 การเชื่อมต่อขาดหาย'}
    </div>
  );
};

// Server wake-up component
export const ServerWakeUp = ({ onWakeUp }) => {
  const [isWaking, setIsWaking] = React.useState(false);
  
  const wakeUpServer = async () => {
    setIsWaking(true);
    try {
      await apiManager.wakeUpServer();
      if (onWakeUp) onWakeUp();
    } catch (error) {
      console.error('Failed to wake up server:', error);
    } finally {
      setIsWaking(false);
    }
  };
  
  return (
    <div style={{
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h3>🔄 เซิร์ฟเวอร์กำลังหลับ</h3>
      <p>เซิร์ฟเวอร์ฟรีใน Render จะหลับหลังจากไม่มีการใช้งาน 15 นาที</p>
      <p>กรุณาคลิกปุ่มด้านล่างเพื่อปลุกเซิร์ฟเวอร์</p>
      <button 
        onClick={wakeUpServer}
        disabled={isWaking}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isWaking ? 'not-allowed' : 'pointer',
          opacity: isWaking ? 0.6 : 1
        }}
      >
        {isWaking ? '⏳ กำลังปลุกเซิร์ฟเวอร์...' : '🚀 ปลุกเซิร์ฟเวอร์'}
      </button>
    </div>
  );
};

// Export the API manager instance
export default apiManager;

/**
 * Usage examples:
 * 
 * // In your React components:
 * import apiManager, { useConnectionStatus, ConnectionIndicator, ServerWakeUp } from './utils/ApiManager';
 * 
 * // Example 1: Basic API calls with retry
 * try {
 *   const data = await apiManager.get('/user/profile');
 *   console.log('Profile data:', data);
 * } catch (error) {
 *   console.error('Failed to fetch profile:', error.message);
 * }
 * 
 * // Example 2: Using connection status hook
 * const MyComponent = () => {
 *   const isConnected = useConnectionStatus();
 *   
 *   return (
 *     <div>
 *       {!isConnected && <ServerWakeUp onWakeUp={() => window.location.reload()} />}
 *       <ConnectionIndicator />
 *       Your component content here
 *     </div>
 *   );
 * };
 * 
 * // Example 3: Replace existing fetch calls
 * // OLD: const response = await fetch('/api/auth/login', { ... });
 * // NEW: const data = await apiManager.post('/auth/login', loginData);
 */
