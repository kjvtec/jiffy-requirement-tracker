/**
 * Server-side helpers for Google Drive (used only by /api/drive/* route handlers).
 *
 * Auth uses one OAuth refresh token for the Google account that owns the shared
 * folder, so uploads are stored in that account's Drive and count against its
 * quota. Nothing here is ever sent to the browser.
 *
 * Required environment variables (server only, no NEXT_PUBLIC_ prefix):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID
 * Optional:
 *   GOOGLE_DRIVE_MAX_MB   (default 100)
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.GOOGLE_DRIVE_MAX_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 100) * 1024 * 1024;
}

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'vbs', 'ps1', 'sh', 'jar', 'js', 'dll', 'apk',
]);

export function isBlockedFileName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return BLOCKED_EXTENSIONS.has(ext);
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Google ปฏิเสธการยืนยันตัวตน (${res.status}) — ตรวจสอบ GOOGLE_* ใน Environment Variables`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('ไม่ได้รับ access token จาก Google');
  return json.access_token;
}

/**
 * Start a resumable upload and return the one-time session URL. The browser then
 * uploads the file bytes straight to Google, so large files never pass through
 * the (size-limited) serverless function.
 */
export async function createResumableSession(params: {
  fileName: string;
  mimeType: string;
  size: number;
  origin: string;
}): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(
    `${UPLOAD_URL}?uploadType=resumable&supportsAllDrives=true&fields=${encodeURIComponent(
      'id,name,size,mimeType,webViewLink'
    )}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': params.mimeType,
        'X-Upload-Content-Length': String(params.size),
        // Lets the browser at this origin PUT to the session URL (CORS).
        Origin: params.origin,
      },
      body: JSON.stringify({
        name: params.fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      }),
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`สร้างรายการอัปโหลดใน Google Drive ไม่สำเร็จ (${res.status}) ${detail.slice(0, 200)}`);
  }
  const location = res.headers.get('location');
  if (!location) throw new Error('Google Drive ไม่ส่งลิงก์อัปโหลดกลับมา');
  return location;
}
