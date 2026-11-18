import ExcelJS from 'exceljs';
import { Requirement } from '@/types';

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

export async function exportRequirementsToExcel(
  requirements: Requirement[],
  options?: ExcelExportOptions
): Promise<void> {
  const filename =
    options?.filename ||
    `Jiffy_Requirements_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

  options?.onProgress?.({
    phase: 'preparing',
    current: 0,
    total: requirements.length,
    message: 'กำลังเตรียมข้อมูล Requirement...',
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jiffy Requirement Tracker (New Pos Jiify)';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Requirements', {
    views: [{ showGridLines: true }],
  });

  // Title Row
  ws.mergeCells('A1:L1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Jiffy Requirement Tracker (New Pos Jiify) — สรุปรายการความต้องการระบบ';
  titleCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' }, // Sky-600
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 36;

  // Subtitle Row
  ws.mergeCells('A2:L2');
  const subCell = ws.getCell('A2');
  subCell.value = `ส่งออกเมื่อ: ${new Date().toLocaleString('th-TH')} | จำนวนทั้งหมด: ${requirements.length} รายการ`;
  subCell.font = { name: 'Tahoma', size: 9, italic: true, color: { argb: 'FF64748B' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;

  // Headers
  const headers = [
    { header: 'Req ID', key: 'req_id', width: 16 },
    { header: 'Title (หัวข้อ)', key: 'title', width: 34 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Priority', key: 'priority', width: 14 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Core Function', key: 'core_function', width: 22 },
    { header: 'Module', key: 'module', width: 18 },
    { header: 'Details (รายละเอียด)', key: 'details', width: 45 },
    { header: 'Requested By', key: 'requested_by', width: 16 },
    { header: 'Request Date', key: 'request_date', width: 16 },
    { header: 'Dev Assigned', key: 'dev_assigned', width: 16 },
    { header: 'Target Version', key: 'target_version', width: 16 },
  ];

  const headerRow = ws.getRow(4);
  headers.forEach((h, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = h.header;
    cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate-900
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    ws.getColumn(colNumber).width = h.width;
  });
  headerRow.height = 28;

  // Data rows
  let rowIdx = 5;
  requirements.forEach((req, i) => {
    const r = ws.getRow(rowIdx);
    r.getCell(1).value = req.req_id;
    r.getCell(2).value = req.title;
    r.getCell(3).value = req.status;
    r.getCell(4).value = req.priority;
    r.getCell(5).value = req.type;
    r.getCell(6).value = req.core_function || '-';
    r.getCell(7).value = req.module;
    r.getCell(8).value = req.details;
    r.getCell(9).value = req.requested_by;
    r.getCell(10).value = req.request_date ? new Date(req.request_date).toLocaleDateString('th-TH') : '-';
    r.getCell(11).value = req.dev_assigned || '-';
    r.getCell(12).value = req.target_version || '-';

    // Style data row
    const isEven = i % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= 12; c++) {
      const cell = r.getCell(c);
      cell.font = { name: 'Tahoma', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = {
        vertical: 'top',
        horizontal: c === 1 || c === 3 || c === 4 || c === 10 ? 'center' : 'left',
        wrapText: c === 2 || c === 8,
      };
    }

    r.height = 24;
    rowIdx++;
  });

  options?.onProgress?.({
    phase: 'done',
    current: requirements.length,
    total: requirements.length,
    message: 'กำลังดาวน์โหลดไฟล์ Excel...',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
