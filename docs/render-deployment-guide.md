# คู่มือการ Deploy บน Render 🚀

## ข้อมูลเบื้องต้นเกี่ยวกับ Render

**Render** เป็น Platform-as-a-Service (PaaS) ที่ให้บริการ hosting แอปพลิเคชัน โดยมี Free Tier ที่มีข้อจำกัด:

### ข้อจำกัดของ Free Tier:
- ⏰ **Sleep Mode**: เซิร์ฟเวอร์จะหลับหลังจากไม่มีการใช้งาน 15 นาที
- 🔄 **Wake-up Time**: ใช้เวลาปลุกประมาณ 20-60 วินาที
- 📊 **Resources**: RAM 512MB, CPU shared
- 🌐 **Bandwidth**: 100GB/เดือน

## การเตรียมโค้ดสำหรับ Render

### 1. ปรับปรุง Server (✅ เสร็จแล้ว)

โค้ดได้รับการปรับปรุงแล้วดังนี้:

#### Database Connection Pool
```javascript
// ใช้ Connection Pool แทน single connection
const dbConfig = {
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};
```

#### Keep-Alive System
```javascript
// ระบบป้องกัน Sleep Mode
function initKeepAlive() {
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_SERVICE_URL) {
    setInterval(async () => {
      // Ping ตัวเองทุก 10 นาที
      await fetch(`${process.env.RENDER_SERVICE_URL}/api/ping`);
    }, 10 * 60 * 1000);
  }
}
```

#### Health Check Endpoints
- `/api/health` - ตรวจสอบสถานะเซิร์ฟเวอร์และฐานข้อมูล
- `/api/ping` - Keep-alive endpoint
- `/api/status` - ข้อมูลเซิร์ฟเวอร์

#### Error Handling และ Retry Logic
- Database reconnection อัตโนมัติ
- Query retry สำหรับ connection errors
- Graceful shutdown handling

### 2. Frontend API Manager (✅ เสร็จแล้ว)

สร้าง `ApiManager.js` ที่มีฟีเจอร์:
- 🔄 **Auto Retry**: ลองใหม่อัตโนมัติเมื่อ request ล้มเหลว
- ⏰ **Timeout Handling**: จัดการ timeout และ server sleep
- 🎯 **Smart Wake-up**: ปลุกเซิร์ฟเวอร์อัตโนมัติ
- 📊 **Connection Status**: แสดงสถานะการเชื่อมต่อ

## ขั้นตอนการ Deploy

### 1. เตรียมบัญชี Render

1. ไปที่ [render.com](https://render.com)
2. สมัครบัญชีใหม่หรือเข้าสู่ระบบ
3. เชื่อมต่อกับ GitHub account

### 2. เตรียม Git Repository

```bash
# ใน server directory
cd c:\\Users\\NT2_Admin\\Desktop\\webtemplate\\health\\server
git init
git add .
git commit -m "Initial server setup for Render deployment"

# Push ไปยัง GitHub repository
git remote add origin https://github.com/boss321995/healthForAom.git
git push -u origin master
```

### 3. สร้าง Web Service บน Render

1. ใน Render Dashboard คลิก **"New +"**
2. เลือก **"Web Service"**
3. Connect GitHub repository: `boss321995/healthForAom`
4. ตั้งค่าดังนี้:

```
Service Name: health-management-api
Environment: Node
Region: Singapore (ใกล้ที่สุด)
Branch: master
Root Directory: server
Build Command: npm install
Start Command: npm start
```

### 4. ตั้งค่า Environment Variables

ใน Render Dashboard → Environment tab เพิ่มตัวแปรต่อไปนี้:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-change-this
DB_HOST=your-database-host
DB_USER=your-database-user  
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_SSL=true
RENDER_SERVICE_URL=https://your-service-name.onrender.com
```

### 5. ตั้งค่าฐานข้อมูล

#### ตัวเลือก 1: ใช้ Render PostgreSQL (แนะนำ)
1. สร้าง PostgreSQL service ใน Render
2. เปลี่ยนโค้ดให้รองรับ PostgreSQL

#### ตัวเลือก 2: ใช้ External MySQL
1. ใช้ PlanetScale, Railway, หรือ AWS RDS
2. ตั้งค่า SSL connection

#### ตัวเลือก 3: ใช้ SQLite (สำหรับ demo)
```javascript
// เปลี่ยนใน index.js
import sqlite3 from 'sqlite3';
// แทนที่ MySQL connection
```

### 6. Deploy Frontend

#### ตัวเลือก 1: Netlify
```bash
cd c:\\Users\\NT2_Admin\\Desktop\\webtemplate\\health
npm run build
# Upload build folder ไปยัง Netlify
```

#### ตัวเลือก 2: Vercel
```bash
npm install -g vercel
vercel --prod
```

#### ตัวเลือก 3: Render Static Site
1. สร้าง Static Site ใน Render
2. Connect repository
3. Build Command: `npm run build`
4. Publish Directory: `build`

## การจัดการ Sleep Mode

### 1. External Monitoring (แนะนำ)

ใช้บริการฟรีเช่น:
- **UptimeRobot**: ping server ทุก 5 นาที
- **StatusCake**: monitoring และ alerting
- **Pingdom**: basic monitoring

ตั้งค่า URL: `https://your-service.onrender.com/api/ping`

### 2. Frontend Wake-up

ใช้ `ApiManager.js` ที่สร้างไว้:

```javascript
import apiManager, { ServerWakeUp, ConnectionIndicator } from './utils/ApiManager';

function App() {
  return (
    <div className="App">
      <ConnectionIndicator />
      {/* แสดง ServerWakeUp component เมื่อเซิร์ฟเวอร์หลับ */}
      <Router>
        {/* Your routes */}
      </Router>
    </div>
  );
}
```

### 3. Scheduled Tasks (ถ้าต้องการ)

ใช้ GitHub Actions หรือ cron job:

```yaml
# .github/workflows/keep-alive.yml
name: Keep Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # ทุก 10 นาที
jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping server
        run: curl https://your-service.onrender.com/api/ping
```

## การตรวจสอบและแก้ไขปัญหา

### 1. ตรวจสอบ Logs
```bash
# ใน Render Dashboard
# ไปที่ "Logs" tab เพื่อดู real-time logs
```

### 2. Test Health Endpoints
```bash
# ตรวจสอบสถานะ
curl https://your-service.onrender.com/api/health

# ทดสอบ ping
curl https://your-service.onrender.com/api/ping
```

### 3. Database Connection Issues
```javascript
// ตรวจสอบใน logs หา error messages เช่น:
// "PROTOCOL_CONNECTION_LOST"
// "ECONNRESET" 
// "ETIMEDOUT"
```

## Performance Optimization

### 1. Database Optimization
- ใช้ Connection Pool
- เพิ่ม Database Indexes
- Cache frequently accessed data

### 2. API Response Optimization
- Implement response compression
- Use pagination for large datasets
- Cache static responses

### 3. Client-side Optimization
- Implement proper loading states
- Use React.memo for expensive components
- Add service worker for offline support

## Security Considerations

### 1. Environment Variables
- ใช้ JWT secret ที่แข็งแรง
- เปลี่ยน default passwords
- เปิดใช้ SSL/TLS

### 2. CORS Configuration
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### 3. Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## ต้นทุนและการจัดการ

### Free Tier Limits:
- 🆓 **0 บาท/เดือน**
- ⏰ Sleep หลัง 15 นาที
- 📊 512MB RAM
- 🌐 100GB Bandwidth

### การ Upgrade:
- 💰 **$7/เดือน** สำหรับ always-on service
- 📈 1GB RAM, dedicated CPU
- 🚀 ไม่มี sleep mode

## สรุป

ระบบได้รับการปรับปรุงให้พร้อมสำหรับ Render deployment แล้ว ด้วยฟีเจอร์:

✅ **Database Reconnection** - เชื่อมต่อใหม่อัตโนมัติ  
✅ **Keep-Alive System** - ป้องกัน sleep mode  
✅ **Health Check Endpoints** - ตรวจสอบสถานะ  
✅ **Retry Logic** - ลองใหม่เมื่อล้มเหลว  
✅ **Error Handling** - จัดการ error ครบถ้วน  
✅ **Frontend API Manager** - ระบบ reconnect ฝั่ง client  

Deploy ได้เลย! 🚀
