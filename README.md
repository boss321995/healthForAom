# 🏥 Health Management System

ระบบจัดการสุขภาพส่วนบุคคล ที่สร้างด้วย React.js, Node.js, และ MySQL

## ✨ ฟีเจอร์หลัก

### 🔐 ระบบยืนยันตัวตน
- สมัครสมาชิก / เข้าสู่ระบบ
- การเข้ารหัสรหัสผ่านด้วย bcrypt
- JSON Web Token (JWT) authentication
- Session management

### 👤 ระบบจัดการโปรไฟล์
- ข้อมูลส่วนตัว (ชื่อ, อายุ, เพศ)
- ข้อมูลทางกายภาพ (ส่วนสูง, น้ำหนัก, กรุ๊ปเลือด)
- การคำนวณ BMI อัตโนมัติ
- ข้อมูลติดต่อฉุกเฉิน

### 📊 ระบบติดตามสุขภาพ
- บันทึกค่าตรวจสุขภาพ (ความดัน, น้ำตาล, คอเลสเตอรอล)
- ติดตามพฤติกรรมสุขภาพ (การออกกำลังกาย, การสูบบุหรี่, การนอน)
- แสดงกราฟและแนวโน้มสุขภาพ
- การประเมินความเสี่ยงโรค

### 🎯 ระบบเป้าหมายสุขภาพ
- ตั้งเป้าหมายส่วนบุคคล
- ติดตามความคืบหน้า
- แจ้งเตือนและข้อแนะนำ

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **React.js 19.x** - UI Framework
- **Tailwind CSS 3.x** - Styling
- **Axios** - HTTP Client
- **React Context** - State Management

### Backend
- **Node.js** - Runtime Environment
- **Express.js** - Web Framework
- **MySQL 8.x** - Database
- **JWT** - Authentication
- **bcrypt** - Password Encryption

### Dev Tools
- **Webpack 5** - Module Bundler
- **Babel** - JavaScript Compiler
- **PostCSS** - CSS Processing

## 🚀 การติดตั้งและใช้งาน

### 1. ข้อกำหนดระบบ
- Node.js v16+ 
- MySQL 8.x
- Git

### 2. Clone โปรเจกต์
\`\`\`bash
git clone <repository-url>
cd health-management-system
\`\`\`

### 3. ติดตั้ง Dependencies
\`\`\`bash
npm install
\`\`\`

### 4. ตั้งค่าฐานข้อมูล
1. สร้างฐานข้อมูล MySQL
2. Import ไฟล์ \`database/health_management.sql\`
3. ตั้งค่าการเชื่อมต่อในไฟล์ \`.env\`

### 5. ตั้งค่า Environment Variables
สร้างไฟล์ \`.env\` และกรอกข้อมูล:
\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=health_management

# JWT Configuration
JWT_SECRET=your_super_secret_key

# Server Configuration
PORT=5000
NODE_ENV=development
\`\`\`

### 6. รันระบบ

#### Backend Server (Terminal 1)
\`\`\`bash
cd server
node index.js
\`\`\`

#### Frontend Development Server (Terminal 2)
\`\`\`bash
npm start
\`\`\`

### 7. เข้าใช้งานระบบ
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 📁 โครงสร้างโปรเจกต์

\`\`\`
health-management-system/
├── database/
│   └── health_management.sql      # Database schema
├── server/
│   └── index.js                   # Backend API server
├── src/
│   ├── components/
│   │   ├── Login.js               # Login component
│   │   ├── Register.js            # Register component
│   │   └── Dashboard.js           # Main dashboard
│   ├── contexts/
│   │   └── AuthContext.js         # Authentication context
│   ├── App.js                     # Main React component
│   ├── index.js                   # React entry point
│   └── index.css                  # Tailwind CSS imports
├── public/
│   └── index.html                 # HTML template
├── .env                           # Environment variables
├── package.json                   # Dependencies
├── webpack.config.js              # Webpack configuration
├── tailwind.config.js             # Tailwind configuration
└── postcss.config.js              # PostCSS configuration
\`\`\`

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก
- **users** - ข้อมูลผู้ใช้พื้นฐาน
- **user_profiles** - ข้อมูลโปรไฟล์รายละเอียด
- **health_metrics** - ค่าตรวจสุขภาพ
- **health_behaviors** - พฤติกรรมสุขภาพ
- **health_assessments** - การประเมินความเสี่ยง

### ฟีเจอร์พิเศษ
- **Auto BMI Calculation** - คำนวณ BMI อัตโนมัติ
- **Reference Values** - ค่ามาตรฐานทางการแพทย์
- **Health Risk Assessment** - การประเมินความเสี่ยงโรค
- **Activity Logging** - บันทึกการใช้งานระบบ

## 🔧 API Endpoints

### Authentication
- \`POST /api/auth/register\` - สมัครสมาชิก
- \`POST /api/auth/login\` - เข้าสู่ระบบ

### Profile Management
- \`GET /api/profile\` - ดูข้อมูลโปรไฟล์
- \`PUT /api/profile\` - อัปเดตโปรไฟล์

### Health Data
- \`GET /api/health-metrics\` - ดูค่าตรวจสุขภาพ
- \`POST /api/health-metrics\` - เพิ่มค่าตรวจสุขภาพ
- \`GET /api/health-behaviors\` - ดูพฤติกรรมสุขภาพ
- \`POST /api/health-behaviors\` - บันทึกพฤติกรรม

### Health Assessment
- \`GET /api/health-summary\` - สรุปข้อมูลสุขภาพ
- \`POST /api/calculate-bmi\` - คำนวณ BMI
- \`GET /api/risk-assessment\` - ประเมินความเสี่ยง

## 📱 การใช้งาน

### 1. สมัครสมาชิก
1. เข้าหน้าแรกของระบบ
2. คลิก "สมัครสมาชิก"
3. กรอกข้อมูล: ชื่อผู้ใช้, อีเมล, รหัสผ่าน
4. ยืนยันรหัสผ่าน
5. คลิก "สมัครสมาชิก"

### 2. เข้าสู่ระบบ
1. กรอกชื่อผู้ใช้ หรือ อีเมล
2. กรอกรหัสผ่าน
3. คลิก "เข้าสู่ระบบ"

### 3. ใช้งาน Dashboard
- **ภาพรวม**: ดูสรุปข้อมูลสุขภาพ, BMI, ความดัน
- **ค่าตรวจสุขภาพ**: บันทึกและดูประวัติการตรวจ
- **พฤติกรรม**: บันทึกการออกกำลังกาย, การนอน, การสูบบุหรี่
- **โปรไฟล์**: จัดการข้อมูลส่วนตัว

## 🔒 ความปลอดภัย

- Password hashing ด้วย bcrypt (salt rounds: 10)
- JWT token authentication
- Input validation และ sanitization
- SQL injection prevention
- CORS protection
- Session timeout management

## 🧪 ข้อมูลทดสอบ

### ผู้ใช้ตัวอย่าง (รหัสผ่าน: "password123")
- **Admin**: admin@health-app.com
- **User**: john@example.com
- **User**: jane@example.com

## 🚧 ฟีเจอร์ที่กำลังพัฒนา

- [ ] ระบบกราฟแสดงแนวโน้มสุขภาพ
- [ ] ระบบแจ้งเตือนการตรวจสุขภาพ
- [ ] การส่งออกรายงานสุขภาพ
- [ ] ระบบแบ่งปันข้อมูลกับแพทย์
- [ ] Mobile responsive design
- [ ] Dark mode support
- [ ] Multi-language support

## 🐛 การรายงานปัญหา

หากพบปัญหาการใช้งาน กรุณาเปิด Issue ใน GitHub repository

## 📝 License

MIT License - สามารถใช้งาน แก้ไข และแจกจ่ายได้อย่างเสรี

## 👨‍💻 ผู้พัฒนา

ระบบนี้พัฒนาโดย GitHub Copilot สำหรับการจัดการสุขภาพส่วนบุคคล

---

**Happy Coding! 🚀**
