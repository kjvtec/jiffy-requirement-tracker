'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Flame,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  Image as ImageIcon,
  User,
  Code2,
  Tag,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  Requirement,
  PriorityType,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
} from '@/types';
import { getStatusBadgeClass } from '@/lib/status';
import { PRIORITY_GROUPS, sortRequirementsDoneLast } from '@/lib/requirementSort';

interface PriorityListViewProps {
  requirements: Requirement[];
  onSelectRequirement: (requirement: Requirement) => void;
  onCreateRequirement: (presetCore?: CoreFunctionType, presetModule?: string, presetPriority?: PriorityType) => void;
  onExportExcel: (targetRequirements: Requirement[], scopeTitle?: string) => void;
}

type PrioritySortMode = 'req_id_asc' | 'req_id_desc' | 'status';

function PriorityGroupIcon({ priority }: { priority: PriorityType }) {
  if (priority === '1.High') return <Flame className="w-4 h-4 text-red-600 shrink-0" />;
  if (priority === '2.Medium') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
  return <Layers className="w-4 h-4 text-sky-600 shrink-0" />;
}

export default function PriorityListView({
  requirements,
  onSelectRequirement,
  onCreateRequirement,
  onExportExcel,
}: PriorityListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | 'ALL'>('ALL');
  const [coreFilter, setCoreFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<PriorityType, boolean>>({
    '1.High': false,
    '2.Medium': false,
    '3.Low': false,
  });
  const [sortBy, setSortBy] = useState<PrioritySortMode>('req_id_asc');

  // Filter requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      if (selectedPriority !== 'ALL' && r.priority !== selectedPriority) return false;
      if (coreFilter && (r.core_function || DEFAULT_CORE_FUNCTION) !== coreFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.req_id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.requested_by.toLowerCase().includes(q) ||
          (r.dev_assigned && r.dev_assigned.toLowerCase().includes(q)) ||
          r.module.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [requirements, selectedPriority, coreFilter, statusFilter, searchQuery]);

  const toggleCollapse = (priority: PriorityType) => {
    setCollapsedGroups((prev) => ({ ...prev, [priority]: !prev[priority] }));
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหา Req ID, หัวข้อ, หรือ Dev..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as PriorityType | 'ALL')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="ALL">ทุก Priority</option>
            <option value="1.High">1.High</option>
            <option value="2.Medium">2.Medium</option>
            <option value="3.Low">3.Low</option>
          </select>

          {/* Core Function filter */}
          <select
            value={coreFilter}
            onChange={(e) => setCoreFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="">ทุก Core Function</option>
            {CORE_FUNCTIONS.map((cf) => (
              <option key={cf} value={cf}>
                {cf}
              </option>
            ))}
          </select>

          {/* Sort button */}
          <button
            type="button"
            onClick={() => {
              setSortBy((prev) =>
                prev === 'req_id_asc'
                  ? 'req_id_desc'
                  : prev === 'req_id_desc'
                  ? 'status'
                  : 'req_id_asc'
              );
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium flex items-center gap-1 text-slate-700 hover:bg-slate-100"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortBy === 'req_id_asc'
              ? 'รหัส (น้อย ➔ มาก)'
              : sortBy === 'req_id_desc'
              ? 'รหัส (มาก ➔ น้อย)'
              : 'เรียงตามสถานะ'}
          </button>

          <button
            type="button"
            onClick={() => onExportExcel(filteredRequirements, 'Priority View')}
            className="px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-semibold hover:bg-emerald-100 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Priority Groups */}
      <div className="space-y-6">
        {PRIORITY_GROUPS.map((group) => {
          if (selectedPriority !== 'ALL' && selectedPriority !== group.value) return null;

          const groupItems = sortRequirementsDoneLast(
            filteredRequirements.filter((r) => r.priority === group.value),
            sortBy
          );
          const isCollapsed = collapsedGroups[group.value];

          return (
            <div
              key={group.value}
              className={`rounded-2xl border ${group.containerClass} p-5 shadow-sm space-y-4`}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <PriorityGroupIcon priority={group.value} />
                  <div>
                    <h3 className={`text-sm font-bold ${group.titleClass}`}>{group.label}</h3>
                    <p className={`text-xs ${group.subtitleClass}`}>
                      {groupItems.length} รายการ (เสร็จแล้ว{' '}
                      {groupItems.filter((i) => i.status === 'Done').length} รายการ)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onCreateRequirement(undefined, undefined, group.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1 ${group.controlBtnClass}`}
                  >
                    <Plus className="w-3 h-3" /> เพิ่ม {group.shortLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.value)}
                    className={`p-1.5 rounded-lg border ${group.controlBtnClass}`}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Items Table / Cards */}
              {!isCollapsed && (
                <div className={`rounded-xl border overflow-hidden ${group.innerBoxClass}`}>
                  {groupItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      ไม่มี Requirement ในระดับความสำคัญนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {groupItems.map((req) => {
                        const coreMeta =
                          CORE_FUNCTION_META[
                            (req.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION
                          ] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];

                        return (
                          <div
                            key={req.id}
                            onClick={() => onSelectRequirement(req)}
                            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                                  {req.req_id}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                    req.status
                                  )}`}
                                >
                                  {req.status}
                                </span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {req.type}
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded border ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}
                                >
                                  {req.core_function || DEFAULT_CORE_FUNCTION}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {req.module}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                                {req.title}
                              </h4>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {req.details}
                              </p>
                            </div>

                            <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 shrink-0 text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                              <div className="flex items-center gap-2">
                                {req.dev_assigned && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                    <Code2 className="w-2.5 h-2.5" />
                                    {req.dev_assigned}
                                  </span>
                                )}
                                {req.target_version && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                                    <Tag className="w-2.5 h-2.5" />
                                    {req.target_version}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <User className="w-3 h-3" /> {req.requested_by}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
