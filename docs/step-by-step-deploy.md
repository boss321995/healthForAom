# 🚀 ขั้นตอนการ Deploy บน Render (เริ่มจากศูนย์)

## ✅ เสร็จแล้ว: เตรียมโค้ด

- โค้ดถูก push ขึ้น GitHub repository แล้ว
- โครงสร้างพร้อมสำหรับ Render deployment

## 📝 ขั้นตอนถัดไป:

### 1. สมัครบัญชี Render (5 นาที)

1. ไปที่ [render.com](https://render.com)
2. คลิก **"Get Started for Free"**
3. เลือก **"Sign Up with GitHub"** (แนะนำ)
4. Login ด้วย GitHub account ของคุณ
5. Render จะขอ permission เข้าถึง repositories

### 2. สร้าง Database Service ก่อน (10 นาที)

#### ตัวเลือก A: PostgreSQL (แนะนำ - ฟรี 90 วัน)

1. ใน Render Dashboard → คลิก **"New +"**
2. เลือก **"PostgreSQL"**
3. ตั้งค่าดังนี้:
   ```
   Name: health-management-db
   Database: health_management
   User: health_user
   Region: Singapore
   Plan: Free (90 days)
   ```
4. คลิก **"Create Database"**
5. **สำคัญ**: เก็บ Connection String ไว้ใช้ในขั้นตอนถัดไป

#### ตัวเลือก B: External MySQL (ถาวร แต่ต้องหาที่ host)

- ใช้ PlanetScale, Railway, หรือ Aiven
- สมัครและสร้าง MySQL database
- เก็บ connection details ไว้

### 3. สร้าง Web Service (10 นาที)

1. ใน Render Dashboard → คลิก **"New +"**
2. เลือก **"Web Service"**
3. คลิก **"Connect a repository"**
4. เลือก repository: **`boss321995/healthForAom`**
5. คลิก **"Connect"**

### 4. ตั้งค่า Web Service

```
Service Name: health-management-api
Environment: Node
Region: Singapore (ใกล้ที่สุด)
Branch: master
Root Directory: server
Build Command: npm install
Start Command: npm start
```

### 5. ตั้งค่า Environment Variables (สำคัญ!)

ใน **Environment** tab เพิ่มตัวแปรเหล่านี้:

```bash
# Required
NODE_ENV=production
PORT=10000

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-secure

# Database (ใช้ค่าจาก step 2)
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=health_management
DB_SSL=true

# จะได้หลังจาก deploy เสร็จ (ใส่ในรอบ 2)
RENDER_SERVICE_URL=https://health-management-api.onrender.com
```

### 6. Deploy!

1. คลิก **"Create Web Service"**
2. Render จะเริ่ม build และ deploy
3. รอประมาณ 3-5 นาที
4. ถ้าสำเร็จจะเห็นสถานะ **"Live"** เป็นสีเขียว

### 7. Update RENDER_SERVICE_URL

1. หลังจาก deploy สำเร็จ copy URL ของ service
2. กลับไปที่ **Environment** tab
3. เพิ่ม `RENDER_SERVICE_URL=https://your-actual-service-url.onrender.com`
4. Save แล้ว service จะ redeploy อัตโนมัติ

### 8. ตั้งค่าฐานข้อมูล

1. เข้าไปที่ **Shell** tab ใน Render dashboard
2. รัน migration script:

   ```bash
   # ถ้าใช้ PostgreSQL
   psql $DATABASE_URL -f migrations/001_initial_schema.sql

   # หรือ ถ้าใช้ MySQL external
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/001_initial_schema.sql
   ```

### 9. ทดสอบการทำงาน

1. เปิด browser ไปที่ service URL
2. ทดสอบ endpoints:
   - `https://your-service.onrender.com/api/health`
   - `https://your-service.onrender.com/api/ping`
   - `https://your-service.onrender.com/api/status`

### 10. ตั้งค่า Keep-Alive (ป้องกัน Sleep)

#### ตัวเลือก A: UptimeRobot (แนะนำ - ฟรี)

1. ไปที่ [uptimerobot.com](https://uptimerobot.com)
2. สมัครบัญชีฟรี
3. เพิ่ม monitor:
   ```
   Type: HTTP(s)
   URL: https://your-service.onrender.com/api/ping
   Interval: 5 minutes
   ```

#### ตัวเลือก B: GitHub Actions (ฟรี)

1. ใน repository สร้างไฟล์ `.github/workflows/keep-alive.yml`
2. เพิ่มโค้ด:
   ```yaml
   name: Keep Alive
   on:
     schedule:
       - cron: "*/10 * * * *"
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - run: curl https://your-service.onrender.com/api/ping
   ```

## 🎯 หลังจาก Deploy สำเร็จ

### ✅ สิ่งที่ควรทำ:

1. **บันทึก URLs**:

   - API URL: `https://your-service.onrender.com`
   - Health Check: `https://your-service.onrender.com/api/health`

2. **ตรวจสอบ Logs**:

   - ไปที่ **Logs** tab ใน Render dashboard
   - ดูว่ามี error หรือไม่

3. **ทดสอบ Sleep/Wake**:

   - รอ 15 นาที (server จะหลับ)
   - ลองเข้าใหม่ (ควรใช้เวลา 20-60 วิในการตื่น)

4. **Update Frontend**:
   - แก้ไข API URL ใน frontend ให้ชี้ไปที่ Render
   - Deploy frontend บน Netlify/Vercel

### 🔧 การแก้ไขปัญหาทั่วไป:

#### ❌ Build Failed

- ตรวจสอบ `package.json` ใน `/server` folder
- ดู error ใน Build Logs

#### ❌ Database Connection Error

- ตรวจสอบ Environment Variables
- ใช้ `/api/health` เพื่อ debug

#### ❌ Service ไม่ตื่น

- ตรวจสอบ UptimeRobot setup
- ดู keep-alive logs

## 🎉 เสร็จแล้ว!

หลังจากขั้นตอนเหล่านี้คุณจะมี:

- ✅ API server ที่ทำงานบน Render
- ✅ Database ที่เชื่อมต่อได้
- ✅ Keep-alive system ที่ป้องกัน sleep
- ✅ Health monitoring endpoints
- ✅ Auto recovery เมื่อมีปัญหา

**พร้อมใช้งานแล้ว! 🚀**

---

_หากมีปัญหาในการ deploy สามารถดู error ใน Render logs หรือทดสอบผ่าน health endpoints_
