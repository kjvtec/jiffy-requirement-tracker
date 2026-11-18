import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  Requirement,
} from '@/types';

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
  let base = (raw || 'Req')
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

function parseReqNumber(reqId: string): number {
  const match = reqId?.match(/\d+/);
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

function formatDateTimeTh(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const date = d.toLocaleDateString('en-GB');
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
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
    const arrayBuffer = await blob.arrayBuffer();
    const rawBytes = new Uint8Array(arrayBuffer);
    const rawType = detectImageType(rawBytes);

    if (rawType === 'png' || rawType === 'jpeg') {
      const dimensions = await getImageDimensionsFromBlob(blob);
      return {
        url,
        fileName,
        data: rawBytes,
        extension: rawType,
        width: dimensions.width,
        height: dimensions.height,
      };
    }

    if (typeof window !== 'undefined') {
      const converted = await convertImageToPngViaCanvas(blob);
      if (converted) {
        return {
          url,
          fileName: fileName.replace(/\.[^/.]+$/, '') + '.png',
          data: converted.bytes,
          extension: 'png',
          width: converted.width,
          height: converted.height,
        };
      }
    }

    return null;
  } catch (err) {
    console.warn(`[excel] Failed to fetch image ${url}:`, err);
    return null;
  }
}

function getImageDimensionsFromBlob(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ width: 800, height: 600 });
      return;
    }
    const img = new Image();
    const objUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;
      URL.revokeObjectURL(objUrl);
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      resolve({ width: 800, height: 600 });
    };
    img.src = objUrl;
  });
}

function convertImageToPngViaCanvas(blob: Blob): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objUrl);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          URL.revokeObjectURL(objUrl);
          if (!pngBlob) {
            resolve(null);
            return;
          }
          const buf = await pngBlob.arrayBuffer();
          resolve({
            bytes: new Uint8Array(buf),
            width: canvas.width,
            height: canvas.height,
          });
        }, 'image/png');
      } catch {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      resolve(null);
    };
    img.src = objUrl;
  });
}

function getStatusColors(status: string): { bg: string; text: string; tab: string } {
  switch (status) {
    case 'New':
      return { bg: 'FFE0F2FE', text: 'FF0369A1', tab: 'FF0EA5E9' };
    case 'In Development':
      return { bg: 'FFE0E7FF', text: 'FF3730A3', tab: 'FF6366F1' };
    case 'Testing':
      return { bg: 'FFFEF3C7', text: 'FF92400E', tab: 'FFF59E0B' };
    case 'Done':
      return { bg: 'FFD1FAE5', text: 'FF065F46', tab: 'FF10B981' };
    default:
      return { bg: 'FFF8FAFC', text: 'FF334155', tab: 'FF64748B' };
  }
}

function getPriorityColors(priority: string): { bg: string; text: string } {
  if (priority?.includes('High')) return { bg: 'FFFEE2E2', text: 'FF991B1B' };
  if (priority?.includes('Medium')) return { bg: 'FFFEF3C7', text: 'FF92400E' };
  return { bg: 'FFE0F2FE', text: 'FF0369A1' };
}

export async function exportRequirementsToExcel(
  requirements: Requirement[],
  options: ExcelExportOptions = {}
): Promise<void> {
  const { onProgress } = options;
  const scopeTitle = options.scopeTitle || 'Requirement ทั้งหมด';
  const filename =
    options.filename ||
    `Jiffy_Requirements_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: requirements.length,
    message: 'กำลังจัดเรียงข้อมูล Requirement...',
  });

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jiffy Requirement Tracker (New Pos Jiffy)';
  workbook.lastModifiedBy = 'PTTRM & VTec POS System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sortedReqs = [...requirements].sort((a, b) => {
    const isDoneA = a.status === 'Done' ? 1 : 0;
    const isDoneB = b.status === 'Done' ? 1 : 0;
    if (isDoneA !== isDoneB) return isDoneA - isDoneB;

    const coreDiff = getCoreOrder(a.core_function as string) - getCoreOrder(b.core_function as string);
    if (coreDiff !== 0) return coreDiff;

    return parseReqNumber(a.req_id || '') - parseReqNumber(b.req_id || '');
  });

  // Assign clean unique sheet names
  const usedSheetNames = new Set<string>();
  const reqSheetNames = new Map<string, string>();
  sortedReqs.forEach((r, idx) => {
    const rawId = r.req_id || `REQ_${idx + 1}`;
    const name = sanitizeSheetName(rawId, usedSheetNames);
    reqSheetNames.set(r.id || `${rawId}_${idx}`, name);
  });

  // Collect images
  const allImageTasks: { cacheKey: string; url: string; fileName: string }[] = [];
  sortedReqs.forEach((r) => {
    const imgs = r.images || [];
    imgs.forEach((img, imgIdx) => {
      allImageTasks.push({
        cacheKey: `${r.id || r.req_id}__${imgIdx}`,
        url: img.file_url,
        fileName: img.file_name,
      });
    });
  });

  const imageMap = new Map<string, PreparedImage>();
  const totalImgs = allImageTasks.length;

  for (let idx = 0; idx < totalImgs; idx++) {
    const t = allImageTasks[idx];
    onProgress?.({
      phase: 'images',
      current: idx + 1,
      total: totalImgs,
      message: `กำลังดาวน์โหลดรูปภาพ (${idx + 1}/${totalImgs}): ${t.fileName}`,
    });

    const prepared = await decodeAndNormalizeImage(t.url, t.fileName);
    if (prepared) {
      imageMap.set(t.cacheKey, prepared);
    }
  }

  onProgress?.({
    phase: 'building',
    current: 0,
    total: sortedReqs.length,
    message: 'กำลังสร้างแผ่นงานสรุป (Index)...',
  });

  // =========================================================================
  // SHEET 1: INDEX & EXECUTIVE SUMMARY
  // =========================================================================
  const indexSheet = workbook.addWorksheet('Index', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FF044492' } },
  });

  indexSheet.columns = [
    { width: 7 },  // A: ลำดับ
    { width: 16 }, // B: Req ID
    { width: 35 }, // C: หัวข้อ Requirement
    { width: 22 }, // D: Core Function
    { width: 20 }, // E: Module
    { width: 14 }, // F: Priority
    { width: 18 }, // G: Type
    { width: 16 }, // H: Status
    { width: 18 }, // I: Dev ผู้รับผิดชอบ
    { width: 16 }, // J: ผู้ขอ
    { width: 18 }, // K: วันที่-เวลาที่เปิด
    { width: 45 }, // L: รายละเอียด
    { width: 34 }, // M: ขอข้อมูลเพิ่ม
    { width: 10 }, // N: รูปภาพ
    { width: 12 }, // O: ไฟล์ Drive
    { width: 14 }, // P: เปิดหน้าชีท
  ];

  // Title Banner
  indexSheet.mergeCells('A1:P1');
  const banner = indexSheet.getCell('A1');
  banner.value = `Jiffy Requirement Tracker ( New Pos Jiffy) — สรุปรายการความต้องการ (${scopeTitle})`;
  banner.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF044492' } };
  banner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  indexSheet.getRow(1).height = 36;

  indexSheet.getRow(2).height = 10;

  // Summary Table Header (Row 3)
  indexSheet.mergeCells('A3:C3');
  indexSheet.getCell('A3').value = 'สถิติแยกตาม Core Function';
  indexSheet.getCell('D3').value = 'ทั้งหมด';
  indexSheet.getCell('E3').value = 'New';
  indexSheet.getCell('F3').value = 'In Dev';
  indexSheet.getCell('G3').value = 'Testing';
  indexSheet.getCell('H3').value = 'Done';
  indexSheet.getCell('I3').value = 'ความคืบหน้า (%)';

  const sumCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  sumCols.forEach((col) => {
    const c = indexSheet.getCell(`${col}3`);
    c.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  indexSheet.getRow(3).height = 24;

  // Populate Core summaries (Rows 4..8)
  CORE_FUNCTIONS.forEach((cf, idx) => {
    const rowIdx = 4 + idx;
    const cReqs = sortedReqs.filter((r) => (r.core_function || DEFAULT_CORE_FUNCTION) === cf);
    const total = cReqs.length;
    const isNew = cReqs.filter((r) => r.status === 'New').length;
    const inDev = cReqs.filter((r) => r.status === 'In Development').length;
    const testing = cReqs.filter((r) => r.status === 'Testing').length;
    const done = cReqs.filter((r) => r.status === 'Done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    indexSheet.mergeCells(`A${rowIdx}:C${rowIdx}`);
    indexSheet.getCell(`A${rowIdx}`).value = cf;
    indexSheet.getCell(`D${rowIdx}`).value = total;
    indexSheet.getCell(`E${rowIdx}`).value = isNew;
    indexSheet.getCell(`F${rowIdx}`).value = inDev;
    indexSheet.getCell(`G${rowIdx}`).value = testing;
    indexSheet.getCell(`H${rowIdx}`).value = done;
    indexSheet.getCell(`I${rowIdx}`).value = `${pct}%`;

    sumCols.forEach((col) => {
      const cell = indexSheet.getCell(`${col}${rowIdx}`);
      cell.font = { name: 'Tahoma', size: 9, bold: col === 'A' || col === 'D' || col === 'I' };
      cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
    });
    indexSheet.getRow(rowIdx).height = 20;
  });

  // Grand Total row (Row 9)
  const totalRowIdx = 9;
  const totTotal = sortedReqs.length;
  const totNew = sortedReqs.filter((r) => r.status === 'New').length;
  const totInDev = sortedReqs.filter((r) => r.status === 'In Development').length;
  const totTesting = sortedReqs.filter((r) => r.status === 'Testing').length;
  const totDone = sortedReqs.filter((r) => r.status === 'Done').length;
  const totPct = totTotal > 0 ? Math.round((totDone / totTotal) * 100) : 0;

  indexSheet.mergeCells(`A${totalRowIdx}:C${totalRowIdx}`);
  indexSheet.getCell(`A${totalRowIdx}`).value = 'รวมทั้งหมด (Grand Total)';
  indexSheet.getCell(`D${totalRowIdx}`).value = totTotal;
  indexSheet.getCell(`E${totalRowIdx}`).value = totNew;
  indexSheet.getCell(`F${totalRowIdx}`).value = totInDev;
  indexSheet.getCell(`G${totalRowIdx}`).value = totTesting;
  indexSheet.getCell(`H${totalRowIdx}`).value = totDone;
  indexSheet.getCell(`I${totalRowIdx}`).value = `${totPct}%`;

  sumCols.forEach((col) => {
    const cell = indexSheet.getCell(`${col}${totalRowIdx}`);
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF044492' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
  });
  indexSheet.getRow(totalRowIdx).height = 22;

  indexSheet.getRow(10).height = 12;

  // Main Index Table Header (Row 11)
  const headers = [
    'ลำดับ',
    'Req ID',
    'หัวข้อ Requirement',
    'Core Function',
    'โมดูล (Module)',
    'Priority',
    'Type',
    'สถานะ (Status)',
    'Dev ผู้รับผิดชอบ',
    'ผู้ขอ (Requested By)',
    'วันที่-เวลาที่เปิด',
    'รายละเอียดความต้องการ',
    'ขอข้อมูลเพิ่ม',
    'รูปภาพ',
    'ไฟล์ Drive',
    'เปิดหน้าชีท',
  ];

  const headerRow = indexSheet.getRow(11);
  headerRow.height = 26;
  headers.forEach((label, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = label;
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF044492' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate Index Rows
  sortedReqs.forEach((r, idx) => {
    const rowIdx = 12 + idx;
    const displayId = r.req_id || `REQ-${idx + 1}`;
    const sheetName = reqSheetNames.get(r.id || `${displayId}_${idx}`)!;
    const row = indexSheet.getRow(rowIdx);
    const pStyle = getPriorityColors(r.priority);
    const sStyle = getStatusColors(r.status);

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = {
      formula: `HYPERLINK("#'${sheetName}'!A1","${displayId.replace(/"/g, '""')}")`,
      result: displayId,
    };
    row.getCell(3).value = r.title || r.details;
    row.getCell(4).value = r.core_function || DEFAULT_CORE_FUNCTION;
    row.getCell(5).value = r.module;
    row.getCell(6).value = r.priority;
    row.getCell(7).value = r.type || 'New Feature';
    row.getCell(8).value = r.status;
    row.getCell(9).value = r.dev_assigned || '-';
    row.getCell(10).value = r.requested_by || '-';
    row.getCell(11).value = formatDateTimeTh(r.request_date);
    row.getCell(12).value = r.details;
    row.getCell(13).value =
      r.info_requested && r.status !== 'Done'
        ? `${r.info_requested_by || 'Dev'}: ${r.info_request_note || ''}`
        : '-';
    row.getCell(14).value = r.images?.length || 0;
    row.getCell(15).value = r.files?.length || 0;
    row.getCell(16).value = {
      formula: `HYPERLINK("#'${sheetName}'!A1","เปิดชีท →")`,
      result: 'เปิดชีท →',
    };

    // Styling
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pStyle.bg } };
    row.getCell(6).font = { name: 'Tahoma', size: 9, bold: true, color: { argb: pStyle.text } };
    row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sStyle.bg } };
    row.getCell(8).font = { name: 'Tahoma', size: 9, bold: true, color: { argb: sStyle.text } };
    row.getCell(2).font = { name: 'Tahoma', size: 9, bold: true, color: { argb: 'FF0086FF' }, underline: true };
    row.getCell(16).font = { name: 'Tahoma', size: 9, bold: true, color: { argb: 'FF0086FF' }, underline: true };

    row.height = 22;
  });

  // =========================================================================
  // INDIVIDUAL REQUIREMENT DETAIL SHEETS
  // =========================================================================
  for (let i = 0; i < sortedReqs.length; i++) {
    const r = sortedReqs[i];
    const displayId = r.req_id || `REQ-${i + 1}`;
    const sheetName = reqSheetNames.get(r.id || `${displayId}_${i}`)!;
    const coreFn = r.core_function || DEFAULT_CORE_FUNCTION;
    const statusStyle = getStatusColors(r.status);
    const priorityStyle = getPriorityColors(r.priority);

    const ws = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: statusStyle.tab } },
    });

    ws.columns = [
      { width: 22 },
      { width: 22 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
    ];

    // Row 1: Back link
    ws.mergeCells('A1:D1');
    const backCell = ws.getCell('A1');
    backCell.value = {
      formula: `HYPERLINK("#'Index'!A1","← กลับหน้ารวม (Index)")`,
      result: '← กลับหน้ารวม (Index)',
    };
    backCell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FF044492' }, underline: true };

    ws.mergeCells('E1:F1');
    ws.getCell('E1').value = `Requirement ที่ ${i + 1} จากทั้งหมด ${sortedReqs.length} เรื่อง`;
    ws.getCell('E1').font = { name: 'Tahoma', size: 9, italic: true, color: { argb: 'FF64748B' } };
    ws.getCell('E1').alignment = { horizontal: 'right' };
    ws.getRow(1).height = 24;

    // Row 2: Banner
    ws.mergeCells('A2:F2');
    const bannerCell = ws.getCell('A2');
    bannerCell.value = `[${displayId}] ${r.title || r.details} — ${coreFn} › ${r.module}`;
    bannerCell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF044492' } };
    bannerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(2).height = 32;

    ws.getRow(3).height = 8;

    const fields = [
      { label: 'รหัสข้อกำหนด (Req ID)', value: displayId },
      { label: 'หัวข้อ Requirement (Title)', value: r.title || r.details },
      { label: 'Core Function (ระบบหลัก)', value: coreFn as string },
      { label: 'โมดูลย่อย (Module)', value: r.module },
      { label: 'Priority (ความเร่งด่วน)', value: r.priority, highlight: priorityStyle },
      { label: 'ประเภท (Type)', value: r.type || 'New Feature' },
      { label: 'สถานะงาน (Status)', value: r.status, highlight: statusStyle },
      { label: 'Dev ผู้รับผิดชอบ (Dev Assigned)', value: r.dev_assigned || '-' },
      { label: 'ผู้ขอ (Requested By)', value: `${r.requested_by || '-'} (${formatDateTimeTh(r.request_date)})` },
      { label: 'รายละเอียดความต้องการ / User Requirement', value: r.details || '-', multiline: true },
      {
        label: 'ขอข้อมูลเพิ่ม (Dev → ผู้ขอ)',
        value:
          r.info_requested && r.status !== 'Done'
            ? `${r.info_requested_by || 'Dev'} (${formatDateTimeTh(r.info_requested_at)}): ${r.info_request_note || ''}`
            : '-',
        multiline: true,
      },
      {
        label: 'ไฟล์แนบจาก Dev (Google Drive)',
        value: r.files?.length ? r.files.map((f) => `${f.file_name}  ${f.web_view_link}`).join('\n') : '-',
        multiline: true,
      },
    ];

    let currentRow = 4;
    fields.forEach((f) => {
      ws.mergeCells(`A${currentRow}:B${currentRow}`);
      ws.mergeCells(`C${currentRow}:F${currentRow}`);

      const labelCell = ws.getCell(`A${currentRow}`);
      const valCell = ws.getCell(`C${currentRow}`);

      labelCell.value = f.label;
      labelCell.font = { name: 'Tahoma', size: 9.5, bold: true, color: { argb: 'FF334155' } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      labelCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1 };

      valCell.value = f.value;
      if (f.highlight) {
        valCell.font = { name: 'Tahoma', size: 9.5, bold: true, color: { argb: f.highlight.text } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: f.highlight.bg } };
      } else {
        valCell.font = { name: 'Tahoma', size: 9.5, color: { argb: 'FF0F172A' } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      }
      valCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

      ws.getRow(currentRow).height = f.multiline ? estimateRowHeight(f.value, 75, 26) : 22;
      currentRow++;
    });

    currentRow++;

    // Images Section
    const imgs = r.images || [];
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const imgHeader = ws.getCell(`A${currentRow}`);
    imgHeader.value = `รูปภาพ Wireframe / Mockup ประกอบ (${imgs.length} รูป)`;
    imgHeader.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    imgHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    ws.getRow(currentRow).height = 24;
    currentRow++;

    if (imgs.length === 0) {
      ws.mergeCells(`A${currentRow}:F${currentRow}`);
      ws.getCell(`A${currentRow}`).value = 'ไม่มีรูปภาพประกอบสำหรับรายการนี้';
      ws.getCell(`A${currentRow}`).font = { name: 'Tahoma', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
      ws.getRow(currentRow).height = 22;
    } else {
      for (let imgIdx = 0; imgIdx < imgs.length; imgIdx++) {
        const img = imgs[imgIdx];
        const cacheKey = `${r.id || displayId}__${imgIdx}`;
        const prepared = imageMap.get(cacheKey);

        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = `รูปที่ ${imgIdx + 1}: ${img.file_name}`;
        ws.getCell(`A${currentRow}`).font = { name: 'Tahoma', size: 9.5, bold: true };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        ws.getRow(currentRow).height = 22;
        currentRow++;

        if (prepared) {
          const maxW = 650;
          const maxH = 450;
          const scale = Math.min(1, maxW / prepared.width, maxH / prepared.height);
          const displayW = Math.round(prepared.width * scale);
          const displayH = Math.round(prepared.height * scale);

          const imageId = workbook.addImage({
            buffer: prepared.data as unknown as ArrayBuffer,
            extension: prepared.extension,
          });

          const rowHeightPt = 20;
          const pxPerRow = (rowHeightPt * 96) / 72;
          const rowsNeeded = Math.max(2, Math.ceil((displayH + 12) / pxPerRow));
          const anchorRowZeroBased = currentRow - 1;

          for (let rowOffset = 0; rowOffset < rowsNeeded; rowOffset++) {
            ws.getRow(currentRow + rowOffset).height = rowHeightPt;
          }

          ws.addImage(imageId, {
            tl: { col: 0.15, row: anchorRowZeroBased + 0.15 },
            ext: { width: displayW, height: displayH },
            editAs: 'oneCell',
          });

          currentRow += rowsNeeded + 1;
        } else {
          ws.mergeCells(`A${currentRow}:F${currentRow}`);
          ws.getCell(`A${currentRow}`).value = {
            text: `ไม่สามารถฝังรูปได้ คลิกเพื่อเปิดดู: ${img.file_url}`,
            hyperlink: img.file_url,
          };
          ws.getCell(`A${currentRow}`).font = { name: 'Tahoma', size: 9, color: { argb: 'FF2563EB' }, underline: true };
          ws.getRow(currentRow).height = 22;
          currentRow += 2;
        }
      }
    }
  }

  onProgress?.({
    phase: 'done',
    current: sortedReqs.length,
    total: sortedReqs.length,
    message: 'กำลังสร้างไฟล์ Excel สำหรับดาวน์โหลด...',
  });

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

// Aliases for compatibility
export const exportIssuesToExcel = exportRequirementsToExcel;
