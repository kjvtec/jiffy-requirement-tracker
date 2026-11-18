'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CloudUpload,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  HardDrive,
  Loader2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { zipSync } from 'fflate';
import type { RequirementFile } from '@/types';
import { fetchDriveStatus, uploadToDrive, type DriveStatus } from '@/lib/driveClient';
import type { NewFile } from '@/lib/data/store';
import { formatDateTime } from './Badges';

interface DriveFilesPanelProps {
  files: RequirementFile[];
  /** Names that can be recorded as the uploader (developers). */
  uploaders: string[];
  defaultUploader: string;
  onAdd: (file: NewFile) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
}

function iconFor(file: RequirementFile): { icon: LucideIcon; tone: string } {
  const name = file.file_name.toLowerCase();
  const mime = file.mime_type || '';
  if (mime.startsWith('image/')) return { icon: FileImage, tone: 'bg-violet-100 text-violet-700' };
  if (/\.(xlsx?|csv)$/.test(name)) return { icon: FileSpreadsheet, tone: 'bg-emerald-100 text-emerald-700' };
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return { icon: FileArchive, tone: 'bg-amber-100 text-amber-700' };
  if (/\.(pdf|docx?|txt|md|pptx?)$/.test(name)) return { icon: FileText, tone: 'bg-sky-100 text-sky-700' };
  return { icon: FileIcon, tone: 'bg-slate-100 text-slate-600' };
}

const ZIP_REQUIRED = new Set(['exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'vbs', 'ps1', 'sh', 'jar', 'js', 'dll', 'apk']);

/** Program/script files are not accepted as-is: wrap them in a .zip automatically. */
async function zipIfNeeded(file: File): Promise<{ file: File; zipped: boolean }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ZIP_REQUIRED.has(ext)) return { file, zipped: false };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zipped = zipSync({ [file.name]: bytes }, { level: 6 });
  return {
    file: new File([zipped.buffer as ArrayBuffer], `${file.name}.zip`, { type: 'application/zip' }),
    zipped: true,
  };
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DriveFilesPanel({
  files,
  uploaders,
  defaultUploader,
  onAdd,
  onDelete,
}: DriveFilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [uploader, setUploader] = useState(defaultUploader);
  const [busy, setBusy] = useState<{ name: string; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchDriveStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!uploader && defaultUploader) setUploader(defaultUploader);
  }, [defaultUploader, uploader]);

  const configured = status?.configured === true;

  const handleFiles = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (picked.length === 0) return;
    if (!uploader) {
      setError('กรุณาเลือกชื่อผู้แนบไฟล์ก่อน');
      return;
    }
    setError(null);
    setNotice(null);
    for (const original of picked) {
      let file = original;
      try {
        setBusy({ name: original.name, percent: 0 });
        const prepared = await zipIfNeeded(original);
        file = prepared.file;
        if (prepared.zipped) setNotice(`แปลง ${original.name} เป็น ${file.name} ให้อัตโนมัติ`);
        const uploaded = await uploadToDrive(file, (percent) => setBusy({ name: file.name, percent }));
        await onAdd({
          file_name: uploaded.name,
          file_size: uploaded.size,
          mime_type: uploaded.mimeType,
          drive_file_id: uploaded.id,
          web_view_link: uploaded.webViewLink,
          uploaded_by: uploader,
        });
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center">
          <HardDrive className="w-4 h-4" aria-hidden />
        </span>
        ไฟล์แนบจาก Dev (เก็บใน Google Drive)
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          {files.length} ไฟล์
        </span>
      </h4>

      {files.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-line bg-white overflow-hidden">
          {files.map((f) => {
            const { icon: Icon, tone } = iconFor(f);
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={f.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm font-semibold text-jiffy-navy hover:text-jiffy-blue truncate"
                    title={f.file_name}
                  >
                    {f.file_name}
                  </a>
                  <div className="text-xs text-slate-500">
                    {[formatSize(f.file_size), f.uploaded_by && `โดย ${f.uploaded_by}`, formatDateTime(f.created_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <a
                  href={f.web_view_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-jiffy-blue hover:bg-jiffy-sky"
                  title="เปิดใน Google Drive"
                  aria-label={`เปิด ${f.file_name} ใน Google Drive`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`ลบลิงก์ไฟล์ "${f.file_name}" ออกจาก Requirement นี้?\n(ตัวไฟล์ยังอยู่ใน Google Drive)`)) {
                      void onDelete(f.id).catch((e) => setError(e instanceof Error ? e.message : String(e)));
                    }
                  }}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  title="ลบลิงก์ไฟล์"
                  aria-label={`ลบ ${f.file_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status && !configured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ยังไม่ได้เชื่อมต่อ Google Drive บนระบบนี้ — ผู้ดูแลต้องตั้งค่า <code>GOOGLE_*</code> ใน Environment Variables
          (ดูขั้นตอนใน README) จึงจะแนบไฟล์ได้
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (configured && !busy) void handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
            dragOver ? 'border-jiffy-blue bg-jiffy-sky' : 'border-slate-300 bg-slate-50/60'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              แนบโดย
              <select
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                className="field !w-auto font-semibold"
                aria-label="ผู้แนบไฟล์"
              >
                <option value="">-- เลือก Dev --</option>
                {uploaders.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && void handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={!configured || Boolean(busy)}
              onClick={() => inputRef.current?.click()}
              className="btn-brand"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <CloudUpload className="w-4 h-4" aria-hidden />}
              {busy ? 'กำลังอัปโหลด...' : 'เลือกไฟล์เพื่ออัปโหลด'}
            </button>
            <span className="text-xs text-slate-500">หรือลากไฟล์มาวางที่นี่ (ไฟล์โปรแกรม/สคริปต์ เช่น .exe จะถูกบีบเป็น .zip ให้อัตโนมัติ)
              {status?.maxBytes ? ` (ไฟล์ละไม่เกิน ${Math.round(status.maxBytes / 1024 / 1024)} MB)` : ''}
            </span>
          </div>

          {busy && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="truncate pr-2">{busy.name}</span>
                <span>{busy.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${busy.percent}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {notice && (
        <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">{notice}</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
