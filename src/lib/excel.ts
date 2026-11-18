import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  Issue,
} from '@/types';
import { getLatestTimelineInfo } from '@/lib/timeline';

export interface ExcelExportProgress {
  phase: 'preparing' | 'images' | 'building' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface ExcelExportOptions {
  filename?: string;
  scopeTitle?: string;
  onProgress?: (progress: ExcelExportProgress) => void;
}

interface PreparedImage {
  url: string;
  fileName: string;
  data: Uint8Array;
  extension: 'png' | 'jpeg';
  width: number;
  height: number;
}

const INVALID_SHEET_CHARS = /[*?:\\/\[\]']/g;

function sanitizeSheetName(raw: string, usedNames: Set<string>): string {
  let base = (raw || 'Issue')
    .replace(INVALID_SHEET_CHARS, '_')
    .trim()
    .slice(0, 31);
  if (!base || base.toLowerCase() === 'history' || base.toLowerCase() === 'index') {
    base = `Sheet_${base || 'Item'}`.slice(0, 31);
  }
  let candidate = base;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = `_${counter}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    counter++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function parseIssueNumber(logId: string): number {
  const match = logId?.match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

function getCoreOrder(coreName?: string): number {
  const found = CORE_FUNCTION_META[coreName as CoreFunctionType];
  return found ? found.order : 99;
}

function formatDateTh(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB');
}

function estimateRowHeight(text: string | null | undefined, charsPerLine: number, minHeight = 22): number {
  if (!text) return minHeight;
  const paragraphs = String(text).split(/\r?\n/);
  let totalLines = 0;
  for (const p of paragraphs) {
    totalLines += Math.max(1, Math.ceil(p.length / Math.max(10, charsPerLine)));
  }
  return Math.max(minHeight, totalLines * 17 + 10);
}

function detectImageType(bytes: Uint8Array): 'png' | 'jpeg' | 'other' {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  return 'other';
}

async function decodeAndNormalizeImage(url: string, fileName: string): Promise<PreparedImage | null> {
  try {
    const resolvedUrl =
      typeof window !== 'undefined' && url.startsWith('/')
        ? `${window.location.origin}${url}`
        : url;

    const response = await fetch(resolvedUrl, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    const rawBuffer = await blob.arrayBuffer();
    const rawBytes = new Uint8Array(rawBuffer);
    const detected = detectImageType(rawBytes);

    // Get natural dimensions via browser Image/createImageBitmap
    let width = 800;
    let height = 450;

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      width = bitmap.width || 800;
      height = bitmap.height || 450;

      if (detected === 'other') {
        // Convert WebP / other image formats to PNG using canvas so Excel renders properly
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          bitmap.close();
          return null;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();

        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (!pngBlob) return null;
        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        return { url, fileName, data: pngBytes, extension: 'png', width, height };
      }

      bitmap.close();
      return {
        url,
        fileName,
        data: rawBytes,
        extension: detected,
        width,
        height,
      };
    }

    return {
      url,
      fileName,
      data: rawBytes,
      extension: detected === 'jpeg' ? 'jpeg' : 'png',
      width,
      height,
    };
  } catch (err) {
    console.warn(`Failed to fetch/embed image (${fileName}):`, err);
    return null;
  }
}

async function fetchImagesConcurrently(
  tasks: { key: string; url: string; fileName: string }[],
  onTick: (completed: number, total: number) => void,
  concurrency = 6
): Promise<Map<string, PreparedImage | null>> {
  const results = new Map<string, PreparedImage | null>();
  if (tasks.length === 0) return results;

  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIdx = index++;
      const task = tasks[currentIdx];
      const prepared = await decodeAndNormalizeImage(task.url, task.fileName);
      results.set(task.key, prepared);
      completed++;
      onTick(completed, tasks.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function getPriorityColors(priority: string): { bg: string; text: string } {
  if (priority?.includes('High')) return { bg: 'FFFEE2E2', text: 'FFB91C1C' };
  if (priority?.includes('Medium')) return { bg: 'FFFEF3C7', text: 'FFB45309' };
  return { bg: 'FFDBEAFE', text: 'FF1D4ED8' };
}

function getStatusColors(status: string): { bg: string; text: string; tab: string } {
  switch (status) {
    case 'Open':
      return { bg: 'FFFEF9C3', text: 'FFA16207', tab: 'FFF59E0B' };
    case 'Need Info':
      return { bg: 'FFFFEDD5', text: 'FFC2410C', tab: 'FFF97316' };
    case 'In Progress':
      return { bg: 'FFF3E8FF', text: 'FF7E22CE', tab: 'FF9333EA' };
    case 'Test':
      return { bg: 'FFDBEAFE', text: 'FF1D4ED8', tab: 'FF2563EB' };
    case 'Closed':
      return { bg: 'FFD1FAE5', text: 'FF047857', tab: 'FF10B981' };
    default:
      return { bg: 'FFF1F5F9', text: 'FF334155', tab: 'FF64748B' };
  }
}

export async function exportIssuesToExcel(issues: Issue[], options: ExcelExportOptions = {}) {
  const {
    filename = `Issue_Tracker_New_Pos_Jiffy_${new Date().toISOString().slice(0, 10)}.xlsx`,
    scopeTitle = 'Issue Tracker New Pos Jiffy — รายงานสรุปปัญหา (ทุกกลุ่มงาน)',
    onProgress,
  } = options;

  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: issues.length,
    message: 'กำลังเตรียมโครงสร้างเอกสาร Excel...',
  });

  // Sort cleanly: Core Function Order (1..5) -> Issue No ascending
  const sortedIssues = [...issues].sort((a, b) => {
    const coreA = getCoreOrder(a.core_function || DEFAULT_CORE_FUNCTION);
    const coreB = getCoreOrder(b.core_function || DEFAULT_CORE_FUNCTION);
    if (coreA !== coreB) return coreA - coreB;
    return parseIssueNumber(a.log_id) - parseIssueNumber(b.log_id);
  });

  // Collect all images to download concurrently
  const imageTasks: { key: string; url: string; fileName: string }[] = [];
  sortedIssues.forEach((issue) => {
    (issue.images || []).forEach((img, idx) => {
      imageTasks.push({
        key: `${issue.id || issue.log_id}__${idx}`,
        url: img.file_url,
        fileName: img.file_name || `${issue.log_id}_image_${idx + 1}.png`,
      });
    });
  });

  onProgress?.({
    phase: 'images',
    current: 0,
    total: imageTasks.length,
    message:
      imageTasks.length > 0
        ? `กำลังดาวน์โหลดรูปภาพประกอบ (0/${imageTasks.length} รูป)...`
        : 'กำลังสร้างเอกสาร Excel...',
  });

  const imageMap = await fetchImagesConcurrently(imageTasks, (completed, total) => {
    onProgress?.({
      phase: 'images',
      current: completed,
      total,
      message: `กำลังดาวน์โหลดรูปภาพประกอบ (${completed}/${total} รูป)...`,
    });
  });

  onProgress?.({
    phase: 'building',
    current: 0,
    total: sortedIssues.length,
    message: 'กำลังจัดสร้างหน้า Index และ Sheet รายข้อพร้อมรูปภาพ...',
  });

  // Dynamically import ExcelJS (resolves browser bundle ./dist/exceljs.min.js)
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Issue Tracker New Pos Jiffy';
  workbook.created = new Date();

  const usedSheetNames = new Set<string>(['index']);
  const issueSheetNames = new Map<string, string>();
  sortedIssues.forEach((issue, idx) => {
    const rawName = issue.log_id || `ISSUE_${idx + 1}`;
    const safeName = sanitizeSheetName(rawName, usedSheetNames);
    issueSheetNames.set(issue.id || `${issue.log_id}_${idx}`, safeName);
  });

  // =========================================================================
  // SHEET 1: INDEX (สรุปภาพรวมและสารบัญเชื่อมโยงไปยังทุกข้อ)
  // =========================================================================
  const indexSheet = workbook.addWorksheet('Index', {
    views: [{ state: 'frozen', ySplit: 12 }],
    properties: { tabColor: { argb: 'FF312E81' } },
  });

  indexSheet.columns = [
    { width: 8 },   // A: ข้อที่
    { width: 13 },  // B: Log ID
    { width: 22 },  // C: Core Function
    { width: 18 },  // D: Module
    { width: 12 },  // E: Priority
    { width: 11 },  // F: Type
    { width: 46 },  // G: Details
    { width: 12 },  // H: Raise By
    { width: 13 },  // I: Raise Date
    { width: 14 },  // J: Status
    { width: 32 },  // K: Resolution
    { width: 13 },  // L: Closed By
    { width: 14 },  // M: Closed Ver
    { width: 20 },  // N: Remark
    { width: 11 },  // O: รูปภาพ
    { width: 18 },  // P: Link ไปยังชีท
  ];

  // Title Banner
  indexSheet.mergeCells('A1:P1');
  const titleCell = indexSheet.getCell('A1');
  titleCell.value = scopeTitle;
  titleCell.font = { name: 'Tahoma', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  indexSheet.getRow(1).height = 34;

  indexSheet.mergeCells('A2:P2');
  const subTitleCell = indexSheet.getCell('A2');
  subTitleCell.value = `VTec Pos Retail • Jiffy Project | วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')} | จำนวนทั้งหมด ${sortedIssues.length} รายการ (คลิกที่รหัส Log ID หรือ "เปิดดูชีท →" เพื่อข้ามไปยังหน้ารายละเอียดและรูปประกอบ)`;
  subTitleCell.font = { name: 'Tahoma', size: 10, color: { argb: 'FFE0E7FF' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  indexSheet.getRow(2).height = 22;

  indexSheet.getRow(3).height = 10;

  // Core Function Summary Mini-Table (Rows 4..10)
  indexSheet.mergeCells('A4:C4');
  indexSheet.getCell('A4').value = 'สรุปตาม Core Function (กลุ่มหลัก)';
  indexSheet.getCell('D4').value = 'ทั้งหมด';
  indexSheet.getCell('E4').value = 'Open';
  indexSheet.getCell('F4').value = 'Need Info';
  indexSheet.getCell('G4').value = 'In Progress';
  indexSheet.getCell('H4').value = 'Test';
  indexSheet.getCell('I4').value = 'Closed';
  indexSheet.getCell('J4').value = 'High ค้าง';
  indexSheet.getCell('K4').value = '% ปิดงาน';

  const summaryHeaderCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  summaryHeaderCols.forEach((col) => {
    const cell = indexSheet.getCell(`${col}4`);
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  indexSheet.getRow(4).height = 22;

  CORE_FUNCTIONS.forEach((coreFn, idx) => {
    const rowIdx = 5 + idx;
    const list = sortedIssues.filter((i) => (i.core_function || DEFAULT_CORE_FUNCTION) === coreFn);
    const openCnt = list.filter((i) => i.status === 'Open').length;
    const needInfoCnt = list.filter((i) => i.status === 'Need Info').length;
    const progCnt = list.filter((i) => i.status === 'In Progress').length;
    const testCnt = list.filter((i) => i.status === 'Test').length;
    const closedCnt = list.filter((i) => i.status === 'Closed').length;
    const highOpenCnt = list.filter((i) => i.priority?.includes('High') && i.status !== 'Closed').length;
    const pct = list.length > 0 ? Math.round((closedCnt / list.length) * 100) : 0;

    indexSheet.mergeCells(`A${rowIdx}:C${rowIdx}`);
    indexSheet.getCell(`A${rowIdx}`).value = `${idx + 1}. ${coreFn}`;
    indexSheet.getCell(`D${rowIdx}`).value = list.length;
    indexSheet.getCell(`E${rowIdx}`).value = openCnt;
    indexSheet.getCell(`F${rowIdx}`).value = needInfoCnt;
    indexSheet.getCell(`G${rowIdx}`).value = progCnt;
    indexSheet.getCell(`H${rowIdx}`).value = testCnt;
    indexSheet.getCell(`I${rowIdx}`).value = closedCnt;
    indexSheet.getCell(`J${rowIdx}`).value = highOpenCnt;
    indexSheet.getCell(`K${rowIdx}`).value = `${pct}%`;

    summaryHeaderCols.forEach((col) => {
      const cell = indexSheet.getCell(`${col}${rowIdx}`);
      cell.font = {
        name: 'Tahoma',
        size: 10,
        bold: col === 'A' || col === 'D',
        color: {
          argb:
            col === 'J' && highOpenCnt > 0
              ? 'FFB91C1C'
              : col === 'F' && needInfoCnt > 0
                ? 'FFC2410C'
                : 'FF334155',
        },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
      };
      cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    indexSheet.getRow(rowIdx).height = 20;
  });

  // Grand Total row in Summary (Row 10)
  const totalRowIdx = 10;
  const totalOpen = sortedIssues.filter((i) => i.status === 'Open').length;
  const totalNeedInfo = sortedIssues.filter((i) => i.status === 'Need Info').length;
  const totalProg = sortedIssues.filter((i) => i.status === 'In Progress').length;
  const totalTest = sortedIssues.filter((i) => i.status === 'Test').length;
  const totalClosed = sortedIssues.filter((i) => i.status === 'Closed').length;
  const totalHighOpen = sortedIssues.filter((i) => i.priority?.includes('High') && i.status !== 'Closed').length;
  const totalPct = sortedIssues.length > 0 ? Math.round((totalClosed / sortedIssues.length) * 100) : 0;

  indexSheet.mergeCells(`A${totalRowIdx}:C${totalRowIdx}`);
  indexSheet.getCell(`A${totalRowIdx}`).value = 'รวมทั้งหมด (Total All Core Functions)';
  indexSheet.getCell(`D${totalRowIdx}`).value = sortedIssues.length;
  indexSheet.getCell(`E${totalRowIdx}`).value = totalOpen;
  indexSheet.getCell(`F${totalRowIdx}`).value = totalNeedInfo;
  indexSheet.getCell(`G${totalRowIdx}`).value = totalProg;
  indexSheet.getCell(`H${totalRowIdx}`).value = totalTest;
  indexSheet.getCell(`I${totalRowIdx}`).value = totalClosed;
  indexSheet.getCell(`J${totalRowIdx}`).value = totalHighOpen;
  indexSheet.getCell(`K${totalRowIdx}`).value = `${totalPct}%`;
  summaryHeaderCols.forEach((col) => {
    const cell = indexSheet.getCell(`${col}${totalRowIdx}`);
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF6366F1' } },
      bottom: { style: 'medium', color: { argb: 'FF4F46E5' } },
      left: { style: 'thin', color: { argb: 'FFC7D2FE' } },
      right: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    };
  });
  indexSheet.getRow(totalRowIdx).height = 22;

  indexSheet.getRow(11).height = 12;

  // Main Index Table Header (Row 12)
  const indexHeaders = [
    'ข้อที่',
    'Log ID',
    'Core Function (กลุ่มหลัก)',
    'Module (กลุ่มย่อย)',
    'Priority',
    'Type',
    'รายละเอียดปัญหา (Details)',
    'ผู้แจ้ง',
    'วันที่แจ้ง',
    'สถานะ (Status)',
    'แนวทางการแก้ไข (Resolution)',
    'ผู้ปิดงาน',
    'Closed Ver.',
    'หมายเหตุ (Remark)',
    'รูปภาพ',
    'เปิดหน้าชีท',
  ];

  const headerRow = indexSheet.getRow(12);
  headerRow.height = 28;
  indexHeaders.forEach((label, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = label;
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: colIdx === 6 || colIdx === 10 ? 'left' : 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Populate Index rows starting at Row 13
  sortedIssues.forEach((issue, idx) => {
    const rowIdx = 13 + idx;
    const sheetName = issueSheetNames.get(issue.id || `${issue.log_id}_${idx}`)!;
    const coreFn = issue.core_function || DEFAULT_CORE_FUNCTION;
    const imgCount = issue.images?.length || 0;
    const row = indexSheet.getRow(rowIdx);

    const priorityStyle = getPriorityColors(issue.priority);
    const statusStyle = getStatusColors(issue.status);

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = {
      formula: `HYPERLINK("#'${sheetName}'!A1","${issue.log_id.replace(/"/g, '""')}")`,
      result: issue.log_id,
    };
    row.getCell(3).value = coreFn;
    row.getCell(4).value = issue.module;
    row.getCell(5).value = issue.priority;
    row.getCell(6).value = issue.type;
    row.getCell(7).value = issue.details || '-';
    row.getCell(8).value = issue.raise_by;
    row.getCell(9).value = formatDateTh(issue.raise_date);
    row.getCell(10).value = issue.status;
    row.getCell(11).value = issue.resolution || '-';
    row.getCell(12).value = issue.closed_by || '-';
    row.getCell(13).value = issue.closed_version || '-';
    row.getCell(14).value = issue.remark || '-';
    row.getCell(15).value = imgCount > 0 ? `${imgCount} รูป` : '-';
    row.getCell(16).value = {
      formula: `HYPERLINK("#'${sheetName}'!A1","เปิด ${sheetName.replace(/"/g, '""')} →")`,
      result: `เปิด ${sheetName} →`,
    };

    row.height = Math.max(
      estimateRowHeight(issue.details, 40, 26),
      estimateRowHeight(issue.resolution, 28, 26)
    );

    const baseBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Tahoma', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Specific cell alignments and highlights
      if (c === 1 || c === 6 || c === 8 || c === 9 || c === 12 || c === 13 || c === 15) {
        cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
      } else if (c === 2 || c === 16) {
        cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF4338CA' }, underline: true };
        cell.alignment = { vertical: 'top', horizontal: 'center' };
      } else if (c === 5) {
        cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: priorityStyle.text } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityStyle.bg } };
        cell.alignment = { vertical: 'top', horizontal: 'center' };
      } else if (c === 10) {
        cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: statusStyle.text } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusStyle.bg } };
        cell.alignment = { vertical: 'top', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      }
    }
  });

  // =========================================================================
  // SHEETS 2..N: INDIVIDUAL ISSUE SHEETS WITH TEXT & EMBEDDED IMAGES
  // =========================================================================
  for (let i = 0; i < sortedIssues.length; i++) {
    const issue = sortedIssues[i];
    const sheetName = issueSheetNames.get(issue.id || `${issue.log_id}_${i}`)!;
    const coreFn = issue.core_function || DEFAULT_CORE_FUNCTION;
    const statusStyle = getStatusColors(issue.status);
    const priorityStyle = getPriorityColors(issue.priority);
    const tabColor = issue.priority?.includes('High') && issue.status !== 'Closed' ? 'FFDC2626' : statusStyle.tab;

    const ws = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: tabColor } },
    });

    // Configure 6 clean columns for detailed layout (total ~122 chars ≈ 860px wide)
    ws.columns = [
      { width: 22 }, // A
      { width: 20 }, // B
      { width: 22 }, // C
      { width: 22 }, // D
      { width: 22 }, // E
      { width: 22 }, // F
    ];

    // Row 1: Navigation Back to Index
    ws.mergeCells('A1:D1');
    const backCell = ws.getCell('A1');
    backCell.value = {
      formula: `HYPERLINK("#'Index'!A1","← กลับหน้าสรุป (Index)")`,
      result: '← กลับหน้าสรุป (Index)',
    };
    backCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF4338CA' }, underline: true };
    backCell.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('E1:F1');
    const refCell = ws.getCell('E1');
    refCell.value = `ข้อที่ ${i + 1} จากทั้งหมด ${sortedIssues.length} รายการ`;
    refCell.font = { name: 'Tahoma', size: 10, italic: true, color: { argb: 'FF64748B' } };
    refCell.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(1).height = 24;

    // Row 2: Issue Banner
    ws.mergeCells('A2:F2');
    const bannerCell = ws.getCell('A2');
    bannerCell.value = `[${issue.log_id}] รายงานรายละเอียดปัญหา — ${coreFn} › ${issue.module}`;
    bannerCell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    bannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(2).height = 32;

    ws.getRow(3).height = 8;

    // Row 4: Section Header
    ws.mergeCells('A4:B4');
    ws.mergeCells('C4:F4');
    ws.getCell('A4').value = 'หัวข้อ (รายการข้อมูล)';
    ws.getCell('C4').value = 'รายละเอียด (Information)';
    ['A4', 'C4'].forEach((addr) => {
      const c = ws.getCell(addr);
      c.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    });
    ws.getRow(4).height = 24;

    const latestInfo = getLatestTimelineInfo(issue);
    const raiseParts = [
      `${issue.raise_by}  (${formatDateTh(issue.raise_date)})`,
      latestInfo.latestAuthor
        ? `อัปเดตล่าสุดโดย: ${latestInfo.latestAuthor}${latestInfo.latestTimestamp ? ` (${latestInfo.latestTimestamp})` : ''}`
        : '',
    ].filter(Boolean);

    const closedInfoParts = [
      issue.closed_by ? `ผู้ปิดงาน: ${issue.closed_by}` : '',
      issue.closed_date ? `วันที่ปิด: ${formatDateTh(issue.closed_date)}` : '',
      issue.closed_version ? `Version: ${issue.closed_version}` : '',
    ].filter(Boolean);

    const fields: { label: string; value: string; highlight?: { bg: string; text: string }; multiline?: boolean }[] = [
      { label: 'ข้อ 1. รหัสปัญหา (Log ID)', value: issue.log_id },
      { label: 'ข้อ 2. กลุ่มหลัก (Core Function)', value: coreFn },
      { label: 'ข้อ 3. กลุ่มย่อย (Module)', value: issue.module },
      { label: 'ข้อ 4. ระดับความสำคัญ (Priority)', value: issue.priority, highlight: priorityStyle },
      { label: 'ข้อ 5. ประเภท (Type)', value: issue.type },
      { label: 'ข้อ 6. สถานะปัจจุบัน (Status)', value: issue.status, highlight: statusStyle },
      {
        label: 'ข้อ 7. ผู้รับผิดชอบ (คนเปิด Case) / อัปเดตล่าสุด',
        value: raiseParts.join('  |  '),
      },
      { label: 'ข้อ 8. รายละเอียดปัญหา (Details)', value: issue.details || '-', multiline: true },
      { label: 'ข้อ 9. แนวทางแก้ไข / Timeline (Resolution)', value: issue.resolution || '-', multiline: true },
      { label: 'ข้อ 10. ข้อมูลการปิดงาน', value: closedInfoParts.length > 0 ? closedInfoParts.join('  |  ') : '-' },
      { label: 'ข้อ 11. หมายเหตุ (Remark)', value: issue.remark || '-', multiline: true },
    ];

    let currentRow = 5;
    fields.forEach((f, fIdx) => {
      ws.mergeCells(`A${currentRow}:B${currentRow}`);
      ws.mergeCells(`C${currentRow}:F${currentRow}`);

      const labelCell = ws.getCell(`A${currentRow}`);
      const valCell = ws.getCell(`C${currentRow}`);

      labelCell.value = f.label;
      labelCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF334155' } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      labelCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };

      valCell.value = f.value;
      if (f.highlight) {
        valCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: f.highlight.text } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f.highlight.bg } };
      } else {
        valCell.font = { name: 'Tahoma', size: 10, bold: fIdx === 0 || fIdx === 1, color: { argb: 'FF0F172A' } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      }
      valCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      for (let col = 1; col <= 6; col++) {
        ws.getCell(currentRow, col).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }

      ws.getRow(currentRow).height = f.multiline ? estimateRowHeight(f.value, 76, 28) : 24;
      currentRow++;
    });

    currentRow++; // Spacer row

    // Section 12: Attached Images Header
    const imgs = issue.images || [];
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const imgHeaderCell = ws.getCell(`A${currentRow}`);
    imgHeaderCell.value = `ข้อ 12. รูปภาพประกอบ / หลักฐาน (${imgs.length} รูป)`;
    imgHeaderCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    imgHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    imgHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(currentRow).height = 26;
    currentRow++;

    if (imgs.length === 0) {
      ws.mergeCells(`A${currentRow}:F${currentRow}`);
      const noImgCell = ws.getCell(`A${currentRow}`);
      noImgCell.value = 'ไม่มีรูปภาพประกอบสำหรับปัญหารายการนี้';
      noImgCell.font = { name: 'Tahoma', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
      noImgCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(currentRow).height = 24;
    } else {
      for (let imgIdx = 0; imgIdx < imgs.length; imgIdx++) {
        const img = imgs[imgIdx];
        const cacheKey = `${issue.id || issue.log_id}__${imgIdx}`;
        const prepared = imageMap.get(cacheKey);

        // Caption row above image
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const captionCell = ws.getCell(`A${currentRow}`);
        captionCell.value = `รูปที่ ${imgIdx + 1}: ${img.file_name || `Screenshot ${imgIdx + 1}`}`;
        captionCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        captionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        captionCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        ws.getRow(currentRow).height = 22;
        currentRow++;

        if (prepared) {
          // Scale proportionally inside max 680x500 px box
          const maxW = 680;
          const maxH = 500;
          const scale = Math.min(1, maxW / prepared.width, maxH / prepared.height);
          const displayW = Math.round(prepared.width * scale);
          const displayH = Math.round(prepared.height * scale);

          // Add image to workbook
          const imageId = workbook.addImage({
            buffer: prepared.data as unknown as ArrayBuffer,
            extension: prepared.extension,
          });

          // Allocate rows of 20pt (~26.67px) to contain image cleanly without overlapping
          const rowHeightPt = 20;
          const pxPerRow = (rowHeightPt * 96) / 72; // ~26.67px
          const rowsNeeded = Math.max(2, Math.ceil((displayH + 12) / pxPerRow));
          const anchorRowZeroBased = currentRow - 1;

          for (let r = 0; r < rowsNeeded; r++) {
            ws.getRow(currentRow + r).height = rowHeightPt;
          }

          ws.addImage(imageId, {
            tl: { col: 0.15, row: anchorRowZeroBased + 0.15 },
            ext: { width: displayW, height: displayH },
            editAs: 'oneCell',
          });

          currentRow += rowsNeeded + 1;
        } else {
          // Fallback URL if image could not be fetched
          ws.mergeCells(`A${currentRow}:F${currentRow}`);
          const fallbackCell = ws.getCell(`A${currentRow}`);
          fallbackCell.value = { text: `ไม่สามารถฝังรูปได้ คลิกเพื่อเปิดดูออนไลน์: ${img.file_url}`, hyperlink: img.file_url };
          fallbackCell.font = { name: 'Tahoma', size: 9, color: { argb: 'FF2563EB' }, underline: true };
          ws.getRow(currentRow).height = 22;
          currentRow += 2;
        }
      }
    }
  }

  onProgress?.({
    phase: 'done',
    current: sortedIssues.length,
    total: sortedIssues.length,
    message: 'กำลังสร้างไฟล์ Excel สำหรับดาวน์โหลด...',
  });

  // Generate buffer and trigger download in browser
  const outBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
