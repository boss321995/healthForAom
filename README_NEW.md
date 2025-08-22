# 🏥 Health Assessment Platform

ระบบประเมินสุขภาพออนไลน์ที่ครอบคลุม สำหรับการตรวจวิเคราะห์สุขภาพ คำนวณ BMI และประเมินความเสี่ยงโรคต่างๆ

## ✨ คุณสมบัติหลัก

### 🎯 การประเมินสุขภาพ
- **แบบประเมินสุขภาพ 3 ขั้นตอน**: ข้อมูลพื้นฐาน, ค่าตรวจเลือด, พฤติกรรมสุขภาพ
- **คำนวณ BMI อัตโนมัติ**: ประเมินดัชนีมวลกายและหมวดหมู่น้ำหนัก
- **วิเคราะห์ความเสี่ยงโรค**: เบาหวาน, โรคหัวใจ, ความดันโลหิตสูง
- **คำแนะนำสุขภาพ**: แนวทางการดูแลสุขภาพเฉพาะบุคคล

### 👥 ระบบผู้ใช้
- **หน้าแรกสาธารณะ**: เข้าถึงได้โดยไม่ต้องลงทะเบียน
- **ระบบสมาชิก**: ลงทะเบียนและเข้าสู่ระบบแบบปลอดภัย
- **Dashboard ส่วนตัว**: จัดการข้อมูลสุขภาพและประวัติการตรวจ

### 📊 การติดตามและวิเคราะห์
- **Google Analytics**: ติดตามการใช้งานและพฤติกรรมผู้ใช้
- **การติดตาม Events**: การประเมิน, การลงทะเบียน, การใช้ฟีเจอร์ต่างๆ

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **React 19.x**: JavaScript library สำหรับ UI
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **Axios**: HTTP client สำหรับ API calls

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MySQL 8.x**: ฐานข้อมูลสำหรับเก็บข้อมูลผู้ใช้และสุขภาพ
- **JWT**: JSON Web Tokens สำหรับ authentication
- **bcrypt**: การเข้ารหัสรหัสผ่าน

### เครื่องมือพัฒนา
- **Webpack 5**: Module bundler
- **Babel**: JavaScript compiler
- **PostCSS**: CSS processing

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดระบบ
- Node.js 16.x หรือสูงกว่า
- MySQL 8.0 หรือสูงกว่า
- npm หรือ yarn

### 1. Clone โปรเจค
```bash
git clone <repository-url>
cd health-assessment-platform
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่าฐานข้อมูล
```bash
# สร้างฐานข้อมูล MySQL
mysql -u root -p
CREATE DATABASE health_management;

# Import schema
mysql -u root -p health_management < database/health_management.sql
```

### 4. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` และแก้ไขค่าต่อไปนี้:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=health_management

# JWT Configuration
JWT_SECRET=your_super_secret_key

# Server Configuration
PORT=5000

# Environment
NODE_ENV=development

# Google Analytics (เปลี่ยนเป็น Tracking ID จริง)
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 5. เริ่มต้นการใช้งาน

#### Development Mode
```bash
# เริ่ม Backend Server
npm run server

# เริ่ม Frontend Development Server (Terminal ใหม่)
npm start
```

#### Production Build
```bash
# Build สำหรับ Production
npm run build

# เริ่ม Production Server
npm run server:prod
```

### 6. เข้าถึงแอปพลิเคชัน
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📱 การใช้งาน

### สำหรับผู้ใช้ทั่วไป
1. เข้าสู่หน้าแรก
2. คลิค "เริ่มประเมินสุขภาพ"
3. กรอกข้อมูลใน 3 ขั้นตอน
4. ดูผลการประเมินและคำแนะนำ

### สำหรับสมาชิก
1. สมัครสมาชิก หรือ เข้าสู่ระบบ
2. เข้า Dashboard ส่วนตัว
3. จัดการข้อมูลส่วนตัวและประวัติสุขภาพ
4. ดูการติดตามสุขภาพต่อเนื่อง

## 🗂️ โครงสร้างโปรเจค
```
health-assessment-platform/
├── database/
│   └── health_management.sql       # Database schema
├── server/
│   └── index.js                   # Express.js API server
├── src/
│   ├── components/
│   │   ├── LandingPage.js        # หน้าแรกสาธารณะ
│   │   ├── HealthAssessmentForm.js # แบบประเมินสุขภาพ
│   │   ├── Login.js              # หน้าเข้าสู่ระบบ
│   │   ├── Register.js           # หน้าสมัครสมาชิก
│   │   └── Dashboard.js          # หน้า Dashboard สมาชิก
│   ├── contexts/
│   │   └── AuthContext.js        # Authentication context
│   ├── utils/
│   │   └── analytics.js          # Google Analytics utilities
│   └── App.js                    # Main application component
├── public/
│   └── index.html               # HTML template with GA
└── package.json                 # Dependencies and scripts
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ

### Health Data
- `GET /api/health/profile` - ดูข้อมูลสุขภาพ
- `POST /api/health/metrics` - บันทึกค่าตรวจสุขภาพ
- `GET /api/health/assessment` - ดูผลการประเมิน

### Utilities
- `POST /api/health/calculate-bmi` - คำนวณ BMI
- `POST /api/health/risk-assessment` - ประเมินความเสี่ยง

## 📊 Google Analytics Events

### การติดตามอัตโนมัติ
- **Page Views**: ทุกหน้าที่เยี่ยมชม
- **Assessment Start**: เริ่มทำแบบประเมิน
- **Assessment Complete**: ทำแบบประเมินเสร็จ
- **User Registration**: สมัครสมาชิกใหม่
- **User Login**: เข้าสู่ระบบ
- **Feature Views**: การใช้ฟีเจอร์ต่างๆ

## 🔒 ความปลอดภัย

- **JWT Authentication**: ระบบยืนยันตัวตนแบบ Token
- **Password Hashing**: เข้ารหัสรหัสผ่านด้วย bcrypt
- **Input Validation**: ตรวจสอบข้อมูลป้อนเข้า
- **CORS Protection**: ป้องกันการเข้าถึงจากโดเมนอื่น

## ⚠️ ข้อจำกัดความรับผิดชอบ

ระบบนี้เป็นเครื่องมือประเมินสุขภาพเบื้องต้นเท่านั้น ไม่สามารถใช้แทนการวินิจฉัยทางการแพทย์ได้ หากมีความกังวลเกี่ยวกับสุขภาพ ควรปรึกษาแพทย์ผู้เชี่ยวชาญ

## 🤝 การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ Issues ใน repository
2. สร้าง Issue ใหม่พร้อมรายละเอียดปัญหา
3. ติดต่อทีมพัฒนา

## 📄 License

MIT License - ดูรายละเอียดใน LICENSE file

---

🏥 **Health Assessment Platform** - เพื่อสุขภาพที่ดีของทุกคน
