'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Layers,
  FolderTree,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Plus,
  Download,
  Image as ImageIcon,
  Eye,
  Edit,
  Trash2,
  Flame,
  CheckCircle2,
  Code2,
  TestTube2,
  FileText,
  Clock,
  User,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  Requirement,
  RequirementFilter,
  SystemModule,
  TeamMember,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  REQUIREMENT_STATUSES,
  RequirementStatusType,
} from '@/types';
import { getStatusBadgeClass, getStatusShortTh } from '@/lib/status';
import { parseReqNumber } from '@/lib/requirementSort';
import SubModuleModals, {
  RenameTarget,
  DeleteBlockedNotice,
  ConfirmDeleteTarget,
} from './SubModuleModals';

interface RequirementExplorerViewProps {
  requirements: Requirement[];
  modules: SystemModule[];
  teamMembers: TeamMember[];
  filter: RequirementFilter;
  onFilterChange: React.Dispatch<React.SetStateAction<RequirementFilter>>;
  selectedCore: CoreFunctionType | null;
  selectedModule: string | null;
  onSelectCore: (core: CoreFunctionType | null) => void;
  onSelectModule: (mod: string | null) => void;
  onSelectRequirement: (requirement: Requirement) => void;
  onEditRequirement: (requirement: Requirement) => void;
  onDeleteRequirement: (requirementId: string) => void;
  onCreateRequirement: (presetCore?: CoreFunctionType, presetModule?: string) => void;
  onExportExcel: (targetRequirements: Requirement[], scopeTitle?: string) => void;
  onAddModule?: (name: string, coreFunction: CoreFunctionType) => Promise<void>;
  onUpdateModule?: (oldName: string, newName: string, coreFunction: CoreFunctionType) => Promise<void>;
  onDeleteModule?: (name: string, coreFunction: CoreFunctionType) => Promise<{ success: boolean; message?: string }>;
}

const getPriorityStyle = (priority: string) => {
  if (priority.includes('High')) return 'bg-red-50 text-red-700 border-red-200';
  if (priority.includes('Medium')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

interface RequirementTableProps {
  items: Requirement[];
  sortField: keyof Requirement;
  sortAsc: boolean;
  onSort: (field: keyof Requirement) => void;
  onSelectRequirement: (requirement: Requirement) => void;
  onEditRequirement: (requirement: Requirement) => void;
  onDeleteRequirement: (requirementId: string) => void;
  showCoreColumn?: boolean;
}

const RequirementTable = React.memo(function RequirementTable({
  items,
  sortField,
  sortAsc,
  onSort,
  onSelectRequirement,
  onEditRequirement,
  onDeleteRequirement,
  showCoreColumn = false,
}: RequirementTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th
              onClick={() => onSort('req_id')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-32"
            >
              <div className="flex items-center gap-1">
                Req ID
                <ArrowUpDown className={`w-3 h-3 ${sortField === 'req_id' ? 'text-[#0086FF]' : 'text-slate-400'}`} />
                {sortField === 'req_id' && (
                  <span className="text-[9px] text-[#0086FF]">{sortAsc ? '↑' : '↓'}</span>
                )}
              </div>
            </th>
            {showCoreColumn && <th className="py-3 px-4 w-44">Core / Module</th>}
            {!showCoreColumn && (
              <th
                onClick={() => onSort('module')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-36"
              >
                <div className="flex items-center gap-1">
                  โมดูล
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            )}
            <th
              onClick={() => onSort('priority')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-24"
            >
              <div className="flex items-center gap-1">
                Priority
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th
              onClick={() => onSort('status')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-32"
            >
              <div className="flex items-center gap-1">
                สถานะ (Status)
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="py-3 px-4 min-w-[280px]">หัวข้อ & รายละเอียด Requirement</th>
            <th className="py-3 px-4 w-36">Dev ผู้รับผิดชอบ</th>
            <th className="py-3 px-4 w-32">ผู้ขอ / วันที่</th>
            <th className="py-3 px-4 text-right w-24">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
          {items.map((req) => {
            const coreFn = (req.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
            const meta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
            const isDone = req.status === 'Done';
            const displayId = req.req_id || 'REQ';

            return (
              <tr
                key={req.id}
                onClick={() => onSelectRequirement(req)}
                className={`transition-colors cursor-pointer group ${
                  isDone
                    ? 'bg-slate-50/80 opacity-80 hover:opacity-100 hover:bg-slate-100/70'
                    : 'hover:bg-[#F4F9FF]'
                }`}
              >
                {/* 1. Req ID */}
                <td className="py-3.5 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-mono text-xs font-bold text-[#044492] bg-[#EFF7FF] px-2.5 py-1 rounded-lg border border-[#CFE4FF] group-hover:bg-[#0086FF] group-hover:border-[#0086FF] group-hover:text-white transition-colors">
                      {displayId}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 px-1">
                      {req.type || 'New Feature'}
                    </span>
                  </div>
                </td>

                {/* 2. Core / Module */}
                <td className="py-3.5 px-4 align-top">
                  {showCoreColumn && (
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                      {meta.shortName}
                    </span>
                  )}
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {req.module}
                    </span>
                  </div>
                </td>

                {/* 3. Priority */}
                <td className="py-3.5 px-4 align-top">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${getPriorityStyle(req.priority)}`}>
                    {req.priority}
                  </span>
                </td>

                {/* 4. Status */}
                <td className="py-3.5 px-4 align-top">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(
                      req.status
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {req.status}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-500 mt-1">
                    {getStatusShortTh(req.status)}
                  </span>
                </td>

                {/* 5. Title & Details */}
                <td className="py-3.5 px-4 align-top">
                  <div className="font-bold text-slate-900 group-hover:text-[#0086FF] transition-colors line-clamp-1 text-xs sm:text-sm">
                    {req.title || req.details}
                  </div>
                  <p className="text-slate-600 font-normal line-clamp-2 text-xs leading-relaxed mt-1">
                    {req.details}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {req.images && req.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        <ImageIcon className="w-3 h-3" />
                        {req.images.length} รูป Wireframe
                      </span>
                    )}
                    {req.remark && (
                      <span className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md line-clamp-1 max-w-sm">
                        หมายเหตุ: {req.remark}
                      </span>
                    )}
                  </div>
                </td>

                {/* 6. Dev Assigned & Target Version */}
                <td className="py-3.5 px-4 align-top">
                  {req.dev_assigned ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/80 w-fit">
                        <Code2 className="w-3 h-3 text-indigo-600" />
                        {req.dev_assigned}
                      </span>
                      {req.target_version && (
                        <span className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">
                          {req.target_version}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">ยังไม่มอบหมาย</span>
                  )}
                </td>

                {/* 7. Requested By & Date */}
                <td className="py-3.5 px-4 align-top">
                  <p className="text-xs font-bold text-slate-800">
                    {req.requested_by || 'Unknown'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {req.request_date
                      ? new Date(req.request_date).toLocaleDateString('th-TH')
                      : '-'}
                  </p>
                </td>

                {/* 8. Actions */}
                <td className="py-3.5 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectRequirement(req)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ดูรายละเอียด Requirement"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditRequirement(req)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="แก้ไข Requirement"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRequirement(req.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ Requirement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default function RequirementExplorerView({
  requirements,
  modules,
  teamMembers,
  filter,
  onFilterChange,
  selectedCore,
  selectedModule,
  onSelectCore,
  onSelectModule,
  onSelectRequirement,
  onEditRequirement,
  onDeleteRequirement,
  onCreateRequirement,
  onExportExcel,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
}: RequirementExplorerViewProps) {
  const [sortField, setSortField] = useState<keyof Requirement>('req_id');
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsedSubModules, setCollapsedSubModules] = useState<Record<string, boolean>>({});
  const [addingSubModule, setAddingSubModule] = useState(false);
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [savingSubModule, setSavingSubModule] = useState(false);

  // Sub-module management modal states
  const [managingModules, setManagingModules] = useState(false);
  const [manageSearch, setManageSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ oldName: string; core: CoreFunctionType } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [deleteBlockedNotice, setDeleteBlockedNotice] = useState<{ moduleName: string; count: number } | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ moduleName: string; core: CoreFunctionType } | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  const handleOpenRename = (modName: string, core?: CoreFunctionType | null) => {
    const validCore = (core || selectedCore || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
    setRenameTarget({ oldName: modName, core: validCore });
    setRenameValue(modName);
  };

  const handleSaveRename = async () => {
    if (!renameTarget || !renameValue.trim() || !onUpdateModule) return;
    try {
      setSavingRename(true);
      await onUpdateModule(renameTarget.oldName, renameValue.trim(), renameTarget.core);
      setRenameTarget(null);
      setRenameValue('');
    } catch (e: any) {
      alert('เกิดข้อผิดพลาดในการแก้ไขชื่อโมดูล: ' + (e?.message || e));
    } finally {
      setSavingRename(false);
    }
  };

  const handleAttemptDeleteModule = (
    modName: string,
    core: CoreFunctionType | null | undefined,
    count: number
  ) => {
    if (count > 0) {
      setDeleteBlockedNotice({ moduleName: modName, count });
      return;
    }
    const validCore = (core || selectedCore || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
    setConfirmDeleteTarget({ moduleName: modName, core: validCore });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget || !onDeleteModule) return;
    try {
      setDeletingModule(true);
      const res = await onDeleteModule(confirmDeleteTarget.moduleName, confirmDeleteTarget.core);
      if (!res.success) {
        alert(res.message || 'ไม่สามารถลบโมดูลนี้ได้');
      } else {
        setConfirmDeleteTarget(null);
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาดในการลบโมดูล: ' + (e?.message || e));
    } finally {
      setDeletingModule(false);
    }
  };

  const handleSort = (field: keyof Requirement) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortRequirements = useMemo(() => {
    return (list: Requirement[]) =>
      [...list].sort((a, b) => {
        const isDoneA = a.status === 'Done' ? 1 : 0;
        const isDoneB = b.status === 'Done' ? 1 : 0;
        if (isDoneA !== isDoneB) return isDoneA - isDoneB;

        if (sortField === 'req_id') {
          const numA = parseReqNumber(a.req_id || '');
          const numB = parseReqNumber(b.req_id || '');
          return sortAsc ? numA - numB : numB - numA;
        }
        const valA = String(a[sortField] ?? '').toLowerCase();
        const valB = String(b[sortField] ?? '').toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [sortField, sortAsc]);

  // Apply search and dropdown filters
  const matchingRequirements = useMemo(() => {
    const filtered = requirements.filter((item) => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchId = (item.req_id || '').toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchDetails = (item.details || '').toLowerCase().includes(q);
        const matchRemark = (item.remark || '').toLowerCase().includes(q);
        const matchModule = (item.module || '').toLowerCase().includes(q);
        const matchCore = ((item.core_function || DEFAULT_CORE_FUNCTION) as string).toLowerCase().includes(q);
        const matchDev = (item.dev_assigned || '').toLowerCase().includes(q);
        const matchReqBy = (item.requested_by || '').toLowerCase().includes(q);

        if (!matchId && !matchTitle && !matchDetails && !matchRemark && !matchModule && !matchCore && !matchDev && !matchReqBy) {
          return false;
        }
      }
      if (filter.status && item.status !== filter.status) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.dev_assigned && item.dev_assigned !== filter.dev_assigned) return false;
      if (filter.requested_by && (item.requested_by) !== filter.requested_by) return false;
      return true;
    });
    return sortRequirements(filtered);
  }, [requirements, filter, sortRequirements]);

  const hasActiveFilters = Boolean(
    filter.search || filter.status || filter.priority || filter.dev_assigned || filter.requested_by
  );

  const clearFilters = () => {
    onFilterChange({
      search: '',
      core_function: '',
      status: '',
      priority: '',
      module: '',
      requested_by: '',
      dev_assigned: '',
    });
  };

  // Build hierarchical summaries across all 5 Core Functions
  const coreSummaries = useMemo(() => {
    return CORE_FUNCTIONS.map((core) => {
      const coreAll = requirements.filter(
        (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === core
      );
      const coreFiltered = matchingRequirements.filter(
        (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === core
      );

      const modSet = new Set<string>();
      modules
        .filter((m) => (m.core_function || DEFAULT_CORE_FUNCTION) === core)
        .forEach((m) => {
          if (m.name) modSet.add(m.name);
        });
      coreAll.forEach((r) => {
        if (r.module) modSet.add(r.module);
      });

      const subModules = Array.from(modSet)
        .map((modName) => {
          const modAll = coreAll.filter((r) => (r.module || 'General') === modName);
          const modFiltered = coreFiltered.filter((r) => (r.module || 'General') === modName);
          const total = modAll.length;
          const done = modAll.filter((r) => r.status === 'Done').length;
          const pending = total - done;
          return {
            name: modName,
            total,
            done,
            pending,
            percentDone: total > 0 ? Math.round((done / total) * 100) : 0,
            filteredRequirements: modFiltered,
          };
        })
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name, 'th');
        });

      const total = coreAll.length;
      const done = coreAll.filter((r) => r.status === 'Done').length;
      const pending = total - done;

      return {
        core,
        meta: CORE_FUNCTION_META[core],
        total,
        done,
        pending,
        percentDone: total > 0 ? Math.round((done / total) * 100) : 0,
        filteredRequirements: coreFiltered,
        subModules,
      };
    });
  }, [requirements, matchingRequirements, modules]);

  const activeCoreSummary = useMemo(() => {
    if (!selectedCore) return null;
    return coreSummaries.find((c) => c.core === selectedCore) || null;
  }, [coreSummaries, selectedCore]);

  const activeModuleSummary = useMemo(() => {
    if (!activeCoreSummary || !selectedModule) return null;
    return (
      activeCoreSummary.subModules.find((m) => m.name === selectedModule) || {
        name: selectedModule,
        total: 0,
        done: 0,
        pending: 0,
        percentDone: 0,
        filteredRequirements: activeCoreSummary.filteredRequirements.filter(
          (r) => r.module === selectedModule
        ),
      }
    );
  }, [activeCoreSummary, selectedModule]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหา Req ID, หัวข้อ, รายละเอียด, Dev, ผู้ขอ..."
              value={filter.search}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0086FF] outline-none transition-all"
            />
          </div>

          {/* Filter: Status */}
          <div className="md:col-span-2">
            <select
              value={filter.status}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">ทุกสถานะ (Status)</option>
              <option value="Draft">Draft (ร่างข้อกำหนด)</option>
              <option value="In Review">In Review (รอตรวจทาน)</option>
              <option value="In Development">In Development (Dev กำลังทำ)</option>
              <option value="Testing">Testing (กำลังทดสอบ/UAT)</option>
              <option value="Done">Done (เสร็จสมบูรณ์)</option>
            </select>
          </div>

          {/* Filter: Priority */}
          <div className="md:col-span-2">
            <select
              value={filter.priority}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">ทุก Priority</option>
              <option value="1.High">1.High</option>
              <option value="2.Medium">2.Medium</option>
              <option value="3.Low">3.Low</option>
            </select>
          </div>

          {/* Filter: Dev Assigned */}
          <div className="md:col-span-2">
            <select
              value={filter.dev_assigned || ''}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, dev_assigned: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">Dev ผู้รับผิดชอบทั้งหมด</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filter / Count */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                title="ล้างตัวกรอง"
              >
                <Filter className="w-3.5 h-3.5" />
                ล้างตัวกรอง
              </button>
            )}
            <span className="text-xs font-bold text-[#044492] px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200">
              {matchingRequirements.length} รายการ
            </span>
          </div>
        </div>

        {/* Quick Core Function Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                onSelectCore(null);
                onSelectModule(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                !selectedCore
                  ? 'bg-[#044492] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              ทุก Core Functions
            </button>

            {selectedCore && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => onSelectModule(null)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                    !selectedModule
                      ? 'bg-[#0086FF] text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#044492]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {selectedCore}
                </button>
              </>
            )}

            {selectedCore && selectedModule && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold bg-[#044492] text-white shadow-xs">
                  <Layers className="w-3.5 h-3.5" />
                  {selectedModule}
                </span>
              </>
            )}
          </div>

          {/* Quick jump pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {coreSummaries.map((c) => {
              const active = selectedCore === c.core;
              return (
                <button
                  key={c.core}
                  type="button"
                  onClick={() => {
                    onSelectCore(c.core);
                    onSelectModule(null);
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    active
                      ? 'bg-[#044492] text-white border-[#044492] shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {c.meta.shortName} ({c.total})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              {selectedModule
                ? `โมดูล: ${selectedModule}`
                : selectedCore
                ? `Core Function: ${selectedCore}`
                : 'ตาราง Requirement ทั้งหมด'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              (แสดง {matchingRequirements.length} จาก {requirements.length} เรื่อง)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExportExcel(matchingRequirements, selectedModule || selectedCore || 'All Requirements')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>

            <button
              type="button"
              onClick={() => onCreateRequirement(selectedCore || DEFAULT_CORE_FUNCTION, selectedModule || undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFCB06] hover:bg-[#E5B600] text-slate-950 text-xs font-black transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่ม Requirement
            </button>
          </div>
        </div>

        {/* Requirements Table */}
        {matchingRequirements.length > 0 ? (
          <RequirementTable
            items={
              selectedModule
                ? activeModuleSummary?.filteredRequirements || []
                : selectedCore
                ? activeCoreSummary?.filteredRequirements || []
                : matchingRequirements
            }
            sortField={sortField}
            sortAsc={sortAsc}
            onSort={handleSort}
            onSelectRequirement={onSelectRequirement}
            onEditRequirement={onEditRequirement}
            onDeleteRequirement={onDeleteRequirement}
            showCoreColumn={!selectedCore}
          />
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">ไม่พบรายการ Requirement ที่ค้นหา</h4>
            <p className="text-xs text-slate-500 mt-1">
              ลองเปลี่ยนคำค้นหา หรือกด &quot;ล้างตัวกรอง&quot; เพื่อดูรายการทั้งหมด
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 px-4 py-1.5 rounded-lg bg-[#0086FF] text-white text-xs font-semibold"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-module Manager Modals (if user modifies modules) */}
      <SubModuleModals
        renameTarget={renameTarget}
        renameValue={renameValue}
        savingRename={savingRename}
        onRenameValueChange={setRenameValue}
        onSaveRename={handleSaveRename}
        onCloseRename={() => {
          setRenameTarget(null);
          setRenameValue('');
        }}
        deleteBlockedNotice={deleteBlockedNotice}
        onCloseDeleteBlockedNotice={() => setDeleteBlockedNotice(null)}
        confirmDeleteTarget={confirmDeleteTarget}
        deletingModule={deletingModule}
        onConfirmDelete={handleConfirmDelete}
        onCloseConfirmDelete={() => setConfirmDeleteTarget(null)}
        managingModules={managingModules}
        activeCoreSummary={
          activeCoreSummary
            ? {
                core: activeCoreSummary.core,
                subModules: activeCoreSummary.subModules.map((sm) => ({
                  name: sm.name,
                  total: sm.total,
                  closed: sm.done,
                  open: sm.pending,
                  highOpen: 0,
                })),
              }
            : null
        }
        manageSearch={manageSearch}
        onManageSearchChange={setManageSearch}
        onCloseManagingModules={() => setManagingModules(false)}
        onOpenAddSubModule={() => setAddingSubModule(true)}
        onOpenRename={handleOpenRename}
        onAttemptDeleteModule={handleAttemptDeleteModule}
        selectedCore={selectedCore}
        canUpdateModule={Boolean(onUpdateModule)}
        canDeleteModule={Boolean(onDeleteModule)}
      />
    </div>
  );
}
