import { CheckCircle2, Code2, FlaskConical, Sparkles, type LucideIcon } from 'lucide-react';
import type { RequirementStatusType } from '@/types';

export interface StatusMeta {
  value: RequirementStatusType;
  label: string;
  shortTh: string;
  icon: LucideIcon;
  badgeClass: string;
  dotClass: string;
  /** Solid gradient used for icon tiles and highlights. */
  tileClass: string;
  /** Soft tinted card background + border. */
  softClass: string;
  textClass: string;
}

export const STATUS_ORDER: RequirementStatusType[] = ['New', 'In Development', 'Testing', 'Done'];

export const STATUS_META: Record<RequirementStatusType, StatusMeta> = {
  New: {
    value: 'New',
    label: 'New',
    shortTh: 'ใหม่ / รอดำเนินการ',
    icon: Sparkles,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
    tileClass: 'bg-gradient-to-br from-sky-400 to-blue-600',
    softClass: 'bg-sky-50 border-sky-200 hover:border-sky-400',
    textClass: 'text-sky-700',
  },
  'In Development': {
    value: 'In Development',
    label: 'In Development',
    shortTh: 'Dev กำลังพัฒนา',
    icon: Code2,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
    tileClass: 'bg-gradient-to-br from-indigo-400 to-violet-600',
    softClass: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    textClass: 'text-indigo-700',
  },
  Testing: {
    value: 'Testing',
    label: 'Ready for Test',
    shortTh: 'กำลังทดสอบ / UAT',
    icon: FlaskConical,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
    tileClass: 'bg-gradient-to-br from-amber-400 to-orange-500',
    softClass: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    textClass: 'text-amber-800',
  },
  Done: {
    value: 'Done',
    label: 'Done / Released',
    shortTh: 'เสร็จสมบูรณ์',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    tileClass: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    softClass: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    textClass: 'text-emerald-700',
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
