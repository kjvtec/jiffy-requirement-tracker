# Jiffy Requirement Tracker ( New Pos Jiify)

ระบบบันทึก ติดตาม และจัดการ Requirement / ข้อกำหนดความต้องการระบบสำหรับส่งมอบให้ทีม Developer พัฒนาต่อ พัฒนาด้วย **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, และเชื่อมต่อกับ **Supabase (PostgreSQL + Cloud Storage)** ออกแบบมาให้ทำงานร่วมกับทีมได้อย่างรวดเร็ว รองรับการแปะภาพหน้าจอ/Wireframe ด้วย `Ctrl + V` และพร้อม Deploy ขึ้น **Vercel**

---

## 🌟 ฟีเจอร์เด่น (Key Features)

1. **Kanban Board 5 ขั้นตอนสำหรับ Requirement**
   - ติดตามกระบวนการตามสถานะ: `Draft` ➔ `In Review` ➔ `In Development` ➔ `Testing` ➔ `Done`
   - สามารถกดส่งต่องานไปยังขั้นตอนถัดไปได้ในคลิกเดียว
2. **Table / Data Grid View คล่องตัว**
   - ค้นหาแบบ Realtime (Req ID, หัวข้อ, รายละเอียด, ผู้ขอ, หรือ Dev)
   - ตัวกรองครบวงจร: กรองตาม Status, Priority, Core Function, และ Dev Assigned
   - แสดงสีแยกตาม Priority (`1.High`, `2.Medium`, `3.Low`)
3. **ระบบแนบภาพอัจฉริยะ (Smart Image Uploader)**
   - **กด Ctrl + V เพื่อแปะรูป Wireframe / Mockup จาก Clipboard ได้ทันที**
   - มี Lightbox Modal สำหรับขยายดูภาพขนาดใหญ่เต็มจอพร้อมปุ่มซูม
   - บีบอัดรูปก่อนส่งขึ้น Cloud Storage ช่วยประหยัดพื้นที่และโหลดเร็ว
4. **Dev & Release Tracking**
   - มีฟิลด์ระบุ **Dev ผู้รับผิดชอบ (Dev Assigned)**
   - มีฟิลด์ระบุ **Target Version / Sprint** สำหรับติดตามรอบการ Release
5. **Excel Integration**
   - **Export to Excel (.xlsx)**: ดาวน์โหลดรายการ Requirement ทั้งหมดหรือตามที่กรองเป็นไฟล์ Excel สรุปผลได้ทันที

---

## 🛠️ โครงสร้างเทคโนโลยี (Tech Stack)

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Excel Handling**: ExcelJS
- **Image Processing**: `browser-image-compression`
- **Database & Storage**: Supabase (PostgreSQL + Storage Bucket `requirement-attachments`)
- **Hosting / Deployment**: Vercel

---

## 🚀 ขั้นตอนการเปิดใช้งานระบบ (Getting Started)

### ขั้นตอนที่ 1: เตรียมตารางบน Supabase
1. เข้าไปที่ [Supabase SQL Editor](https://supabase.com/dashboard/project/cnzthrnkyumhgsomszwu/sql/new)
2. คัดลอกโค้ดจากไฟล์ [`supabase/requirement_schema.sql`](file:///d:/BizConecX/RequirementTracker/supabase/requirement_schema.sql) ทั้งหมดไปวาง
3. กดปุ่ม **RUN** เพื่อสร้างตาราง `requirements`, `requirement_images` และ Storage Bucket `requirement-attachments`

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables
ตรวจสอบไฟล์ `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

### ขั้นตอนที่ 3: สตาร์ทโปรเจกต์บนเครื่อง (Local)
```bash
npm install
npm run dev
```
เปิดบราวเซอร์ไปที่: **http://localhost:3001** *(พอร์ต 3001 จะไม่ชนกับ Issue Tracker พอร์ต 3000)*

---

## ☁️ ขั้นตอนการ Deploy ขึ้น Vercel

### วิธีที่ 1: Deploy ผ่าน GitHub (แนะนำ)
1. สร้าง New Repository บน GitHub (เช่น `kjvtec/jiffy-requirement-tracker`)
2. Push โค้ดจากโฟลเดอร์นี้ขึ้น GitHub:
   ```bash
   git remote add origin https://github.com/<username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
3. เข้า [Vercel Dashboard](https://vercel.com/dashboard) กด **Add New Project** แล้วเลือก Repository นั้น
4. ในหน้าตั้งค่า Environment Variables ให้เพิ่ม:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. กดปุ่ม **Deploy**

### วิธีที่ 2: Deploy ผ่าน Vercel CLI
```bash
npx vercel
```
ทำตามขั้นตอนบน Terminal เพื่อเข้าสู่ระบบและสั่ง Deploy ได้ทันที
