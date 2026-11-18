export type PriorityType = '1.High' | '2.Medium' | '3.Low';
export type RequirementStatusType = 'New' | 'In Development' | 'Testing' | 'Done';
export type RequirementType =
  | 'New Feature'
  | 'Change Request (CR)'
  | 'Enhancement'
  | 'Integration / API'
  | 'Report / Export';

export const REQUIREMENT_STATUSES: RequirementStatusType[] = ['New', 'In Development', 'Testing', 'Done'];

export const REQUIREMENT_TYPES: RequirementType[] = [
  'New Feature',
  'Change Request (CR)',
  'Enhancement',
  'Integration / API',
  'Report / Export',
];

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

export const DEFAULT_CORE_FUNCTION: CoreFunctionType = 'VTec POS';

export interface RequirementImage {
  id?: string;
  requirement_id?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at?: string;
}

export interface Requirement {
  id: string;
  req_id: string; // e.g. JFY-REQ-01 (assigned by the database sequence)
  title: string;
  priority: PriorityType;
  type: RequirementType;
  core_function: CoreFunctionType;
  module: string;
  details: string;
  requested_by: string;
  request_date: string;
  status: RequirementStatusType;
  dev_assigned: string | null;
  /** True while a developer is waiting for more information from the requester. */
  info_requested: boolean;
  info_request_note: string | null;
  info_requested_by: string | null;
  info_requested_at: string | null;
  created_at: string;
  updated_at: string;
  images: RequirementImage[];
  files: RequirementFile[];
}

/** A file a developer attached; the file itself lives in Google Drive. */
export interface RequirementFile {
  id: string;
  requirement_id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  drive_file_id: string;
  web_view_link: string;
  uploaded_by: string;
  created_at: string;
}

/** Fields the user edits when creating / updating a requirement. */
export type RequirementInput = Omit<
  Requirement,
  | 'id'
  | 'req_id'
  | 'created_at'
  | 'updated_at'
  | 'images'
  | 'files'
  | 'info_requested'
  | 'info_request_note'
  | 'info_requested_by'
  | 'info_requested_at'
>;

/** Developers are a separate list from requesters (TeamMember). */
export interface Developer {
  id: number;
  name: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role?: string | null;
}

export interface SystemModule {
  id: number;
  name: string;
  core_function: CoreFunctionType;
}

export interface RequirementFilter {
  search: string;
  status: string;
  priority: string;
  core_function: string;
  module: string;
  requested_by: string;
  dev_assigned: string;
  /** Only requirements waiting for more information from the requester. */
  needs_info: boolean;
}

export const EMPTY_FILTER: RequirementFilter = {
  search: '',
  status: '',
  priority: '',
  core_function: '',
  module: '',
  requested_by: '',
  dev_assigned: '',
  needs_info: false,
};

export type ActivityAction =
  | 'created'
  | 'status_change'
  | 'comment'
  | 'update'
  | 'info_request'
  | 'info_reply'
  | 'file';

export interface ActivityEntry {
  id: string;
  requirement_id: string;
  actor: string;
  action: ActivityAction;
  from_status?: string | null;
  to_status?: string | null;
  message?: string | null;
  created_at: string;
}

/** Default Testers (the people who open a requirement). */
export const DEFAULT_TEAM: Array<{ name: string; role: string }> = [
  { name: 'Aoy', role: 'Tester' },
  { name: 'Kampon', role: 'Tester' },
  { name: 'Kraijate', role: 'Tester' },
  { name: 'Tukta', role: 'Tester' },
  { name: 'Nat', role: 'Tester' },
];

/** Default developers (kept separate from requesters; more can be added in the app). */
export const DEFAULT_DEVELOPERS: string[] = [];
