import { StatusType } from '@/types';

export interface StatusMeta {
  value: StatusType;
  label: string;
  shortTh: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_ORDER: StatusType[] = [
  'Open',
  'Need Info',
  'In Progress',
  'Test',
  'Closed',
];

export const STATUS_META: Record<StatusType, StatusMeta> = {
  Open: {
    value: 'Open',
    label: 'Open',
    shortTh: 'รอแก้ไข',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dotClass: 'bg-amber-400',
  },
  'Need Info': {
    value: 'Need Info',
    label: 'Need Info',
    shortTh: 'รอข้อมูลเพิ่ม',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
    dotClass: 'bg-orange-500',
  },
  'In Progress': {
    value: 'In Progress',
    label: 'In Progress',
    shortTh: 'กำลังแก้ไข',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-violet-400',
  },
  Test: {
    value: 'Test',
    label: 'Ready for Test',
    shortTh: 'รอทดสอบ',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-sky-400',
  },
  Closed: {
    value: 'Closed',
    label: 'Closed',
    shortTh: 'ปิดงานแล้ว',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-400',
  },
};

export function getStatusBadgeClass(status: string): string {
  const meta = STATUS_META[status as StatusType];
  return meta ? meta.badgeClass : 'bg-slate-50 text-slate-700 border-slate-200';
}

export function getStatusShortTh(status: string): string {
  const meta = STATUS_META[status as StatusType];
  return meta ? meta.shortTh : status;
}
