# Jiffy Requirement Tracker (New POS Jiffy)

ระบบบันทึก ติดตาม และจัดการ Requirement ของโปรเจกต์ New POS Jiffy (VTec POS Retail) เพื่อส่งมอบให้ทีม Developer
พัฒนา Next.js 15 (App Router) + TypeScript + Tailwind CSS และใช้ Supabase (PostgreSQL + Storage) เป็นฐานข้อมูล
พร้อม Deploy บน Vercel

## ฟีเจอร์

- **สถานะ 4 ขั้น** `New → In Development → Testing → Done`
- **Dashboard** ภาพรวมตามระบบหลัก/โมดูล, ภาระงาน Dev, ประเภท/Priority, High ที่ค้าง และ **SIT Countdown**
- **ขอข้อมูลเพิ่ม** Dev กดปุ่ม "ขอข้อมูลเพิ่ม" ในหน้า Requirement เพื่อถามผู้เปิด Requirement
  ป้าย "ขอข้อมูลเพิ่ม" จะ **กะพริบ** ที่หน้าหลัก (การ์ดบน Dashboard, แท็บภาพรวม, ตาราง) จนกว่าผู้เปิดจะกด "ให้ข้อมูลแล้ว"
- **ไฟล์แนบจาก Dev เก็บใน Google Drive** อัปโหลดจากหน้า Requirement ไฟล์ละไม่เกิน 100 MB (ตั้งค่าตามหัวข้อด้านล่าง)
- **ตาราง Requirement** drill-down ระบบ → โมดูล พร้อมค้นหา/กรอง และจัดการโมดูลได้ในหน้าเดียว
- **แยกตาม Priority แบบ Compact** พร้อมปุ่ม "ดูรายละเอียด"
- **เรียง A→Z / Z→A ได้ทุกคอลัมน์** ในทุกตาราง (คลิกหัวคอลัมน์)
- **รายชื่อ Dev แยกจากรายชื่อผู้ขอ** เพิ่มได้เองจากฟอร์ม
- **วันที่-เวลาที่เปิด Requirement** บันทึกพร้อมเวลา
- **ประวัติการดำเนินงาน & ความเห็น** (เปลี่ยนสถานะ, ขอ/ให้ข้อมูล, แนบไฟล์, คอมเมนต์)
- **แนบภาพ Wireframe** กด `Ctrl+V` วางจาก Clipboard ได้ (เก็บใน Supabase Storage)
- **Req ID รันอัตโนมัติโดยฐานข้อมูล** (`JFY-REQ-01, 02, ...`) ไม่ซ้ำแม้หลายคนสร้างพร้อมกัน
- **Export Excel** (.xlsx)
- **Demo mode**: ถ้ายังไม่ตั้งค่า Supabase ระบบยังใช้งานได้ โดยเก็บข้อมูลใน localStorage ของเบราว์เซอร์

> ระบบไม่มี Login (ออกแบบเป็น internal tool) ชื่อที่ใช้ในประวัติมาจากชื่อที่เลือกในฟอร์ม/ช่องคอมเมนต์
> RLS ของ Supabase จึงเปิดให้ anon key ทำได้ทุกอย่าง ใครมี URL ก็แก้/ลบข้อมูลได้ — หากต้องการจำกัด
> ให้เพิ่ม Supabase Auth แล้วเปลี่ยน policy ใน `supabase/requirement_schema.sql` เป็น `TO authenticated`
> (ปุ่มอัปโหลดไฟล์ไป Google Drive ก็เปิดให้ผู้ที่เข้าหน้าเว็บได้เช่นกัน จึงจำกัดขนาดและชนิดไฟล์ไว้)

## โครงสร้างโค้ด

```
src/
  app/page.tsx               หน้าหลัก (ประกอบ view + modal)
  app/api/drive/             API ฝั่งเซิร์ฟเวอร์สำหรับ Google Drive (status, upload-session)
  hooks/useTracker.ts        state + actions ทั้งหมด
  lib/data/                  ชั้นข้อมูล: store.ts (interface) · supabaseStore.ts · localStore.ts (demo) · mappers.ts
  lib/drive.ts, driveClient.ts   Google Drive (server / browser)
  lib/sort.ts                เรียง A-Z / Z-A ทุกคอลัมน์
  components/                Dashboard, Explorer, PriorityList, Form/Detail modal, Badges, SortHeader, ...
  types/index.ts             types + ค่าคงที่
supabase/requirement_schema.sql   schema + seed (รันซ้ำได้ / migrate จากเวอร์ชันเก่าได้)
```

## เริ่มใช้งาน

### 1) เตรียม Supabase
เปิด **SQL Editor** แล้วรันไฟล์ [`supabase/requirement_schema.sql`](supabase/requirement_schema.sql) ทั้งไฟล์
(รันซ้ำได้ปลอดภัย รวมถึงบนโปรเจกต์ที่เคยรัน schema เวอร์ชันเก่ามาแล้ว) สคริปต์จะ:

- สร้างตาราง `requirement_files`, `requirement_developers` และคอลัมน์ "ขอข้อมูลเพิ่ม" (`info_requested`, ...)
- **ย้ายสถานะเดิม** `Draft` / `In Review` → `New` และปรับข้อกำหนดสถานะเป็น `New, In Development, Testing, Done`
- คอลัมน์ `target_version` / `remark` ยังอยู่ในฐานข้อมูลแต่แอปไม่ใช้แล้ว (ไม่ลบข้อมูลเดิม)
- ใช้ตาราง `requirement_*` แยกต่างหาก จึงไม่ไปแตะตาราง `modules` / `team_members` ของ Issue Tracker

### 2) ตั้งค่า Environment Variables
คัดลอก `.env.example` เป็น `.env.local`

| ตัวแปร | จำเป็น | หมายเหตุ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | publishable / anon key (**ห้ามใช้ secret / service role key**) |
| `NEXT_PUBLIC_PROJECT_START` / `NEXT_PUBLIC_SIT_DATE` | ไม่บังคับ | วันเริ่มโปรเจกต์ / วัน SIT (`YYYY-MM-DD`) |
| `NEXT_PUBLIC_CLOUD_HQ_URL` | ไม่บังคับ | ลิงก์ปุ่ม Cloud HQ |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` | สำหรับอัปโหลดไฟล์ | ดูด้านล่าง (ฝั่งเซิร์ฟเวอร์เท่านั้น **ห้ามใส่คำนำหน้า `NEXT_PUBLIC_`**) |
| `GOOGLE_DRIVE_MAX_MB` | ไม่บังคับ | ขนาดไฟล์สูงสุด (ค่าเริ่มต้น 100) |

### 3) ตั้งค่า Google Drive (เก็บไฟล์ที่ Dev แนบ)
ไฟล์จะถูกอัปโหลดตรงจากเบราว์เซอร์ไปยังโฟลเดอร์ใน Google Drive ของบัญชีเดียวที่ตั้งค่าไว้ (ใช้พื้นที่ของบัญชีนั้น)

1. สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บไฟล์ แล้วแชร์ให้ทีมที่ต้องเปิดดูไฟล์ ค่า **Folder ID** คือส่วนท้ายของลิงก์โฟลเดอร์ → `GOOGLE_DRIVE_FOLDER_ID`
2. [Google Cloud Console](https://console.cloud.google.com/) → สร้างโปรเจกต์ → เปิดใช้ **Google Drive API**
3. **OAuth consent screen** → เลือกประเภทผู้ใช้ แล้วเพิ่มบัญชีเจ้าของโฟลเดอร์เป็น Test user
4. **Credentials → Create credentials → OAuth client ID** (ชนิด *Web application*) เพิ่ม Redirect URI `https://developers.google.com/oauthplayground` → ได้ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
5. เปิด [OAuth Playground](https://developers.google.com/oauthplayground) → ⚙ เลือก *Use your own OAuth credentials* ใส่ค่าจากข้อ 4 → เลือก scope
   `https://www.googleapis.com/auth/drive` → Authorize ด้วยบัญชีเจ้าของโฟลเดอร์ → *Exchange authorization code for tokens* → คัดลอก **Refresh token** → `GOOGLE_REFRESH_TOKEN`
6. ใส่ 4 ค่านี้ใน Vercel (Settings → Environment Variables, Production) แล้ว Redeploy

> ถ้า OAuth consent ยังเป็นโหมด *Testing* ตัว Refresh token จะหมดอายุใน 7 วัน ให้เปลี่ยนเป็น *In production* (หรือใช้บัญชี Google Workspace ขององค์กรแบบ Internal)

### 4) รันบนเครื่อง
```bash
npm install
npm run dev        # http://localhost:3001
npm run typecheck
npm run build
```

## Deploy บน Vercel
1. Import repo `kjvtec/jiffy-requirement-tracker` ที่ [Vercel](https://vercel.com/new) (Framework: Next.js ตรวจจับอัตโนมัติ)
2. ใส่ Environment Variables ข้างบน
3. Deploy — หรือใช้ CLI: `npx vercel --prod`

> `NEXT_PUBLIC_*` ถูกฝังตอน build ดังนั้นเปลี่ยนค่าแล้วต้อง Redeploy
