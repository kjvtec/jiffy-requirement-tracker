import { NextRequest, NextResponse } from 'next/server';
import { createResumableSession, isBlockedFileName, isDriveConfigured, maxUploadBytes } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Creates a Google Drive resumable-upload session and returns its URL.
 * The file bytes are uploaded by the browser directly to Google.
 */
export async function POST(request: NextRequest) {
  if (!isDriveConfigured()) {
    return bad('ยังไม่ได้ตั้งค่า Google Drive บนระบบนี้ (ต้องตั้ง GOOGLE_* ใน Environment Variables)', 501);
  }

  // Only the app's own pages may start an upload (basic protection for an open endpoint).
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) {
    return bad('คำขอไม่ได้มาจากหน้าเว็บของระบบนี้', 403);
  }

  let body: { fileName?: unknown; mimeType?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad('ข้อมูลที่ส่งมาไม่ถูกต้อง');
  }

  const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 200) : '';
  const mimeType =
    typeof body.mimeType === 'string' && body.mimeType ? body.mimeType.slice(0, 120) : 'application/octet-stream';
  const size = typeof body.size === 'number' ? body.size : NaN;

  if (!fileName) return bad('ไม่พบชื่อไฟล์');
  if (!Number.isFinite(size) || size <= 0) return bad('ขนาดไฟล์ไม่ถูกต้อง');
  if (size > maxUploadBytes()) {
    return bad(`ไฟล์ใหญ่เกินกำหนด (สูงสุด ${Math.round(maxUploadBytes() / 1024 / 1024)} MB)`, 413);
  }
  if (isBlockedFileName(fileName)) return bad('ไม่อนุญาตให้แนบไฟล์ประเภทโปรแกรม/สคริปต์', 415);

  try {
    const uploadUrl = await createResumableSession({ fileName, mimeType, size, origin });
    return NextResponse.json({ uploadUrl });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ', 502);
  }
}
