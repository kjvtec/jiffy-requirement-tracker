export type PriorityType = '1.High' | '2.Medium' | '3.Low';
export type StatusType = 'Open' | 'Need Info' | 'In Progress' | 'Test' | 'Closed';

export interface TimelineEntry {
  timestamp?: string;
  author?: string;
  statusLabel?: string;
  message: string;
  isLegacy?: boolean;
}

export const CORE_FUNCTIONS = [
  'VTec POS',
  'VTec Store Backoffice',
  'VTec HHT',
  'VTec Cloud Inventory',
  'VTec Cloud HQ',
] as const;

export type CoreFunctionType = (typeof CORE_FUNCTIONS)[number];

export const CORE_FUNCTION_META: Record<
  CoreFunctionType,
  {
    order: number;
    shortName: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    accentHex: string;
  }
> = {
  'VTec POS': {
    order: 1,
    shortName: 'POS',
    description: 'ระบบขายหน้าร้าน แคชเชียร์ การรับชำระเงิน และอุปกรณ์ต่อพ่วง',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    accentHex: '#0284c7',
  },
  'VTec Store Backoffice': {
    order: 2,
    shortName: 'Store BO',
    description: 'ระบบหลังร้านสาขา จัดการกะ ปิดสิ้นวัน สต็อก และพนักงานสาขา',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    accentHex: '#059669',
  },
  'VTec HHT': {
    order: 3,
    shortName: 'HHT',
    description: 'อุปกรณ์ Handheld Terminal นับสต็อก รับสินค้า ตรวจเช็กราคา',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    accentHex: '#d97706',
  },
  'VTec Cloud Inventory': {
    order: 4,
    shortName: 'Cloud Inv',
    description: 'ระบบบริหารคลังสินค้ากลาง การโอนย้าย ปรับปรุงสต็อก และ PO',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    accentHex: '#7c3aed',
  },
  'VTec Cloud HQ': {
    order: 5,
    shortName: 'Cloud HQ',
    description: 'ระบบสำนักงานใหญ่ Master Data สินค้า ราคา ร้านค้า และตั้งค่ากลาง',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    accentHex: '#4f46e5',
  },
};

export const DEFAULT_MODULES_BY_CORE: Record<CoreFunctionType, string[]> = {
  'VTec POS': [
    'Login',
    'Sale / Checkout',
    'Payment',
    'Promotion / Discount',
    'Cash In/Cash Out',
    'Shift / Close Day',
    'Receipt / Tax Invoice',
    'Hardware / Printer',
  ],
  'VTec Store Backoffice': [
    'Login',
    'Cash In/Cash Out',
    'Shift / End of Day',
    'Product / Price',
    'Stock / Inventory',
    'Goods Receive',
    'Staff / Permission',
    'Report',
    'Store Setting',
  ],
  'VTec HHT': [
    'Login',
    'Stock Count',
    'Goods Receive',
    'Price Check',
    'Transfer',
    'Return / Wastage',
    'Sync Data',
  ],
  'VTec Cloud Inventory': [
    'Purchase Order',
    'Goods Receive',
    'Stock Transfer',
    'Stock Adjustment',
    'Physical Count',
    'Stock Movement',
    'Warehouse Setting',
    'Inventory Report',
  ],
  'VTec Cloud HQ': [
    'Cash In/Cash Out',
    'Global Setting',
    'Login',
    'Payment',
    'Price',
    'Product',
    'Reason code',
    'Salemode',
    'Shop',
    'Staff',
  ],
};

export const DEFAULT_CORE_FUNCTION: CoreFunctionType = 'VTec Cloud HQ';

export interface IssueImage {
  id?: string;
  issue_id?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at?: string;
}

export interface Issue {
  id: string;
  log_id: string;
  priority: PriorityType | string;
  type: string;
  core_function?: CoreFunctionType | string;
  module: string;
  details: string;
  raise_by: string;
  raise_date: string;
  status: StatusType | string;
  resolution?: string | null;
  updated_by?: string | null;
  closed_by?: string | null;
  closed_date?: string | null;
  closed_version?: string | null;
  remark?: string | null;
  created_at?: string;
  updated_at?: string;
  images?: IssueImage[];
}

export interface TeamMember {
  id: number;
  name: string;
  role?: string;
}

export interface SystemModule {
  id: number;
  name: string;
  core_function?: string;
}

export interface IssueFilter {
  search: string;
  status: string;
  priority: string;
  core_function: string;
  module: string;
  raise_by: string;
}
