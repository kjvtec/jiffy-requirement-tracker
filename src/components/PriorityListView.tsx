'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Code2,
  Download,
  Eye,
  EyeOff,
  Flame,
  Layers,
  ListFilter,
  Paperclip,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';
import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  type CoreFunctionType,
  type PriorityType,
  type Requirement,
  type SystemModule,
} from '@/types';
import { CORE_ICON } from '@/lib/coreIcons';
import { nextSort, sortRequirements, type RequirementSortKey, type SortState } from '@/lib/sort';
import { NeedInfoBadge, StatusBadge, formatDateTime } from './Badges';
import SortHeader from './SortHeader';

interface PriorityListViewProps {
  requirements: Requirement[];
  modules: SystemModule[];
  onSelectRequirement: (requirement: Requirement) => void;
  onCreateRequirement: (presetCore?: CoreFunctionType, presetModule?: string, presetPriority?: PriorityType) => void;
  onExportExcel: (targetRequirements: Requirement[], scopeTitle?: string) => void;
}

interface GroupStyle {
  value: PriorityType;
  title: string;
  hint: string;
  icon: LucideIcon;
  /** Header / accent colours */
  band: string;
  iconTile: string;
  count: string;
  rowHover: string;
  accentHex: string;
  chipActive: string;
}

const GROUPS: GroupStyle[] = [
  {
    value: '1.High',
    title: 'High',
    hint: 'สำคัญมาก / เร่งด่วน',
    icon: Flame,
    band: 'from-red-50 to-white border-red-200',
    iconTile: 'bg-gradient-to-br from-red-500 to-rose-600',
    count: 'bg-red-100 text-red-700 border-red-200',
    rowHover: 'hover:bg-red-50/60',
    accentHex: '#dc2626',
    chipActive: 'bg-red-600 border-red-600 text-white',
  },
  {
    value: '2.Medium',
    title: 'Medium',
    hint: 'สำคัญปานกลาง',
    icon: AlertTriangle,
    band: 'from-amber-50 to-white border-amber-200',
    iconTile: 'bg-gradient-to-br from-amber-400 to-orange-500',
    count: 'bg-amber-100 text-amber-800 border-amber-300',
    rowHover: 'hover:bg-amber-50/60',
    accentHex: '#f59e0b',
    chipActive: 'bg-amber-500 border-amber-500 text-white',
  },
  {
    value: '3.Low',
    title: 'Low',
    hint: 'สำคัญน้อย / ปรับปรุงทั่วไป',
    icon: ArrowDown,
    band: 'from-sky-50 to-white border-sky-200',
    iconTile: 'bg-gradient-to-br from-sky-400 to-blue-500',
    count: 'bg-sky-100 text-sky-700 border-sky-200',
    rowHover: 'hover:bg-sky-50/60',
    accentHex: '#0ea5e9',
    chipActive: 'bg-sky-500 border-sky-500 text-white',
  },
];

export default function PriorityListView({
  requirements,
  modules,
  onSelectRequirement,
  onCreateRequirement,
  onExportExcel,
}: PriorityListViewProps) {
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | 'ALL'>('ALL');
  const [coreFilter, setCoreFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [sort, setSort] = useState<SortState<RequirementSortKey>>({ key: 'req_id', dir: 'desc' });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => (!coreFilter || m.core_function === coreFilter) && set.add(m.name));
    requirements.forEach((r) => (!coreFilter || r.core_function === coreFilter) && set.add(r.module));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [modules, requirements, coreFilter]);

  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requirements.filter((r) => {
      if (hideDone && r.status === 'Done') return false;
      if (coreFilter && r.core_function !== coreFilter) return false;
      if (moduleFilter && r.module !== moduleFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.req_id, r.title, r.details, r.module, r.dev_assigned || '', r.requested_by]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [requirements, search, hideDone, coreFilter, moduleFilter, statusFilter]);

  const sorted = useMemo(() => sortRequirements(base, sort), [base, sort]);
  const onSort = (key: RequirementSortKey) => setSort((cur) => nextSort(cur, key));

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: base.length };
    GROUPS.forEach((g) => (c[g.value] = base.filter((r) => r.priority === g.value).length));
    return c;
  }, [base]);

  const visibleGroups = GROUPS.filter((g) => selectedPriority === 'ALL' || selectedPriority === g.value);
  const selectCls = 'field !w-auto min-w-[150px] font-medium';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPriority('ALL')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              selectedPriority === 'ALL'
                ? 'bg-jiffy-navy border-jiffy-navy text-white shadow-card'
                : 'bg-white border-line text-slate-700 hover:border-jiffy-blue'
            }`}
          >
            <ListFilter className="w-4 h-4" aria-hidden />
            ทั้งหมด ({counts.ALL})
          </button>
          {GROUPS.map((g) => {
            const Icon = g.icon;
            const active = selectedPriority === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setSelectedPriority(active ? 'ALL' : g.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  active ? `${g.chipActive} shadow-card` : `bg-white border-line text-slate-700 hover:border-slate-400`
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {g.title} ({counts[g.value]})
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExportExcel(sorted, 'Priority List')}
              className="btn-secondary !py-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" aria-hidden />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => onCreateRequirement(undefined, undefined, selectedPriority === 'ALL' ? undefined : selectedPriority)}
              className="btn-brand !py-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden />
              เพิ่ม Requirement
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-jiffy-blue absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Req ID, หัวข้อ, Dev, ผู้ขอ"
              aria-label="ค้นหา Requirement"
              className="field pl-9"
            />
          </div>
          <select
            value={coreFilter}
            onChange={(e) => {
              setCoreFilter(e.target.value);
              setModuleFilter('');
            }}
            aria-label="กรองตามระบบ"
            className={selectCls}
          >
            <option value="">ทุกระบบ</option>
            {CORE_FUNCTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} aria-label="กรองตามโมดูล" className={selectCls}>
            <option value="">ทุกโมดูล</option>
            {moduleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="กรองตามสถานะ" className={selectCls}>
            <option value="">ทุกสถานะ</option>
            <option value="New">New</option>
            <option value="In Development">In Development</option>
            <option value="Testing">Testing</option>
            <option value="Done">Done</option>
          </select>
          <button
            type="button"
            onClick={() => setHideDone((v) => !v)}
            aria-pressed={hideDone}
            className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-semibold transition-colors ${
              hideDone ? 'bg-jiffy-navy border-jiffy-navy text-white' : 'bg-white border-line text-slate-600 hover:bg-slate-50'
            }`}
          >
            {hideDone ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
            ซ่อนที่เสร็จแล้ว
          </button>
        </div>
      </div>

      {/* Compact priority groups */}
      {visibleGroups.map((g) => {
        const items = sorted.filter((r) => r.priority === g.value);
        const Icon = g.icon;
        const isCollapsed = collapsed[g.value];
        return (
          <section key={g.value} className="card overflow-hidden" aria-label={`Priority ${g.title}`}>
            <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r border-b ${g.band}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-9 w-9 rounded-lg ${g.iconTile} text-white flex items-center justify-center shadow-card shrink-0`}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-jiffy-ink leading-tight">
                    {g.value} <span className="font-medium text-slate-600">· {g.hint}</span>
                  </h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${g.count}`}>{items.length} เรื่อง</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCreateRequirement(undefined, undefined, g.value)}
                  className="btn-secondary !py-1 !px-2.5 !text-xs"
                  title={`เพิ่ม Requirement ระดับ ${g.title}`}
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden />
                  เพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.value]: !c[g.value] }))}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-white"
                  aria-label={isCollapsed ? 'ขยาย' : 'ย่อ'}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isCollapsed &&
              (items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">ไม่มี Requirement ในระดับนี้</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-line text-xs">
                        <SortHeader label="Req ID" sortKey="req_id" sort={sort} onSort={onSort} className="w-32" />
                        <SortHeader label="ระบบ / โมดูล" sortKey="module" sort={sort} onSort={onSort} className="w-56" />
                        <SortHeader label="หัวข้อ" sortKey="title" sort={sort} onSort={onSort} className="min-w-[240px]" />
                        <SortHeader label="สถานะ" sortKey="status" sort={sort} onSort={onSort} className="w-44" />
                        <SortHeader label="Dev" sortKey="dev_assigned" sort={sort} onSort={onSort} className="w-32" />
                        <SortHeader label="Tester · วันที่-เวลา" sortKey="request_date" sort={sort} onSort={onSort} className="w-48" />
                        <th className="py-3 px-4 w-36 text-right font-semibold text-slate-600">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((req) => {
                        const meta = CORE_FUNCTION_META[req.core_function];
                        const CoreIcon = CORE_ICON[req.core_function];
                        const needsInfo = req.info_requested && req.status !== 'Done';
                        return (
                          <tr
                            key={req.id}
                            style={{ boxShadow: `inset 3px 0 0 ${g.accentHex}` }}
                            className={`transition-colors ${g.rowHover} ${req.status === 'Done' ? 'opacity-70' : ''}`}
                          >
                            <td className="py-2 px-4">
                              <span className="font-mono text-xs font-bold text-jiffy-navy bg-jiffy-sky px-2 py-0.5 rounded-md border border-jiffy-mist whitespace-nowrap">
                                {req.req_id}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                                >
                                  <CoreIcon className="w-3 h-3" aria-hidden />
                                  {meta.shortName}
                                </span>
                                <span className="text-xs text-slate-600 inline-flex items-center gap-1 truncate max-w-[130px]">
                                  <Layers className="w-3 h-3 text-slate-400 shrink-0" aria-hidden />
                                  {req.module}
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-slate-900 truncate max-w-[360px]" title={req.title}>
                                  {req.title}
                                </span>
                                {needsInfo && <NeedInfoBadge className="shrink-0" />}
                                {req.files.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 shrink-0" title={`${req.files.length} ไฟล์แนบ`}>
                                    <Paperclip className="w-3.5 h-3.5" aria-hidden />
                                    {req.files.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <StatusBadge status={req.status} />
                            </td>
                            <td className="py-2 px-4">
                              {req.dev_assigned ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800">
                                  <Code2 className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
                                  {req.dev_assigned}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-4 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800 leading-tight">{req.requested_by || '-'}</div>
                              <div className="text-xs text-slate-500 leading-tight">{formatDateTime(req.request_date)}</div>
                            </td>
                            <td className="py-2 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => onSelectRequirement(req)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-jiffy-navy bg-jiffy-sky hover:bg-jiffy-blue hover:text-white border border-jiffy-mist hover:border-jiffy-blue rounded-lg px-2.5 py-1.5 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden />
                                ดูรายละเอียด
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}
