// Safari Support Utilities
// Safari has stricter security policies and different behavior

export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isWebKit = () => {
  return /webkit/i.test(navigator.userAgent);
};

// Safari-specific localStorage handling
export const safariLocalStorage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Safari localStorage failed:', error);
      // Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (sessionError) {
        console.error('Both localStorage and sessionStorage failed:', sessionError);
        return false;
      }
    }
  },
  
  getItem: (key) => {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      console.warn('Safari storage access failed:', error);
      return null;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Safari storage removal failed:', error);
    }
  }
};

// Safari-specific axios configuration
export const getSafariAxiosConfig = () => {
  const baseConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 15000, // Safari needs longer timeouts
  };

  if (isSafari()) {
    return {
      ...baseConfig,
      withCredentials: true,
      // Safari-specific headers
      headers: {
        ...baseConfig.headers,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    };
  }

  return baseConfig;
};

// Safari CORS error handler
export const handleSafariCorsError = (error) => {
  if (isSafari() && error.message.includes('Network request failed')) {
    return {
      success: false,
      message: 'Safari security policy ป้องกันการเชื่อมต่อ กรุณาตรวจสอบการตั้งค่า cookies และ privacy settings',
      safariError: true
    };
  }
  return null;
};

// Initialize Safari support
export const initSafariSupport = () => {
  if (isSafari()) {
    console.log('🦁 Safari detected - applying compatibility settings');
    
    // Ensure fetch is available (though it should be in modern Safari)
    if (!window.fetch) {
      console.warn('Fetch not available in Safari - consider adding a polyfill');
    }
    
    // Safari privacy mode detection
    try {
      localStorage.setItem('safari-test', 'test');
      localStorage.removeItem('safari-test');
    } catch (error) {
      console.warn('Safari private browsing mode detected - some features may be limited');
    }
  }
};

// Safari-specific error messages
export const getSafariErrorMessage = (error) => {
  if (!isSafari()) return null;
  
  if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
    return 'Safari ไม่อนุญาตให้เข้าถึงเซิร์ฟเวอร์ กรุณาตรวจสอบการตั้งค่า Privacy & Security ใน Safari Settings';
  }
  
  if (error.message.includes('CORS')) {
    return 'Safari บล็อกการเชื่อมต่อแบบ Cross-Origin กรุณาปิด "Prevent cross-site tracking" ชั่วคราว';
  }
  
  if (error.message.includes('QuotaExceededError')) {
    return 'Safari มีพื้นที่เก็บข้อมูลไม่เพียงพอ กรุณาล้างข้อมูลเว็บไซต์';
  }
  
  return null;
};
