export const metadata = { title: 'นโยบายความเป็นส่วนตัว | Jiffy Requirement Tracker' };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-slate-800 leading-relaxed space-y-4">
      <h1 className="text-2xl font-bold text-jiffy-navy">นโยบายความเป็นส่วนตัว</h1>
      <p>
        Jiffy Requirement Tracker เป็นเครื่องมือภายในทีมสำหรับบันทึกและติดตาม Requirement ของโปรเจกต์ New POS Jiffy
        ไม่เปิดให้บุคคลทั่วไปสมัครใช้งาน
      </p>
      <h2 className="text-lg font-semibold">ข้อมูลที่เก็บ</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>ข้อมูล Requirement ที่ทีมกรอก เช่น หัวข้อ รายละเอียด ชื่อผู้ขอ ชื่อ Dev วันที่-เวลา และประวัติการดำเนินงาน</li>
        <li>รูปภาพประกอบที่แนบ (เก็บใน Supabase Storage)</li>
        <li>ไฟล์ที่ Dev แนบ (เก็บในโฟลเดอร์ Google Drive ของผู้ดูแลระบบ)</li>
      </ul>
      <h2 className="text-lg font-semibold">การเข้าถึง Google Drive</h2>
      <p>
        ระบบใช้สิทธิ์ของบัญชี Google ผู้ดูแลเพียงบัญชีเดียวเพื่ออัปโหลดไฟล์ลงโฟลเดอร์ที่กำหนดเท่านั้น
        ไม่อ่านหรือเผยแพร่ข้อมูลอื่นใน Drive และไม่ขายหรือแบ่งปันข้อมูลให้บุคคลภายนอก
      </p>
      <h2 className="text-lg font-semibold">ติดต่อ</h2>
      <p>ผู้ดูแลระบบ: kraijateios@gmail.com</p>
    </main>
  );
}
