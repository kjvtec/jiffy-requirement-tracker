'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  Image as ImageIcon,
  User,
  CheckCircle2,
  ArrowUpDown,
  ListOrdered,
  X,
  Code2,
} from 'lucide-react';
import {
  Requirement,
  PriorityType,
  RequirementStatusType,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  SystemModule,
  DEFAULT_MODULES_BY_CORE,
  REQUIREMENT_STATUSES,
} from '@/types';
import { getStatusBadgeClass, getStatusShortTh } from '@/lib/status';
import { PRIORITY_GROUPS, sortIssuesClosedLast, parseIssueNumber } from '@/lib/issueSort';

interface PriorityListViewProps {
  issues: Requirement[];
  modules?: SystemModule[];
  onSelectIssue: (issue: Requirement) => void;
  onCreateIssue: (presetCore?: CoreFunctionType, presetModule?: string, presetPriority?: PriorityType) => void;
  onExportExcel: (targetIssues: Requirement[], scopeTitle?: string) => void;
}

type PrioritySortMode = 'req_id_desc' | 'req_id_asc' | 'status';

function PriorityGroupIcon({ priority }: { priority: PriorityType }) {
  if (priority === '1.High') return <Flame className="w-4 h-4 text-red-600 shrink-0" />;
  if (priority === '2.Medium') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
  return <Layers className="w-4 h-4 text-sky-600 shrink-0" />;
}

export default function PriorityListView({
  issues: requirements,
  modules,
  onSelectIssue,
  onCreateIssue,
  onExportExcel,
}: PriorityListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | 'ALL'>('ALL');
  const [coreFilter, setCoreFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hideDone, setHideDone] = useState(false);
  const [sortBy, setSortBy] = useState<PrioritySortMode>('req_id_desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const availableModules = useMemo(() => {
    const set = new Set<string>();

    if (modules && modules.length > 0) {
      modules.forEach((m) => {
        if (!coreFilter || !m.core_function || m.core_function === coreFilter) {
          if (m.name) set.add(m.name);
        }
      });
    }

    if (coreFilter && DEFAULT_MODULES_BY_CORE[coreFilter as CoreFunctionType]) {
      DEFAULT_MODULES_BY_CORE[coreFilter as CoreFunctionType].forEach((m) => set.add(m));
    } else if (!coreFilter) {
      Object.values(DEFAULT_MODULES_BY_CORE).forEach((list) => {
        list.forEach((m) => set.add(m));
      });
    }

    requirements.forEach((i) => {
      if (!coreFilter || (i.core_function || DEFAULT_CORE_FUNCTION) === coreFilter) {
        if (i.module) set.add(i.module);
      }
    });

    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
  }, [modules, requirements, coreFilter]);

  const handleCoreChange = (newCore: string) => {
    setCoreFilter(newCore);
    if (moduleFilter && newCore) {
      const allowedInCore = new Set<string>();
      if (DEFAULT_MODULES_BY_CORE[newCore as CoreFunctionType]) {
        DEFAULT_MODULES_BY_CORE[newCore as CoreFunctionType].forEach((m) => allowedInCore.add(m));
      }
      if (modules) {
        modules.filter((m) => m.core_function === newCore).forEach((m) => allowedInCore.add(m.name));
      }
      requirements
        .filter((i) => (i.core_function || DEFAULT_CORE_FUNCTION) === newCore)
        .forEach((i) => {
          if (i.module) allowedInCore.add(i.module);
        });
      if (!allowedInCore.has(moduleFilter)) {
        setModuleFilter('');
      }
    }
  };

  const baseFilteredRequirements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requirements.filter((item) => {
      const isDone = item.status === 'Done' || (item.status as string) === 'Closed';
      if (hideDone && isDone) return false;
      if (coreFilter && (item.core_function || DEFAULT_CORE_FUNCTION) !== coreFilter) return false;
      if (moduleFilter && item.module !== moduleFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (q) {
        const hay = [
          item.req_id || (item as any).log_id || '',
          item.title || '',
          item.details || '',
          item.module || '',
          (item.core_function || DEFAULT_CORE_FUNCTION) as string,
          item.dev_assigned || (item as any).closed_by || '',
          item.remark || '',
          item.requested_by || (item as any).raise_by || '',
          item.target_version || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requirements, searchQuery, hideDone, coreFilter, moduleFilter, statusFilter]);

  const groupedData = useMemo(() => {
    return PRIORITY_GROUPS.map((meta) => {
      const allItems = [...baseFilteredRequirements.filter((i) => i.priority === meta.value)].sort((a, b) => {
        const isDoneA = a.status === 'Done' || (a.status as string) === 'Closed' ? 1 : 0;
        const isDoneB = b.status === 'Done' || (b.status as string) === 'Closed' ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        const numA = parseIssueNumber(a.req_id || (a as any).log_id || '');
        const numB = parseIssueNumber(b.req_id || (b as any).log_id || '');
        return sortBy === 'req_id_desc' ? numB - numA : numA - numB;
      });

      const activeItems = allItems.filter((i) => i.status !== 'Done' && (i.status as string) !== 'Closed');
      const doneItems = allItems.filter((i) => i.status === 'Done' || (i.status as string) === 'Closed');
      return {
        meta,
        allItems,
        activeItems,
        doneItems,
      };
    });
  }, [baseFilteredRequirements, sortBy]);

  const visibleGroups = useMemo(() => {
    return selectedPriority === 'ALL'
      ? groupedData
      : groupedData.filter((g) => g.meta.value === selectedPriority);
  }, [groupedData, selectedPriority]);

  const flatExportItems = useMemo(() => {
    return visibleGroups.flatMap((g) => g.allItems);
  }, [visibleGroups]);

  const totalStats = useMemo(() => {
    const active = baseFilteredRequirements.filter((i) => i.status !== 'Done' && (i.status as string) !== 'Closed').length;
    const done = baseFilteredRequirements.filter((i) => i.status === 'Done' || (i.status as string) === 'Closed').length;
    return { total: baseFilteredRequirements.length, active, done };
  }, [baseFilteredRequirements]);

  const toggleGroupCollapse = (priority: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [priority]: !prev[priority] }));
  };

  const hasFilters = Boolean(
    searchQuery || coreFilter || moduleFilter || statusFilter || hideDone || selectedPriority !== 'ALL'
  );

  const clearFilters = () => {
    setSearchQuery('');
    setCoreFilter('');
    setModuleFilter('');
    setStatusFilter('');
    setHideDone(false);
    setSelectedPriority('ALL');
  };

  return (
    <div className="space-y-3.5">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#044492] flex items-center gap-1.5 mr-1">
              <ListOrdered className="w-4 h-4 text-[#0086FF] shrink-0" />
              แยกตาม Priority (Priority List View)
            </h2>

            {/* Quick Priority Switcher Pills */}
            <button
              type="button"
              onClick={() => setSelectedPriority('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                selectedPriority === 'ALL'
                  ? 'bg-[#044492] text-white border-[#044492] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ทั้งหมด ({totalStats.total})
            </button>

            {groupedData.map(({ meta, allItems, activeItems }) => {
              const isSelected = selectedPriority === meta.value;
              return (
                <button
                  key={meta.value}
                  type="button"
                  onClick={() =>
                    setSelectedPriority((prev) => (prev === meta.value ? 'ALL' : meta.value))
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    isSelected
                      ? meta.summaryActiveClass
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <PriorityGroupIcon priority={meta.value} />
                  <span>{meta.shortLabel}</span>
                  <span className={`px-1.5 py-0 rounded-full text-[11px] border ${meta.pillBadgeClass}`}>
                    {activeItems.length}/{allItems.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const parts: string[] = [];
                if (selectedPriority !== 'ALL') parts.push(selectedPriority);
                if (coreFilter) parts.push(coreFilter);
                if (moduleFilter) parts.push(moduleFilter);
                if (statusFilter) parts.push(statusFilter);
                const scopeTitle = parts.length > 0 ? parts.join(' - ') : 'Priority List View';
                onExportExcel(flatExportItems, scopeTitle);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>

            <button
              type="button"
              onClick={() =>
                onCreateIssue(
                  coreFilter ? (coreFilter as CoreFunctionType) : undefined,
                  moduleFilter || undefined,
                  selectedPriority !== 'ALL' ? selectedPriority : undefined
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-950 bg-[#FFCB06] hover:bg-[#E5B600] rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม Requirement
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Req ID, หัวข้อ, รายละเอียด, Dev, ผู้ขอ..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#0086FF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={coreFilter}
              onChange={(e) => handleCoreChange(e.target.value)}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-[#0086FF] focus:outline-none"
            >
              <option value="">ทุก Core Functions</option>
              {CORE_FUNCTIONS.map((cf) => (
                <option key={cf} value={cf}>
                  {cf}
                </option>
              ))}
            </select>
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-[#0086FF] focus:outline-none"
          >
            <option value="">ทุกโมดูล</option>
            {availableModules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-[#0086FF] focus:outline-none"
          >
            <option value="">ทุกสถานะ (Status)</option>
            {REQUIREMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st} ({getStatusShortTh(st)})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PrioritySortMode)}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-[#0086FF] focus:outline-none"
            >
              <option value="req_id_desc">เรียง Req ID (ล่าสุดก่อน)</option>
              <option value="req_id_asc">เรียง Req ID (แรกสุดก่อน)</option>
              <option value="status">เรียงตามสถานะ</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 select-none">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>ซ่อน Done</span>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Grouped Priority Cards */}
      <div className="space-y-3.5">
        {visibleGroups.map(({ meta, allItems, activeItems, doneItems }) => {
          const isCollapsed = Boolean(collapsedGroups[meta.value]);

          return (
            <div
              key={meta.value}
              className={`${meta.containerClass} rounded-2xl p-3.5 sm:p-4 border shadow-sm space-y-2.5`}
            >
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-extrabold flex items-center gap-1.5 ${meta.titleClass}`}>
                    <PriorityGroupIcon priority={meta.value} />
                    {meta.label}
                  </h3>
                  <span className={`hidden lg:inline text-[11px] ${meta.subtitleClass}`}>
                    • คลิกที่รายการเพื่อดูรายละเอียด
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-extrabold border px-2.5 py-0.5 rounded-full ${meta.countPillClass}`}>
                    {allItems.length} รายการ
                  </span>
                  <button
                    type="button"
                    onClick={() => onExportExcel(allItems, `Priority ${meta.value}`)}
                    disabled={allItems.length === 0}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full transition-colors disabled:opacity-40 ${meta.controlBtnClass}`}
                    title={`Export รายการระดับ ${meta.value}`}
                  >
                    <Download className="w-3 h-3" />
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(meta.value)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full transition-colors ${meta.controlBtnClass}`}
                  >
                    {isCollapsed ? (
                      <>
                        แสดง <ChevronDown className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        ย่อ <ChevronUp className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Requirements List Container */}
              {!isCollapsed && (
                allItems.length === 0 ? (
                  <div className={`${meta.innerBoxClass} rounded-xl border px-4 py-5 text-center text-xs text-slate-400`}>
                    ไม่พบรายการ Requirement ในระดับ {meta.shortLabel} ตามเงื่อนไขที่เลือก
                  </div>
                ) : (
                  <div className={`${meta.innerBoxClass} rounded-xl border overflow-hidden`}>
                    {/* Header */}
                    <div className={`hidden md:grid md:grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${meta.tableHeaderClass}`}>
                      <div className="col-span-2">Req ID</div>
                      <div className="col-span-3">Core / Module</div>
                      <div className="col-span-4">หัวข้อ & รายละเอียด Requirement</div>
                      <div className="col-span-2">Dev / Version</div>
                      <div className="col-span-1 text-right">สถานะ</div>
                    </div>

                    <div className={`divide-y ${meta.divideClass}`}>
                      {allItems.map((req, idx) => {
                        const isDone = req.status === 'Done' || (req.status as string) === 'Closed';
                        const isFirstDone = isDone && (idx === 0 || (allItems[idx - 1]?.status !== 'Done' && (allItems[idx - 1]?.status as string) !== 'Closed'));
                        const coreFn = (req.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
                        const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
                        const statusColor = getStatusBadgeClass(req.status);
                        const displayId = req.req_id || (req as any).log_id || 'REQ';

                        return (
                          <React.Fragment key={req.id}>
                            {isFirstDone && activeItems.length > 0 && (
                              <div className="px-3 py-1 bg-slate-50/95 border-y border-slate-200/80 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                เสร็จสมบูรณ์ (Done / Released) — {doneItems.length} รายการ
                              </div>
                            )}

                            <div
                              onClick={() => onSelectIssue(req)}
                              className={`px-3 py-2 transition-colors cursor-pointer group grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 items-center text-xs ${
                                isDone
                                  ? 'bg-slate-50/75 opacity-70 hover:opacity-100 hover:bg-slate-100/80'
                                  : meta.rowHoverClass
                              }`}
                            >
                              {/* Req ID */}
                              <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span
                                    className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md border transition-colors shrink-0 ${
                                      isDone
                                        ? 'text-slate-600 bg-slate-100 border-slate-200'
                                        : meta.logIdBadgeClass
                                    }`}
                                  >
                                    {displayId}
                                  </span>
                                  {req.images && req.images.length > 0 && (
                                    <span
                                      className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5 shrink-0"
                                      title={`${req.images.length} รูป Wireframe`}
                                    >
                                      <ImageIcon className="w-2.5 h-2.5" />
                                      {req.images.length}
                                    </span>
                                  )}
                                </div>

                                <span className={`md:hidden text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                                  {req.status}
                                </span>
                              </div>

                              {/* Core & Module */}
                              <div className="md:col-span-3 flex items-center gap-1 min-w-0">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}>
                                  {coreMeta.shortName}
                                </span>
                                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate">
                                  {req.module}
                                </span>
                              </div>

                              {/* Title / Details */}
                              <div className="md:col-span-4 min-w-0">
                                <p
                                  className={`text-xs font-bold truncate ${
                                    isDone ? 'text-slate-500' : `text-slate-900 ${meta.detailHoverClass}`
                                  }`}
                                  title={req.title || req.details}
                                >
                                  {req.title || req.details}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {req.details}
                                </p>
                              </div>

                              {/* Dev & Version */}
                              <div className="md:col-span-2 flex flex-col justify-center min-w-0 text-[11px]">
                                {req.dev_assigned || (req as any).closed_by ? (
                                  <span className="font-semibold text-indigo-900 truncate">
                                    Dev: {req.dev_assigned || (req as any).closed_by}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">ยังไม่มอบหมาย</span>
                                )}
                                {req.target_version && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {req.target_version}
                                  </span>
                                )}
                              </div>

                              {/* Status */}
                              <div className="md:col-span-1 text-right hidden md:block">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                                  {req.status}
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
