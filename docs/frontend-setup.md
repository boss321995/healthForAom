# การตั้งค่า Frontend ให้เชื่อมต่อกับ Render API

## 1. อัปเดต API URL

### ตัวเลือก A: ใช้ Environment Variables (แนะนำ)

สร้างไฟล์ `.env` ใน root folder ของ frontend:

```bash
# .env (สำหรับ development)
REACT_APP_API_URL=http://localhost:5000/api

# .env.production (สำหรับ production)
REACT_APP_API_URL=https://your-service-name.onrender.com/api
```

### ตัวเลือก B: แก้ไขใน ApiManager.js

```javascript
// src/utils/ApiManager.js
class ApiManager {
  constructor(baseURL = "/api") {
    // ใช้ environment variable หรือ fallback
    this.baseURL =
      process.env.REACT_APP_API_URL ||
      "https://your-service-name.onrender.com/api";
    // ...rest of code
  }
}
```

## 2. อัปเดต Frontend Code

### เพิ่ม Connection Status ใน App.js

```javascript
// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConnectionIndicator } from "./utils/ApiManager";

// Import components
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div className="App">
      {/* แสดงสถานะการเชื่อมต่อ */}
      <ConnectionIndicator />

      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* เพิ่ม routes อื่นๆ */}
        </Routes>
      </Router>
    </div>
  );
}

export default App;
```

### อัปเดต API Calls ใน Components

```javascript
// แทนที่การใช้ fetch ด้วย ApiManager
// OLD:
// const response = await fetch('/api/auth/login', { ... });

// NEW:
import apiManager from "../utils/ApiManager";

const handleLogin = async (credentials) => {
  try {
    const data = await apiManager.post("/auth/login", credentials);
    // Handle success
  } catch (error) {
    // ApiManager จะจัดการ retry และ wake-up อัตโนมัติ
    console.error("Login failed:", error.message);
  }
};
```

### เพิ่ม Loading States

```javascript
// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import apiManager, {
  useConnectionStatus,
  ServerWakeUp,
} from "../utils/ApiManager";

function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const isConnected = useConnectionStatus();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiManager.get("/health-metrics");
      setData(result);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // แสดง wake-up UI ถ้าเซิร์ฟเวอร์หลับ
  if (!isConnected) {
    return <ServerWakeUp onWakeUp={fetchData} />;
  }

  return (
    <div>
      {loading && <div>Loading...</div>}
      {/* Dashboard content */}
    </div>
  );
}
```

## 3. Deploy Frontend

### ตัวเลือก A: Netlify (แนะนำ - ฟรี)

1. **Build Project:**

   ```bash
   npm run build
   ```

2. **Deploy ไปยัง Netlify:**

   - ไปที่ [netlify.com](https://netlify.com)
   - Login ด้วย GitHub
   - คลิก "New site from Git"
   - เลือก repository
   - ตั้งค่า:
     ```
     Build command: npm run build
     Publish directory: build
     ```

3. **ตั้งค่า Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-service-name.onrender.com/api
   ```

### ตัวเลือก B: Vercel

1. **Install Vercel CLI:**

   ```bash
   npm install -g vercel
   ```

2. **Deploy:**

   ```bash
   vercel --prod
   ```

3. **ตั้งค่า Environment Variables ใน Vercel Dashboard**

### ตัวเลือก C: Render Static Site

1. **ใน Render Dashboard → New +**
2. **เลือก "Static Site"**
3. **Connect repository**
4. **ตั้งค่า:**
   ```
   Build Command: npm run build
   Publish Directory: build
   ```

## 4. ทดสอบการเชื่อมต่อ

### Test Checklist:

1. **✅ Basic Connection:**

   - เปิด frontend URL
   - ตรวจสอบว่า ConnectionIndicator แสดงสีเขียว

2. **✅ API Calls:**

   - ลองสมัครสมาชิก/เข้าสู่ระบบ
   - ตรวจสอบว่าข้อมูลถูกส่งไปยัง API

3. **✅ Sleep Mode Handling:**

   - รอ 15 นาที (ให้ API หลับ)
   - ลองใช้งาน frontend อีกครั้ง
   - ควรเห็น loading และ auto wake-up

4. **✅ Error Handling:**
   - ปิด internet connection ชั่วคราว
   - ตรวจสอบว่า UI แสดง error message
   - เมื่อ internet กลับมาควร reconnect อัตโนมัติ

## 5. การปรับแต่งเพิ่มเติม

### เพิ่ม Service Worker (PWA)

```javascript
// public/sw.js
self.addEventListener("fetch", (event) => {
  // Cache API responses
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

### เพิ่ม Offline Support

```javascript
// src/hooks/useOffline.js
import { useState, useEffect } from "react";

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOffline;
};
```

### แสดง Network Status

```javascript
// src/components/NetworkStatus.js
import React from "react";
import { useOffline } from "../hooks/useOffline";
import { useConnectionStatus } from "../utils/ApiManager";

export const NetworkStatus = () => {
  const isOffline = useOffline();
  const isApiConnected = useConnectionStatus();

  if (isOffline) {
    return (
      <div className="network-status offline">
        🔴 ไม่มีการเชื่อมต่ออินเทอร์เน็ต
      </div>
    );
  }

  if (!isApiConnected) {
    return (
      <div className="network-status api-disconnected">
        🟡 เซิร์ฟเวอร์ไม่พร้อมใช้งาน (กำลังปลุก...)
      </div>
    );
  }

  return <div className="network-status connected">🟢 เชื่อมต่อแล้ว</div>;
};
```

## 6. Production Checklist

### ✅ ก่อน Deploy:

- [ ] ตั้งค่า REACT_APP_API_URL ถูกต้อง
- [ ] ทดสอบ ApiManager ใน development
- [ ] เพิ่ม ConnectionIndicator และ ServerWakeUp
- [ ] ทดสอบการ retry และ error handling

### ✅ หลัง Deploy:

- [ ] ทดสอบการเชื่อมต่อ API
- [ ] ทดสอบ sleep/wake cycle
- [ ] ตรวจสอบ console errors
- [ ] ทดสอบบนอุปกรณ์และเบราว์เซอร์ต่างๆ

## 🎉 เสร็จแล้ว!

หลังจากขั้นตอนเหล่านี้คุณจะมี:

- ✅ Frontend ที่เชื่อมต่อกับ Render API
- ✅ Auto retry และ error handling
- ✅ Sleep mode detection และ wake-up
- ✅ Connection status indicators
- ✅ Offline support (ถ้าเพิ่ม)

**พร้อมใช้งานเต็มรูปแบบแล้ว! 🚀**
