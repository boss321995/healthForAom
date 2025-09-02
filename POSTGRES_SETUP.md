# ขั้นตอนการสร้าง PostgreSQL Database บน Render

## 🗄️ การเลือกและตั้งค่า

### 1. จากหน้า "New +" เลือก **"PostgreSQL"**

### 2. ตั้งค่าฐานข้อมูล:

```
Name: health-management-db
Database: health_management  
User: health_user
Region: Singapore (หรือ Oregon)
Plan: Free (90 days)
```

### 3. ข้อมูลเพิ่มเติม (Optional):
- Version: PostgreSQL 15 (latest)
- Backup retention: 7 days (default for free)

### 4. คลิก "Create Database"

---

## 🔍 หลังจากสร้างเสร็จ คุณจะได้:

### Connection Info:
```
Hostname: dpg-xxxxxxxx-a.singapore-postgres.render.com
Port: 5432
Database: health_management
Username: health_user  
Password: xxxxxxxxxxxxxxxxxxxx (generated)
```

### Connection String:
```
postgresql://health_user:password@dpg-xxx-a.singapore-postgres.render.com/health_management
```

---

## ⚠️ สำคัญ: 

**เก็บข้อมูลเหล่านี้ไว้** เพื่อใส่ใน Web Service Environment Variables:

```
DB_HOST = dpg-xxxxxxxx-a.singapore-postgres.render.com
DB_USER = health_user
DB_PASSWORD = xxxxxxxxxxxxxxxxxxxx  
DB_NAME = health_management
DB_SSL = true
```

---

**เลือก PostgreSQL และดำเนินการต่อได้เลยครับ!** 🚀
