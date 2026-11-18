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
} from 'lucide-react';
import {
  Issue,
  PriorityType,
  StatusType,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  SystemModule,
  DEFAULT_MODULES_BY_CORE,
} from '@/types';
import { getStatusBadgeClass, STATUS_ORDER } from '@/lib/status';
import { PRIORITY_GROUPS, sortIssuesClosedLast } from '@/lib/issueSort';

interface PriorityListViewProps {
  issues: Issue[];
  modules?: SystemModule[];
  onSelectIssue: (issue: Issue) => void;
  onCreateIssue: (presetCore?: CoreFunctionType, presetModule?: string, presetPriority?: PriorityType) => void;
  onExportExcel: (targetIssues: Issue[], scopeTitle?: string) => void;
}

type PrioritySortMode = 'log_id_asc' | 'log_id_desc' | 'status';

function PriorityGroupIcon({ priority }: { priority: PriorityType }) {
  if (priority === '1.High') return <Flame className="w-4 h-4 text-red-600 shrink-0" />;
  if (priority === '2.Medium') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
  return <Layers className="w-4 h-4 text-sky-600 shrink-0" />;
}

export default function PriorityListView({
  issues,
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
  const [hideClosed, setHideClosed] = useState(false);
  const [sortBy, setSortBy] = useState<PrioritySortMode>('log_id_desc');
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

    issues.forEach((i) => {
      if (!coreFilter || (i.core_function || DEFAULT_CORE_FUNCTION) === coreFilter) {
        if (i.module) set.add(i.module);
      }
    });

    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
  }, [modules, issues, coreFilter]);

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
      issues
        .filter((i) => (i.core_function || DEFAULT_CORE_FUNCTION) === newCore)
        .forEach((i) => {
          if (i.module) allowedInCore.add(i.module);
        });
      if (!allowedInCore.has(moduleFilter)) {
        setModuleFilter('');
      }
    }
  };

  const baseFilteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((item) => {
      if (hideClosed && item.status === 'Closed') return false;
      if (coreFilter && (item.core_function || DEFAULT_CORE_FUNCTION) !== coreFilter) return false;
      if (moduleFilter && item.module !== moduleFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (q) {
        const hay = [
          item.log_id,
          item.details,
          item.module,
          item.core_function || DEFAULT_CORE_FUNCTION,
          item.resolution || '',
          item.remark || '',
          item.raise_by,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, searchQuery, hideClosed, coreFilter, moduleFilter, statusFilter]);

  const groupedData = useMemo(() => {
    return PRIORITY_GROUPS.map((meta) => {
      const allItems = sortIssuesClosedLast(
        baseFilteredIssues.filter((i) => i.priority === meta.value),
        sortBy
      );
      const activeItems = allItems.filter((i) => i.status !== 'Closed');
      const closedItems = allItems.filter((i) => i.status === 'Closed');
      return {
        meta,
        allItems,
        activeItems,
        closedItems,
      };
    });
  }, [baseFilteredIssues, sortBy]);

  const visibleGroups = useMemo(() => {
    return selectedPriority === 'ALL'
      ? groupedData
      : groupedData.filter((g) => g.meta.value === selectedPriority);
  }, [groupedData, selectedPriority]);

  const flatExportItems = useMemo(() => {
    return visibleGroups.flatMap((g) => g.allItems);
  }, [visibleGroups]);

  const totalStats = useMemo(() => {
    const active = baseFilteredIssues.filter((i) => i.status !== 'Closed').length;
    const closed = baseFilteredIssues.filter((i) => i.status === 'Closed').length;
    return { total: baseFilteredIssues.length, active, closed };
  }, [baseFilteredIssues]);

  const toggleGroupCollapse = (priority: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [priority]: !prev[priority] }));
  };

  const hasFilters = Boolean(
    searchQuery || coreFilter || moduleFilter || statusFilter || hideClosed || selectedPriority !== 'ALL'
  );

  const clearFilters = () => {
    setSearchQuery('');
    setCoreFilter('');
    setModuleFilter('');
    setStatusFilter('');
    setHideClosed(false);
    setSelectedPriority('ALL');
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Top Bar: Quick Color Priority Pills + Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#0C2553] flex items-center gap-1.5 mr-1">
              <ListOrdered className="w-4 h-4 text-[#0086FF] shrink-0" />
              แยกตาม Priority (Compact List View)
            </h2>

            {/* Quick Priority Switcher Pills */}
            <button
              type="button"
              onClick={() => setSelectedPriority('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                selectedPriority === 'ALL'
                  ? 'bg-[#0086FF] text-white border-[#0086FF] shadow-2xs'
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
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
              disabled={flatExportItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export ({flatExportItems.length})
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0C2553] bg-[#FFCB06] hover:bg-[#F5C000] border border-[#E5B300] rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              แจ้งปัญหาใหม่
            </button>
          </div>
        </div>

        {/* Compact Single-Row Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Issue No, รายละเอียด, Module, ผู้แจ้ง..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={coreFilter}
              onChange={(e) => handleCoreChange(e.target.value)}
              className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none"
            >
              <option value="">ทุกกลุ่มหลัก</option>
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
            className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none"
          >
            <option value="">ทุกกลุ่มย่อย</option>
            {availableModules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none"
          >
            <option value="">ทุกสถานะ</option>
            {STATUS_ORDER.map((st: StatusType) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PrioritySortMode)}
              className="py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none"
            >
              <option value="log_id_desc">เรียง Issue No (มาก ➔ น้อย / ล่าสุดก่อน Z-A)</option>
              <option value="log_id_asc">เรียง Issue No (น้อย ➔ มาก / A-Z)</option>
              <option value="status">เรียงตามสถานะ</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 select-none">
            <input
              type="checkbox"
              checked={hideClosed}
              onChange={(e) => setHideClosed(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>ซ่อน Closed</span>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Color-Coded Compact List View Cards (High=Red, Medium=Amber, Low=Sky) */}
      <div className="space-y-3.5">
        {visibleGroups.map(({ meta, allItems, activeItems, closedItems }) => {
          const isCollapsed = Boolean(collapsedGroups[meta.value]);

          return (
            <div
              key={meta.value}
              className={`${meta.containerClass} rounded-2xl p-3.5 sm:p-4 border shadow-sm space-y-2.5`}
            >
              {/* Header Strip matching Dashboard Compact List View */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-extrabold flex items-center gap-1.5 ${meta.titleClass}`}>
                    <PriorityGroupIcon priority={meta.value} />
                    {meta.label}
                  </h3>
                  <span className={`hidden lg:inline text-[11px] ${meta.subtitleClass}`}>
                    • คลิกที่รายการเพื่อดูรายละเอียดหรืออัปเดต
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

              {/* Compact White List Container */}
              {!isCollapsed && (
                allItems.length === 0 ? (
                  <div className={`${meta.innerBoxClass} rounded-xl border px-4 py-5 text-center text-xs text-slate-400`}>
                    ไม่พบรายการปัญหาในระดับ {meta.shortLabel} ตามเงื่อนไขที่เลือก
                  </div>
                ) : (
                  <div className={`${meta.innerBoxClass} rounded-xl border overflow-hidden`}>
                    {/* Compact Column Header */}
                    <div className={`hidden md:grid md:grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${meta.tableHeaderClass}`}>
                      <div className="col-span-2">Issue No</div>
                      <div className="col-span-3">กลุ่มหลัก / กลุ่มย่อย</div>
                      <div className="col-span-5">รายละเอียดปัญหา</div>
                      <div className="col-span-1">ผู้แจ้ง</div>
                      <div className="col-span-1 text-right">สถานะ</div>
                    </div>

                    <div className={`divide-y ${meta.divideClass}`}>
                      {allItems.map((issue, idx) => {
                        const isClosed = issue.status === 'Closed';
                        const isFirstClosed = isClosed && (idx === 0 || allItems[idx - 1]?.status !== 'Closed');
                        const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
                        const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
                        const statusColor = getStatusBadgeClass(issue.status);

                        return (
                          <React.Fragment key={issue.id}>
                            {isFirstClosed && activeItems.length > 0 && (
                              <div className="px-3 py-1 bg-slate-50/95 border-y border-slate-200/80 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                ปิดงานแล้ว (Closed) — {closedItems.length} รายการ
                              </div>
                            )}

                            <div
                              onClick={() => onSelectIssue(issue)}
                              className={`px-3 py-1.5 transition-colors cursor-pointer group grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 items-center text-xs ${
                                isClosed
                                  ? 'bg-slate-50/75 opacity-65 hover:opacity-100 hover:bg-slate-100/80'
                                  : meta.rowHoverClass
                              }`}
                            >
                              {/* Issue No + Attachment Count */}
                              <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span
                                    className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md border transition-colors shrink-0 ${
                                      isClosed
                                        ? 'text-slate-600 bg-slate-100 border-slate-200 group-hover:bg-slate-600 group-hover:border-slate-600 group-hover:text-white'
                                        : meta.logIdBadgeClass
                                    }`}
                                  >
                                    {issue.log_id}
                                  </span>
                                  {issue.images && issue.images.length > 0 && (
                                    <span
                                      className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5 shrink-0"
                                      title={`${issue.images.length} รูปภาพประกอบ`}
                                    >
                                      <ImageIcon className="w-2.5 h-2.5" />
                                      {issue.images.length}
                                    </span>
                                  )}
                                </div>

                                <span className={`md:hidden text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                                  {issue.status}
                                </span>
                              </div>

                              {/* Core Function & Module inline compact pills */}
                              <div className="md:col-span-3 flex items-center gap-1 min-w-0">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}>
                                  {coreMeta.shortName}
                                </span>
                                <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate">
                                  {issue.module}
                                </span>
                              </div>

                              {/* Single-line Details */}
                              <div className="md:col-span-5 min-w-0">
                                <p
                                  className={`text-[13px] leading-snug font-medium truncate ${
                                    isClosed ? 'text-slate-500' : `text-slate-800 ${meta.detailHoverClass}`
                                  }`}
                                  title={issue.details}
                                >
                                  {issue.details}
                                </p>
                              </div>

                              {/* Reporter */}
                              <div
                                className="md:col-span-1 flex items-center gap-1 text-[11px] text-slate-600 truncate"
                                title={
                                  issue.raise_date
                                    ? `แจ้งเมื่อ ${new Date(issue.raise_date).toLocaleDateString('th-TH')}`
                                    : ''
                                }
                              >
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{issue.raise_by}</span>
                              </div>

                              {/* Desktop Status */}
                              <div className="hidden md:flex md:col-span-1 items-center justify-end">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${statusColor}`}>
                                  {issue.status}
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
