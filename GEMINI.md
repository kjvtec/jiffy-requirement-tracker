# กติกาและข้อกำหนดการทำงาน (Project & Delivery Rules)

## 1. กติกาการส่งมอบงาน (Mandatory Delivery Policy)
ทุกครั้งที่ส่งมอบงาน หรือทำงานเสร็จตามคำขอของผู้ใช้:
1. **ต้อง Build ตรวจสอบก่อน:** รัน `npm run build` ให้ผ่านสมบูรณ์ (Exit code 0, ไม่พบ Type/Syntax error)
2. **ต้อง Git Commit & Push:** ทำการ commit ด้วยข้อความภาษาอังกฤษที่ชัดเจน และ `git push origin main` ทุกครั้ง
3. **ต้อง Deploy ขึ้น Vercel (Production):**
   - ตรวจสอบสถานะการ Deploy บน Vercel จนพร้อมใช้งาน (`● Ready` ใน Production)
   - หากต้องรัน Deploy ด้วย CLI ให้รัน `npx vercel --prod --yes` ทันที
   - แจ้งสถานะและลิงก์ Production ให้ผู้ใช้ทราบทุกครั้งในการส่งมอบงาน

## 2. ความปลอดภัยและข้อมูล (Security & Credentials)
- ห้ามแตะต้องหรือแก้ไขไฟล์ `.env.local`
- ห้าม hard-code Secret Key, Service Role Key หรือ Credentials ลงในโค้ด
- SQL ใหม่ให้เขียนเป็นไฟล์ Migration ในโฟลเดอร์ `supabase/` แบบ idempotent (ห้ามรันกับฐานข้อมูลจริง ให้ผู้ใช้รันเอง)

## 3. ดีไซน์และพฤติกรรมระบบเดิม
- คงไว้ซึ่งธีมสี Jiffy CI (Navy `#0C2553`, Blue `#044492`/`#0086FF`, Yellow `#FFCB06`)
- ห้ามกระทบฟังก์ชันเดิมที่ไม่เกี่ยวข้อง (เช่น Delete Guard Overlay, Excel Export, SIT Countdown)
