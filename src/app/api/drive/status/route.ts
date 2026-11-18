import { NextResponse } from 'next/server';
import { isDriveConfigured, maxUploadBytes } from '@/lib/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tells the UI whether Google Drive uploads are set up on this deployment. */
export function GET() {
  return NextResponse.json({ configured: isDriveConfigured(), maxBytes: maxUploadBytes() });
}
