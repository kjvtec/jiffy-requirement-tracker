import { Requirement, PriorityType } from '@/types';

export interface PriorityGroupMeta {
  value: PriorityType;
  label: string;
  shortLabel: string;
  containerClass: string;
  titleClass: string;
  subtitleClass: string;
  countPillClass: string;
  controlBtnClass: string;
  innerBoxClass: string;
  tableHeaderClass: string;
  divideClass: string;
  rowHoverClass: string;
  detailHoverClass: string;
  logIdBadgeClass: string;
  pillBadgeClass: string;
  summaryActiveClass: string;
}

export const PRIORITY_GROUPS: PriorityGroupMeta[] = [
  {
    value: '1.High',
    label: 'High Priority Requirements (1.High — สำคัญมาก / เร่งด่วน)',
    shortLabel: '1.High',
    containerClass: 'bg-gradient-to-br from-red-50/90 via-rose-50/70 to-orange-50/50 border-red-200/90',
    titleClass: 'text-red-950',
    subtitleClass: 'text-red-700/80',
    countPillClass: 'text-red-700 bg-white border-red-300',
    controlBtnClass: 'text-red-800 bg-white/85 hover:bg-white border-red-200',
    innerBoxClass: 'bg-white border-red-200/90',
    tableHeaderClass: 'bg-red-100/60 border-b border-red-200/80 text-red-900',
    divideClass: 'divide-red-100/80',
    rowHoverClass: 'hover:bg-red-50/70',
    detailHoverClass: 'group-hover:text-red-950',
    logIdBadgeClass: 'text-red-700 bg-red-50 border-red-200 group-hover:bg-red-600 group-hover:border-red-600 group-hover:text-white',
    pillBadgeClass: 'bg-red-100 text-red-800 border-red-200',
    summaryActiveClass: 'bg-red-50/90 border-red-400 text-red-900 ring-2 ring-red-200/80',
  },
  {
    value: '2.Medium',
    label: 'Medium Priority Requirements (2.Medium — สำคัญปานกลาง)',
    shortLabel: '2.Medium',
    containerClass: 'bg-gradient-to-br from-amber-50/90 via-yellow-50/65 to-orange-50/40 border-amber-200/90',
    titleClass: 'text-amber-950',
    subtitleClass: 'text-amber-700/85',
    countPillClass: 'text-amber-800 bg-white border-amber-300',
    controlBtnClass: 'text-amber-800 bg-white/85 hover:bg-white border-amber-200',
    innerBoxClass: 'bg-white border-amber-200/90',
    tableHeaderClass: 'bg-amber-100/60 border-b border-amber-200/80 text-amber-900',
    divideClass: 'divide-amber-100/80',
    rowHoverClass: 'hover:bg-amber-50/70',
    detailHoverClass: 'group-hover:text-amber-950',
    logIdBadgeClass: 'text-amber-800 bg-amber-50 border-amber-200 group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white',
    pillBadgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    summaryActiveClass: 'bg-amber-50/90 border-amber-400 text-amber-950 ring-2 ring-amber-200/80',
  },
  {
    value: '3.Low',
    label: 'Low Priority Requirements (3.Low — สำคัญน้อย / ปรับปรุงทั่วไป)',
    shortLabel: '3.Low',
    containerClass: 'bg-gradient-to-br from-sky-50/90 via-blue-50/65 to-indigo-50/40 border-sky-200/90',
    titleClass: 'text-sky-950',
    subtitleClass: 'text-sky-700/85',
    countPillClass: 'text-sky-700 bg-white border-sky-300',
    controlBtnClass: 'text-sky-800 bg-white/85 hover:bg-white border-sky-200',
    innerBoxClass: 'bg-white border-sky-200/90',
    tableHeaderClass: 'bg-sky-100/60 border-b border-sky-200/80 text-sky-900',
    divideClass: 'divide-sky-100/80',
    rowHoverClass: 'hover:bg-sky-50/70',
    detailHoverClass: 'group-hover:text-sky-950',
    logIdBadgeClass: 'text-sky-700 bg-sky-50 border-sky-200 group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white',
    pillBadgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    summaryActiveClass: 'bg-sky-50/90 border-sky-400 text-sky-950 ring-2 ring-sky-200/80',
  },
];

export function parseIssueNumber(reqId: string): number {
  return parseInt(reqId.replace(/\D/g, '') || '0', 10);
}

/** Sort requirements with non-Done/Closed items first, Done items always at the bottom. */
export function sortIssuesClosedLast(
  list: Requirement[],
  sortBy: 'log_id_asc' | 'log_id_desc' | 'status' = 'log_id_asc'
): Requirement[] {
  return [...list].sort((a, b) => {
    const isClosedA = a.status === 'Done' || a.status === 'Closed' ? 1 : 0;
    const isClosedB = b.status === 'Done' || b.status === 'Closed' ? 1 : 0;
    if (isClosedA !== isClosedB) return isClosedA - isClosedB;

    if (sortBy === 'status') {
      const cmp = a.status.localeCompare(b.status);
      if (cmp !== 0) return cmp;
    }

    const numA = parseIssueNumber(a.req_id || (a as any).log_id || '');
    const numB = parseIssueNumber(b.req_id || (b as any).log_id || '');
    return sortBy === 'log_id_desc' ? numB - numA : numA - numB;
  });
}
