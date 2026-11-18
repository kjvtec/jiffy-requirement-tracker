# Jiffy Requirement Tracker (New POS Jiffy)

ระบบบันทึก ติดตาม และจัดการ Requirement ของโปรเจกต์ New POS Jiffy (VTec POS Retail) เพื่อส่งมอบให้ทีม Developer
พัฒนา Next.js 15 (App Router) + TypeScript + Tailwind CSS และใช้ Supabase (PostgreSQL + Storage) เป็นฐานข้อมูล
พร้อม Deploy บน Vercel

## ฟีเจอร์

- **Kanban Board 5 สถานะ** `Draft → In Review → In Development → Testing → Done` ลากการ์ดหรือกด "ส่งต่อ" ได้ทันที
- **Dashboard** ภาพรวมตาม Core Function, ภาระงาน Dev, ประเภท/Priority, รายการ High ที่ค้าง และ **SIT Countdown**
- **ตาราง Requirement** แบบ drill-down Core Function → Module พร้อมค้นหา/กรอง และจัดการ Module
- **แยกตาม Priority** (High / Medium / Low)
- **ประวัติการดำเนินงาน & ความเห็น** ในแต่ละ Requirement (ใครเปลี่ยนสถานะ เมื่อไร + คอมเมนต์ทีม)
- **แนบภาพ Wireframe/Mockup** กด `Ctrl+V` วางจาก Clipboard, ลากวาง, บีบอัดก่อนอัปโหลด, ดูแบบ Lightbox
- **Req ID รันอัตโนมัติ** (`JFY-REQ-01, 02, ...`) โดยฐานข้อมูล จึงไม่ซ้ำแม้หลายคนสร้างพร้อมกัน
- **Export Excel** (.xlsx) ทั้งหมดหรือตามที่กรอง
- **Demo mode**: ถ้ายังไม่ตั้งค่า Supabase ระบบยังใช้งานได้ โดยเก็บข้อมูลไว้ใน localStorage ของเบราว์เซอร์

> ระบบไม่มี Login (ออกแบบเป็น internal tool) เลือก "ฉันคือ …" มุมขวาบนเพื่อบันทึกชื่อลงประวัติ
> RLS ของ Supabase จึงเปิดให้ anon key ทำได้ทุกอย่าง ใครมี URL ก็แก้/ลบข้อมูลได้ — หากต้องการจำกัด
> ให้เพิ่ม Supabase Auth แล้วเปลี่ยน policy ใน `supabase/requirement_schema.sql` เป็น `TO authenticated`

## โครงสร้างโค้ด

```
src/
  app/page.tsx               หน้าหลัก (ประกอบ view + modal เท่านั้น)
  hooks/useTracker.ts        state + actions ทั้งหมด (โหลด/บันทึก/สถานะ/module/team/toast)
  lib/data/                  ชั้นข้อมูล: store.ts (interface) · supabaseStore.ts · localStore.ts (demo) · mappers.ts
  lib/excel.ts               สร้างไฟล์ Excel
  components/                Dashboard, Kanban, Explorer, PriorityList, Form/Detail modal, ...
  types/index.ts             types + ค่าคงที่ (Core Function, Status, Module เริ่มต้น)
supabase/requirement_schema.sql   schema + seed (รันซ้ำได้ / migrate จากเวอร์ชันเก่าได้)
```

## เริ่มใช้งาน

### 1) เตรียม Supabase
เปิด **SQL Editor** แล้วรันไฟล์ [`supabase/requirement_schema.sql`](supabase/requirement_schema.sql) ทั้งไฟล์
(รันซ้ำได้ปลอดภัย รวมถึงบนโปรเจกต์ที่เคยรัน schema เวอร์ชันเก่ามาแล้ว) จะสร้าง
`requirements`, `requirement_images`, `requirement_activity`, `modules`, `team_members`,
sequence ของ Req ID และ Storage bucket `requirement-attachments`

### 2) ตั้งค่า Environment Variables
คัดลอก `.env.example` เป็น `.env.local`

| ตัวแปร | จำเป็น | หมายเหตุ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon / public key (**ห้ามใช้ service role key**) |
| `NEXT_PUBLIC_PROJECT_START` / `NEXT_PUBLIC_SIT_DATE` | ไม่บังคับ | วันเริ่มโปรเจกต์ / วัน SIT (`YYYY-MM-DD`) |
| `NEXT_PUBLIC_CLOUD_HQ_URL` | ไม่บังคับ | ลิงก์ปุ่ม Cloud HQ |

### 3) รันบนเครื่อง
```bash
npm install
npm run dev        # http://localhost:3001
npm run typecheck
npm run build
```

## Deploy บน Vercel
1. Import repo `kjvtec/jiffy-requirement-tracker` ที่ [Vercel](https://vercel.com/new) (Framework: Next.js ตรวจจับอัตโนมัติ)
2. ใส่ Environment Variables ข้างบนอย่างน้อย 2 ตัวแรก (ทั้ง Production และ Preview)
3. Deploy — หรือใช้ CLI: `npx vercel --prod`

> `NEXT_PUBLIC_*` ถูกฝังตอน build ดังนั้นเปลี่ยนค่าแล้วต้อง Redeploy
