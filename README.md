# 🏥 Health Management System

ระบบจัดการสุขภาพส่วนบุคคลแบบครบครัน ที่สร้างด้วย React.js, Node.js, และ PostgreSQL พร้อม AI Analytics และระบบติดตามยาอัจฉริยะ

## ✨ ฟีเจอร์หลัก

### 🔐 ระบบยืนยันตัวตน & ความปลอดภัย
- **สมัครสมาชิก / เข้าสู่ระบบ** - ระบบปลอดภัยด้วย JWT
- **การเข้ารหัสรหัสผ่าน** - bcrypt encryption (salt rounds: 10)
- **Session management** - การจัดการเซสชันอัตโนมัติ
- **Security protection** - CORS, SQL injection prevention, input validation

### 👤 ระบบจัดการโปรไฟล์ครบครัน
- **ข้อมูลส่วนตัว** - ชื่อ, อายุ, เพศ, วันเกิด
- **ข้อมูลทางกายภาพ** - ส่วนสูง, น้ำหนัก, กรุ๊ปเลือด, BMI อัตโนมัติ
- **ข้อมูลการแพทย์** - โรคประจำตัว, ยาที่ใช้, การแพ้
- **ข้อมูลติดต่อฉุกเฉิน** - เบอร์โทรฉุกเฉิน, ผู้ติดต่อ
- **การอัปเดตแบบไดนามิก** - ตรวจสอบ schema และปรับ SQL อัตโนมัติ

### 📊 ระบบติดตามสุขภาพขั้นสูง
- **ค่าตรวจสุขภาพครบครัน**:
  - ความดันโลหิต (ตัวบน/ตัวล่าง)
  - อัตราการเต้นหัวใจ
  - น้ำตาลในเลือด, HbA1c
  - คอเลสเตอรอล (รวม, HDL, LDL, ไตรกลีเซอไรด์)
  - การตรวจเลือด (ฮีโมโกลบิน, ฮีมาโตคริต, เหล็ก, TIBC)
  - เอนไซม์ตับ (ALT, AST), กรดยูริก
  - องค์ประกอบร่างกาย (เปอร์เซ็นต์ไขมัน, มวลกล้ามเนื้อ)

- **พฤติกรรมสุขภาพ**:
  - การออกกำลังกาย (ประเภท, ระยะเวลา, ความเข้มข้น)
  - การนอนหลับ (ชั่วโมง, คุณภาพ, เวลาเข้านอน-ตื่น)
  - โภชนาการ (น้ำ, ผัก-ผลไม้, วิตามิน)
  - สุขภาพจิต (ระดับเครียด, กิจกรรมผ่อนคลาย)
  - **ปัจจัยเสี่ยง**: แอลกอฮอล์, บุหรี่, คาเฟอีน, เวลาหน้าจอ

### 💊 ระบบติดตามยาอัจฉริยะ (Medication Tracking)
- **จัดการยาครบครัน**:
  - เพิ่ม/แก้ไข/ลบข้อมูลยา
  - ขนาดยา, ความถี่, เวลาทานยา
  - โรคที่รักษา, หมายเหตุพิเศษ
  - วันที่เริ่ม-หยุดทานยา

- **ระบบแจ้งเตือนอัตโนมัติ**:
  - แจ้งเตือนตามเวลาที่กำหนด
  - การแจ้งเตือนแบบ Browser Notification
  - สถานะการทานยารายวัน
  - ประวัติการทานยาที่ครบถ้วน

- **เทมเพลตยาตามโรค**:
  - **ความดันสูง**: Amlodipine, Losartan, Atenolol
  - **เบาหวาน**: Metformin, Glipizide, Insulin
  - **วัณโรค**: Isoniazid (H), Rifampin (R), Ethambutol (E), Pyrazinamide (Z)
  - **โรคหัวใจ**: Aspirin, Simvastatin, Clopidogrel

### 📈 ระบบแนวโน้มสุขภาพ (Health Trends)
- **กราฟแนวโน้มแบบ Interactive**:
  - กราฟเส้น (Line Chart) - แสดงการเปลี่ยนแปลงตามเวลา
  - กราฟแท่งแนวนอน (Horizontal Bar) - เปรียบเทียบค่าแต่ละวัน
  - **แสดงผลตั้งแต่ข้อมูลครั้งแรก** - ไม่ต้องรอ 3 ครั้ง

- **สถิติสุขภาพ**:
  - ค่าล่าสุด, ค่าสูงสุด, ค่าต่ำสุด, ค่าเฉลี่ย
  - การวิเคราะห์แนวโน้ม (เพิ่มขึ้น/ลดลง)
  - ข้อความให้กำลังใจสำหรับผู้เริ่มต้น

### 🧠 ระบบ AI Analytics และคำแนะนำ
- **การประเมินสุขภาพ AI**:
  - คะแนนสุขภาพรวม (Health Score) จาก BMI, ความดัน, น้ำตาล, ชีพจร
  - เกรดสุขภาพ (A-F) พร้อมสถานะ
  - วิเคราะห์ปัจจัยเสี่ยงอัตโนมัติ

- **คำแนะนำเฉพาะบุคคล**:
  - **สำหรับผู้ที่มีความดันสูง**: การควบคุมอาหาร, การออกกำลังกาย
  - **สำหรับผู้เบาหวาน**: การจัดการอาหาร, การตรวจน้ำตาล
  - **สำหรับผู้รักษาวัณโรค**: การทานยา, การดูแลตนเอง
  - คำแนะนำตามยาที่ใช้ (Amlodipine, Metformin, ฯลฯ)

### 🔔 ระบบแจ้งเตือนอัจฉริยะ
- **แจ้งเตือนในแอป** - ระบบ Notification Panel แบบ Real-time
- **การแจ้งเตือนยา** - ตามเวลาที่กำหนดแม่นยำ
- **แจ้งเตือนค่าผิดปกติ** - เมื่อค่าสุขภาพสูง/ต่ำผิดปกติ
- **ข้อแนะนำการดูแลสุขภาพ** - ตามสถานการณ์

### 📱 ระบบรายงานและการแชร์
- **รายงาน PDF แบบ 2 ภาษา**:
  - รายงานภาษาไทย (HealthReportPDF_Thai)
  - รายงานภาษาอังกฤษ (HealthReportPDF)
  - ข้อมูลครบถ้วน: โปรไฟล์, ค่าตรวจ, แนวโน้ม, คำแนะนำ

### 🤖 Health Chatbot
- **AI Chatbot เพื่อการปรึกษา** - ตอบคำถามเกี่ยวกับสุขภาพ
- **การวิเคราะห์ข้อมูลส่วนบุคคล** - ให้คำแนะนำตามข้อมูลจริง
- **คำแนะนำเชิงลึก** - การดูแลสุขภาพแบบมืออาชีพ

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **React.js 19.x** - UI Framework พร้อม Context API
- **Chart.js** - กราฟและการแสดงข้อมูล
- **Tailwind CSS 3.x** - Modern CSS Framework
- **Axios** - HTTP Client
- **React Portals** - Advanced UI Rendering

### Backend
- **Node.js (ESM)** - Runtime Environment 
- **Express.js** - Web Framework
- **PostgreSQL** - ฐานข้อมูลขั้นสูง
- **JWT** - Authentication & Authorization
- **bcrypt** - Password Security

### Database & Deployment
- **Render** - Cloud Platform (PostgreSQL + Node.js Service)
- **Auto-Migration** - ระบบอัปเดต Schema อัตโนมัติ
- **Environment Variables** - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT

### Dev Tools
- **Webpack 5** - Module Bundler
- **Babel** - JavaScript Compiler
- **PostCSS** - CSS Processing

## 🚀 การติดตั้งและใช้งาน

### 1. ข้อกำหนดระบบ
- Node.js v18+
- PostgreSQL 13+
- Git

### 2. Clone โปรเจกต์
\`\`\`bash
git clone https://github.com/boss321995/healthForAom.git
cd healthForAom
\`\`\`

### 3. ติดตั้ง Dependencies
\`\`\`bash
npm install
\`\`\`

### 4. ตั้งค่าฐานข้อมูล PostgreSQL

#### สร้างฐานข้อมูล:
\`\`\`sql
CREATE DATABASE health_management;
\`\`\`

#### Import Schema:
\`\`\`bash
psql -U username -d health_management -f server/health_management.sql
\`\`\`

### 5. ตั้งค่า Environment Variables

สร้างไฟล์ \`.env\` ใน root directory:
\`\`\`env

# PostgreSQL Database Configuration (Production - Render)
DB_HOST=your-render-db-host
DB_USER=your-db-username  
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=5432
DB_SSL=false

# Alternative: Database URL (fallback)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Server Configuration
PORT=5000
NODE_ENV=production
\`\`\`

### 6. รันระบบ

#### Development Mode (Local):
\`\`\`bash
# รัน Frontend และ Backend พร้อมกัน
npm start

# หรือรันแยก:
# Frontend
npm run start

# Backend (ใน terminal อื่น)
cd server
node index.js
\`\`\`

#### Production Mode (Render):
\`\`\`bash
# ระบบจะรันอัตโนมัติด้วย
npm run build && npm run start:prod
\`\`\`

### 7. เข้าใช้งานระบบ
- **Development**: http://localhost:3000
- **Production**: https://your-app-name.onrender.com
- **Backend API**: http://localhost:5000/api (dev) / https://your-api.onrender.com/api (prod)

## 📁 โครงสร้างโปรเจกต์

\`\`\`
healthForAom/
├── server/
│   ├── index.js                 # Main server (ESM)
│   ├── migrate-medications.js   # Auto-migration script
│   ├── health_management.sql    # Database schema
│   └── package.json            # Backend dependencies
├── src/
│   ├── components/
│   │   ├── Dashboard.js         # Main dashboard with metrics
│   │   ├── HealthTrends.js     # Trends & charts
│   │   ├── HealthAnalytics.js  # AI analytics
│   │   ├── UpdateProfile.js    # Profile management
│   │   ├── NotificationSystem.js # Notifications
│   │   ├── HealthReportPDF.js  # PDF reports (EN)
│   │   ├── HealthReportPDF_Thai.js # PDF reports (TH)
│   │   ├── HealthChatbot.js    # AI chatbot
│   │   ├── Login.js           # Authentication
│   │   └── Register.js        # Registration
│   ├── contexts/
│   │   └── AuthContext.js     # Authentication context
│   ├── App.js                 # Main React app
│   ├── index.js              # React entry point
│   └── index.css            # Tailwind imports
├── public/
│   └── index.html           # HTML template
├── .env                     # Environment variables
├── package.json            # Frontend dependencies
├── webpack.config.js       # Webpack configuration
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
└── README.md              # This file
\`\`\`

## 🗄️ โครงสร้างฐานข้อมูล PostgreSQL

### ตารางหลัก
- **users** - ข้อมูลผู้ใช้และการยืนยันตัวตน
- **user_profiles** - ข้อมูลโปรไฟล์รายละเอียด (แบบไดนามิก)
- **health_metrics** - ค่าตรวจสุขภาพครบครัน
- **health_behaviors** - พฤติกรรมสุขภาพและปัจจัยเสี่ยง
- **medications** - ข้อมูลยาและการจัดการ
- **medication_logs** - ประวัติการทานยา
- **health_assessments** - การประเมินความเสี่ยง AI

### ฟีเจอร์พิเศษฐานข้อมูล
- **Auto-Migration System** - อัปเดต schema อัตโนมัติ
- **Dynamic Column Detection** - ตรวจสอบและปรับ SQL แบบไดนามิก
- **Data Validation** - การตรวจสอบข้อมูลที่เข้มงวด
- **Indexing** - การทำ index สำหรับประสิทธิภาพ

## 🔧 API Endpoints

### Authentication & Profile
- \`POST /api/auth/register\` - สมัครสมาชิก
- \`POST /api/auth/login\` - เข้าสู่ระบบ
- \`GET /api/profile\` - ดูข้อมูลโปรไฟล์
- \`PUT /api/profile\` - อัปเดตโปรไฟล์ (แบบไดนามิก)

### Health Data
- \`GET /api/health-metrics\` - ดูค่าตรวจสุขภาพ
- \`POST /api/health-metrics\` - เพิ่มค่าตรวจสุขภาพ
- \`GET /api/health-behaviors\` - ดูพฤติกรรมสุขภาพ  
- \`POST /api/health-behaviors\` - บันทึกพฤติกรรม
- \`GET /api/health-summary\` - สรุปข้อมูลสุขภาพ

### Medication Management
- \`GET /api/medications\` - ดูรายการยา
- \`POST /api/medications\` - เพิ่มยาใหม่
- \`PUT /api/medications/:id\` - แก้ไขข้อมูลยา
- \`DELETE /api/medications/:id\` - ลบยา
- \`GET /api/medication-logs\` - ดูประวัติการทานยา
- \`POST /api/medication-logs\` - บันทึกการทานยา

### Migration & Setup
- \`POST /api/setup/migrate\` - รัน migration แมนนวล (dev/setup)
- \`GET /api/health\` - ตรวจสอบสถานะระบบ

## 📱 การใช้งานระบบ

### 1. เริ่มต้นใช้งาน
1. **สมัครสมาชิก** - กรอกข้อมูลพื้นฐาน
2. **เข้าสู่ระบบ** - ด้วยอีเมลและรหัสผ่าน
3. **กรอกโปรไฟล์** - ข้อมูลส่วนตัวและการแพทย์
4. **เริ่มบันทึกข้อมูล** - ค่าตรวจและพฤติกรรม

### 2. ใช้งาน Dashboard
- **📊 ภาพรวม**: BMI, ความดัน, ชีพจร, ตรวจล่าสุด
- **🩺 ค่าตรวจสุขภาพ**: บันทึกและดูค่าตรวจครบครัน
- **🏃 พฤติกรรม**: ออกกำลังกาย, นอน, อาหาร, ปัจจัยเสี่ยง
- **📈 แนวโน้มสุขภาพ**: กราฟและการวิเคราะห์
- **🧠 การวิเคราะห์ AI**: คะแนนสุขภาพและคำแนะนำ
- **💊 ติดตามยา**: จัดการยาและแจ้งเตือน
- **👤 โปรไฟล์**: จัดการข้อมูลส่วนตัว

### 3. ระบบติดตามยา
1. **เพิ่มยา** - กรอกข้อมูลยาและเวลา
2. **ตั้งแจ้งเตือน** - ระบบจะแจ้งเตือนอัตโนมัติ
3. **บันทึกการทานยา** - คลิก "ทานแล้ว" เมื่อทานยา
4. **ดูประวัติ** - ติดตามการทานยาย้อนหลัง

### 4. การใช้งาน AI Analytics
- **คะแนนสุขภาพ** - ระบบคำนวณจาก 4 ปัจจัยหลัก
- **คำแนะนำเฉพาะบุคคล** - ตามโรคและยาที่ใช้
- **การประเมินความเสี่ยง** - วิเคราะห์ปัจจัยเสี่ยง
- **แนวโน้มสุขภาพ** - กราฟและการทำนาย

## 🔒 ความปลอดภัยและความเป็นส่วนตัว

### Security Features
- **Password Security**: bcrypt hashing (salt rounds: 10)
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: ตรวจสอบข้อมูลทุกฟิลด์
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Cross-origin request security
- **Environment Security**: ข้อมูลสำคัญใน environment variables

### Privacy & Compliance
- **HIPAA-style Encryption**: การเข้ารหัสข้อมูลสุขภาพ
- **PDPA Compliance**: การปกป้องข้อมูลส่วนบุคคล
- **Data Anonymization**: การทำให้ข้อมูลไม่สามารถระบุตัวได้
- **Secure Storage**: การเก็บข้อมูลอย่างปลอดภัย

## 🧪 การทดสอบและ Debug

### Debug Features
- **Console Logging**: ระบบ log ที่ครอบคลุม
- **Error Handling**: การจัดการข้อผิดพลาดแบบ graceful
- **Health Checks**: ตรวจสอบสถานะระบบ
- **Migration Logs**: ติดตาม migration process

### Testing Data
- **Mock Users**: ระบบ mock data สำหรับทดสอบ
- **Sample Health Data**: ข้อมูลตัวอย่างครบครัน
- **Migration Testing**: ทดสอบการอัปเดต schema

## 🚧 ฟีเจอร์ที่เพิ่งเสร็จ (เวอร์ชันล่าสุด)

### ✅ เสร็จแล้ว
- ✅ **ระบบติดตามยาอัจฉริยะ** - จัดการยาและแจ้งเตือน
- ✅ **AI Analytics** - คะแนนสุขภาพและคำแนะนำ AI
- ✅ **แนวโน้มสุขภาพขั้นสูง** - กราฟ interactive แสดงตั้งแต่ครั้งแรก
- ✅ **ระบบแจ้งเตือนใน App** - Notification system แบบ real-time
- ✅ **รายงาน PDF 2 ภาษา** - รายงานสุขภาพครบครัน
- ✅ **Health Chatbot** - AI ปรึกษาสุขภาพ
- ✅ **Auto-Migration** - อัปเดต database อัตโนมัติ
- ✅ **Dynamic Profile Updates** - ปรับ schema ตามข้อมูล
- ✅ **Advanced Health Tracking** - ปัจจัยเสี่ยงครบครัน

### 🏗️ กำลังพัฒนา
- [ ] **Mobile App** - React Native version
- [ ] **Dark Mode** - โหมดกลางคืน
- [ ] **Multi-language** - รองรับหลายภาษา
- [ ] **Doctor Sharing** - แชร์ข้อมูลกับแพทย์
- [ ] **Export/Import** - นำเข้า/ส่งออกข้อมูล
- [ ] **Telemedicine Integration** - เชื่อมต่อกับแพทย์ออนไลน์

## 🐛 การรายงานปัญหาและการสนับสนุน

### Bug Reporting
- **GitHub Issues**: เปิด issue ใน repository
- **Error Logs**: ระบบ log อัตโนมัติ
- **Debug Info**: ข้อมูล debug ในแต่ละฟีเจอร์

### Support
- **Documentation**: README และ comments ในโค้ด
- **Community**: GitHub Discussions
- **Updates**: ติดตามใน repository

## 📈 Production และ Deployment

### Render Deployment
- **Node.js Service**: Auto-deploy จาก GitHub
- **PostgreSQL**: Managed database service  
- **Environment Variables**: ตั้งค่าผ่าน Render dashboard
- **Auto-Migration**: รันอัตโนมัติเมื่อ deploy

### Performance
- **Database Indexing**: เพิ่มประสิทธิภาพ query
- **Connection Pooling**: จัดการ database connections
- **Error Handling**: Graceful degradation
- **Caching**: ลด load บน database

## 📝 License

MIT License - สามารถใช้งาน แก้ไข และแจกจ่ายได้อย่างเสรี

## 👨‍💻 ผู้พัฒนา

ระบบนี้พัฒนาโดย GitHub Copilot สำหรับการจัดการสุขภาพส่วนบุคคลแบบครบครันและทันสมัย

### เทคโนโลยีใช้ได้จริง 2025
- React 19.x with latest features
- Node.js ESM modules
- PostgreSQL modern features  
- AI-powered health analytics
- Modern security practices
- Cloud-native deployment

---

**🎯 ระบบจัดการสุขภาพที่ทันสมัยและครบครัน พร้อม AI Analytics และการติดตามยาอัจฉริยะ!**

**Happy Health Management! 🚀💊📊**
