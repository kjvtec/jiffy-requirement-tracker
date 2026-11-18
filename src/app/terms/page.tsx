export const metadata = { title: 'ข้อกำหนดการใช้งาน | Jiffy Requirement Tracker' };

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-slate-800 leading-relaxed space-y-4">
      <h1 className="text-2xl font-bold text-jiffy-navy">ข้อกำหนดการใช้งาน</h1>
      <p>
        Jiffy Requirement Tracker เป็นเครื่องมือภายในสำหรับทีมโปรเจกต์ New POS Jiffy ใช้เพื่อบันทึกและติดตาม Requirement เท่านั้น
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>ผู้ใช้ควรกรอกข้อมูลที่ถูกต้องและเกี่ยวข้องกับโปรเจกต์</li>
        <li>ห้ามอัปโหลดไฟล์ที่เป็นอันตราย ผิดกฎหมาย หรือไม่เกี่ยวข้องกับงาน</li>
        <li>ผู้ดูแลระบบอาจลบหรือแก้ไขข้อมูลเพื่อรักษาความถูกต้องและความปลอดภัยของระบบ</li>
        <li>ระบบให้บริการตามสภาพ ไม่มีการรับประกันความพร้อมใช้งานตลอดเวลา</li>
      </ul>
      <p>ติดต่อผู้ดูแลระบบ: kraijateios@gmail.com</p>
    </main>
  );
}
