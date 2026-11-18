import { RequirementStatusType } from '@/types';

export interface StatusMeta {
  value: RequirementStatusType;
  label: string;
  shortTh: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_ORDER: RequirementStatusType[] = [
  'Draft',
  'In Review',
  'In Development',
  'Testing',
  'Done',
];

export const STATUS_META: Record<RequirementStatusType, StatusMeta> = {
  Draft: {
    value: 'Draft',
    label: 'Draft',
    shortTh: 'ร่างข้อกำหนด',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  },
  'In Review': {
    value: 'In Review',
    label: 'In Review',
    shortTh: 'รอตรวจทาน/ประเมิน',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  'In Development': {
    value: 'In Development',
    label: 'In Development',
    shortTh: 'Dev กำลังพัฒนา',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  Testing: {
    value: 'Testing',
    label: 'Ready for Test',
    shortTh: 'กำลังทดสอบ/UAT',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  Done: {
    value: 'Done',
    label: 'Done / Released',
    shortTh: 'เสร็จสมบูรณ์',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
};

export function getStatusBadgeClass(status: string): string {
  const meta = STATUS_META[status as RequirementStatusType];
  return meta ? meta.badgeClass : 'bg-slate-50 text-slate-700 border-slate-200';
}

export function getStatusShortTh(status: string): string {
  const meta = STATUS_META[status as RequirementStatusType];
  return meta ? meta.shortTh : status;
}
