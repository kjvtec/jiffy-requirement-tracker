import React from 'react';
import { AlertTriangle, ArrowDown, CircleHelp, Flame, type LucideIcon } from 'lucide-react';
import { STATUS_META } from '@/lib/status';
import type { PriorityType, RequirementStatusType } from '@/types';

export function StatusBadge({
  status,
  showThai = false,
}: {
  status: RequirementStatusType;
  showThai?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className="inline-flex flex-col items-start">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.badgeClass}`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {meta.label}
      </span>
      {showThai && <span className="text-xs text-slate-500 mt-1 pl-1">{meta.shortTh}</span>}
    </span>
  );
}

const PRIORITY_STYLE: Record<PriorityType, { icon: LucideIcon; className: string }> = {
  '1.High': { icon: Flame, className: 'bg-red-50 text-red-700 border-red-200' },
  '2.Medium': { icon: AlertTriangle, className: 'bg-amber-50 text-amber-800 border-amber-300' },
  '3.Low': { icon: ArrowDown, className: 'bg-sky-50 text-sky-700 border-sky-200' },
};

export function PriorityBadge({ priority }: { priority: PriorityType }) {
  const { icon: Icon, className } = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE['2.Medium'];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {priority}
    </span>
  );
}

/** Blinking orange chip shown while a developer is waiting for more information. */
export function NeedInfoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`need-info-beacon inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border-2 text-orange-800 ${className}`}
      title="Dev ขอข้อมูลเพิ่มจากผู้ขอ"
    >
      <CircleHelp className="w-3.5 h-3.5" aria-hidden />
      ขอข้อมูลเพิ่ม
    </span>
  );
}

/** "20/11/2569 14:35" - date and time in Thai format. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}
