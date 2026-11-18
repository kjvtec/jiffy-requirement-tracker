export interface DriveStatus {
  configured: boolean;
  maxBytes: number;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  webViewLink: string;
}

export async function fetchDriveStatus(): Promise<DriveStatus> {
  try {
    const res = await fetch('/api/drive/status', { cache: 'no-store' });
    if (!res.ok) return { configured: false, maxBytes: 0 };
    return (await res.json()) as DriveStatus;
  } catch {
    return { configured: false, maxBytes: 0 };
  }
}

/**
 * Uploads a file to the shared Google Drive folder.
 * 1) asks our API for a resumable session, 2) PUTs the bytes straight to Google.
 */
export async function uploadToDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<DriveFile> {
  const sessionRes = await fetch('/api/drive/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    }),
  });
  const session = (await sessionRes.json().catch(() => ({}))) as { uploadUrl?: string; error?: string };
  if (!sessionRes.ok || !session.uploadUrl) {
    throw new Error(session.error || `เริ่มอัปโหลดไม่สำเร็จ (${sessionRes.status})`);
  }

  return new Promise<DriveFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', session.uploadUrl!);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('เชื่อมต่อ Google Drive ไม่สำเร็จ'));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Google Drive ปฏิเสธไฟล์ (${xhr.status})`));
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText) as {
          id: string;
          name: string;
          size?: string;
          mimeType?: string;
          webViewLink?: string;
        };
        resolve({
          id: json.id,
          name: json.name,
          size: Number(json.size) || file.size,
          mimeType: json.mimeType ?? file.type ?? null,
          webViewLink: json.webViewLink || `https://drive.google.com/file/d/${json.id}/view`,
        });
      } catch {
        reject(new Error('อ่านผลลัพธ์จาก Google Drive ไม่ได้'));
      }
    };
    xhr.send(file);
  });
}
