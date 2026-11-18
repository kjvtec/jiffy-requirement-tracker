'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Layers,
  FolderTree,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowUpDown,
  Plus,
  Download,
  Image as ImageIcon,
  Eye,
  Edit,
  Trash2,
  Flame,
  X,
  CheckCircle2,
  FolderPlus,
  HelpCircle,
  UserCheck,
  Settings,
  ShieldAlert,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  Issue,
  IssueFilter,
  SystemModule,
  TeamMember,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
} from '@/types';
import { getStatusBadgeClass } from '@/lib/status';
import { getLatestTimelineInfo } from '@/lib/timeline';
import SubModuleModals, {
  RenameTarget,
  DeleteBlockedNotice,
  ConfirmDeleteTarget,
} from './SubModuleModals';

interface IssueExplorerViewProps {
  issues: Issue[];
  modules: SystemModule[];
  teamMembers: TeamMember[];
  filter: IssueFilter;
  onFilterChange: React.Dispatch<React.SetStateAction<IssueFilter>>;
  selectedCore: CoreFunctionType | null;
  selectedModule: string | null;
  onSelectCore: (core: CoreFunctionType | null) => void;
  onSelectModule: (mod: string | null) => void;
  onSelectIssue: (issue: Issue) => void;
  onEditIssue: (issue: Issue) => void;
  onDeleteIssue: (issueId: string) => Promise<void>;
  onCreateIssue: (presetCore?: CoreFunctionType, presetModule?: string) => void;
  onExportExcel: (targetIssues: Issue[], scopeTitle?: string) => void;
  onAddModule?: (name: string, coreFunction: CoreFunctionType | string) => Promise<void>;
  onUpdateModule?: (oldName: string, newName: string, coreFunction: CoreFunctionType | string) => Promise<void>;
  onDeleteModule?: (name: string, coreFunction: CoreFunctionType | string) => Promise<{ success: boolean; message?: string }>;
}

const getPriorityStyle = (priority: string) => {
  if (priority.includes('High')) return 'bg-red-50 text-red-700 border-red-200';
  if (priority.includes('Medium')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

interface IssueRowsTableProps {
  items: Issue[];
  sortField: keyof Issue;
  sortAsc: boolean;
  onSort: (field: keyof Issue) => void;
  onSelectIssue: (issue: Issue) => void;
  onEditIssue: (issue: Issue) => void;
  onDeleteIssue: (issueId: string) => Promise<void>;
  showCoreColumn?: boolean;
}

const IssueRowsTable = React.memo(function IssueRowsTable({
  items,
  sortField,
  sortAsc,
  onSort,
  onSelectIssue,
  onEditIssue,
  onDeleteIssue,
  showCoreColumn = false,
}: IssueRowsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th
              onClick={() => onSort('log_id')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
            >
              <div className="flex items-center gap-1">
                Issue No
                <ArrowUpDown className={`w-3 h-3 ${sortField === 'log_id' ? 'text-indigo-600' : 'text-slate-400'}`} />
                {sortField === 'log_id' && (
                  <span className="text-[9px] text-indigo-600">{sortAsc ? '↑' : '↓'}</span>
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
                  กลุ่มย่อย
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            )}
            <th
              onClick={() => onSort('priority')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
            >
              <div className="flex items-center gap-1">
                Priority
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th
              onClick={() => onSort('status')}
              className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors w-28"
            >
              <div className="flex items-center gap-1">
                Status
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="py-3 px-4 min-w-[240px]">รายละเอียดปัญหา & วิธีแก้ไข</th>
            <th className="py-3 px-4 w-32">ผู้แจ้ง / วันที่</th>
            <th className="py-3 px-4 text-right w-28">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
          {items.map((issue) => {
            const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
            const meta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
            const isClosed = issue.status === 'Closed';
            const isNeedInfo = issue.status === 'Need Info';
            const latestInfo = getLatestTimelineInfo(issue);
            const timelinePreview = latestInfo.latestMessage || issue.resolution;

            return (
              <tr
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`transition-colors cursor-pointer group ${
                  isClosed
                    ? 'bg-slate-50/80 opacity-75 hover:opacity-100 hover:bg-slate-100/70'
                    : isNeedInfo
                      ? 'bg-orange-50/45 hover:bg-orange-50/80 border-l-4 border-l-orange-500'
                      : 'hover:bg-[#F4F9FF]'
                }`}
              >
                <td className="py-3.5 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-mono text-xs font-bold text-[#044492] bg-[#EFF7FF] px-2.5 py-1 rounded-lg border border-[#CFE4FF] group-hover:bg-[#0086FF] group-hover:border-[#0086FF] group-hover:text-white transition-colors">
                      {issue.log_id}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 px-1">
                      {issue.type || 'Issue'}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 align-top">
                  {showCoreColumn && (
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                      {meta.shortName}
                    </span>
                  )}
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {issue.module}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 align-top">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${getPriorityStyle(issue.priority)}`}>
                    {issue.priority}
                  </span>
                </td>

                <td className="py-3.5 px-4 align-top">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(
                      issue.status
                    )}`}
                  >
                    {isNeedInfo && <HelpCircle className="w-3 h-3 text-orange-600 shrink-0" />}
                    {issue.status}
                  </span>
                  {isNeedInfo && (
                    <span className="block text-[10px] font-bold text-orange-700 mt-1">
                      รอข้อมูลเพิ่ม
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4 align-top">
                  <p className="text-slate-800 font-medium line-clamp-2 text-xs sm:text-sm leading-relaxed">
                    {issue.details}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {issue.images && issue.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        <ImageIcon className="w-3 h-3" />
                        {issue.images.length} รูปแนบ
                      </span>
                    )}
                    {timelinePreview && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border line-clamp-1 max-w-sm ${
                          isNeedInfo
                            ? 'text-orange-800 bg-orange-50 border-orange-200 font-medium'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {latestInfo.latestAuthor
                          ? `${latestInfo.latestAuthor}: ${timelinePreview}`
                          : `แก้ไข: ${timelinePreview}`}
                      </span>
                    )}
                    {issue.closed_version && (
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {issue.closed_version}
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4 align-top">
                  <p className="text-xs font-bold text-slate-800">{issue.raise_by}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {issue.raise_date ? new Date(issue.raise_date).toLocaleDateString('th-TH') : '-'}
                  </p>
                  {isNeedInfo && (
                    <p className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                      รอ {issue.raise_by} ตอบ
                    </p>
                  )}
                  {latestInfo.latestAuthor && (
                    <p className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 shrink-0" />
                      อัปเดต: {latestInfo.latestAuthor}
                    </p>
                  )}
                  {issue.closed_by && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                      ปิดโดย: {issue.closed_by}
                    </p>
                  )}
                </td>

                <td className="py-3.5 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectIssue(issue)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ดูรายละเอียด & อัปเดต"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditIssue(issue)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="แก้ไขทุกช่อง"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIssue(issue.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ"
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

export default function IssueExplorerView({
  issues,
  modules,
  teamMembers,
  filter,
  onFilterChange,
  selectedCore,
  selectedModule,
  onSelectCore,
  onSelectModule,
  onSelectIssue,
  onEditIssue,
  onDeleteIssue,
  onCreateIssue,
  onExportExcel,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
}: IssueExplorerViewProps) {
  const [sortField, setSortField] = useState<keyof Issue>('log_id');
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsedSubModules, setCollapsedSubModules] = useState<Record<string, boolean>>({});
  const [addingSubModule, setAddingSubModule] = useState(false);
  const [newSubModuleName, setNewSubModuleName] = useState('');
  const [savingSubModule, setSavingSubModule] = useState(false);

  // Sub-module management states
  const [managingModules, setManagingModules] = useState(false);
  const [manageSearch, setManageSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ oldName: string; core: CoreFunctionType | string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [deleteBlockedNotice, setDeleteBlockedNotice] = useState<{ moduleName: string; count: number } | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ moduleName: string; core: CoreFunctionType | string } | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  const handleOpenRename = (modName: string, core?: CoreFunctionType | string | null) => {
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
      alert('เกิดข้อผิดพลาดในการแก้ไขชื่อกลุ่มย่อย: ' + (e?.message || e));
    } finally {
      setSavingRename(false);
    }
  };

  const handleAttemptDeleteModule = (
    modName: string,
    core: CoreFunctionType | string | null | undefined,
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
        alert(res.message || 'ไม่สามารถลบกลุ่มย่อยนี้ได้');
      } else {
        setConfirmDeleteTarget(null);
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาดในการลบกลุ่มย่อย: ' + (e?.message || e));
    } finally {
      setDeletingModule(false);
    }
  };

  const handleSort = (field: keyof Issue) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortIssues = useMemo(() => {
    return (list: Issue[]) =>
      [...list].sort((a, b) => {
        const isClosedA = a.status === 'Closed' ? 1 : 0;
        const isClosedB = b.status === 'Closed' ? 1 : 0;
        if (isClosedA !== isClosedB) return isClosedA - isClosedB;

        if (sortField === 'log_id') {
          const numA = parseInt(a.log_id.replace(/\D/g, '') || '0', 10);
          const numB = parseInt(b.log_id.replace(/\D/g, '') || '0', 10);
          return sortAsc ? numA - numB : numB - numA;
        }
        const valA = String(a[sortField] ?? '').toLowerCase();
        const valB = String(b[sortField] ?? '').toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [sortField, sortAsc]);

  // Apply text / status / priority / reporter filters globally
  const matchingIssues = useMemo(() => {
    const filtered = issues.filter((item) => {
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matchLogId = item.log_id.toLowerCase().includes(q);
        const matchDetails = item.details.toLowerCase().includes(q);
        const matchResolution = item.resolution?.toLowerCase().includes(q);
        const matchRemark = item.remark?.toLowerCase().includes(q);
        const matchModule = item.module?.toLowerCase().includes(q);
        const matchCore = (item.core_function || DEFAULT_CORE_FUNCTION).toLowerCase().includes(q);
        if (!matchLogId && !matchDetails && !matchResolution && !matchRemark && !matchModule && !matchCore) {
          return false;
        }
      }
      if (filter.status && item.status !== filter.status) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.raise_by && item.raise_by !== filter.raise_by) return false;
      return true;
    });
    return sortIssues(filtered);
  }, [issues, filter, sortIssues]);

  const hasActiveFilters = Boolean(
    filter.search || filter.status || filter.priority || filter.raise_by
  );

  const clearFilters = () => {
    onFilterChange({
      search: '',
      core_function: '',
      status: '',
      priority: '',
      module: '',
      raise_by: '',
    });
  };

  // Build hierarchical stats across all 5 Core Functions -> Sub-modules
  const coreSummaries = useMemo(() => {
    return CORE_FUNCTIONS.map((core) => {
      const coreAllIssues = issues.filter(
        (i) => (i.core_function || DEFAULT_CORE_FUNCTION) === core
      );
      const coreFilteredIssues = matchingIssues.filter(
        (i) => (i.core_function || DEFAULT_CORE_FUNCTION) === core
      );

      // Sub-module names from defaults + DB + issues
      const modSet = new Set<string>(DEFAULT_MODULES_BY_CORE[core] || []);
      modules
        .filter((m) => (m.core_function || DEFAULT_CORE_FUNCTION) === core)
        .forEach((m) => {
          if (m.name) modSet.add(m.name);
        });
      coreAllIssues.forEach((i) => {
        if (i.module) modSet.add(i.module);
      });

      const subModules = Array.from(modSet)
        .map((modName) => {
          const modAll = coreAllIssues.filter((i) => (i.module || 'Other') === modName);
          const modFiltered = coreFilteredIssues.filter((i) => (i.module || 'Other') === modName);
          const total = modAll.length;
          const closed = modAll.filter((i) => i.status === 'Closed').length;
          const open = total - closed;
          const highOpen = modAll.filter(
            (i) => i.priority.includes('High') && i.status !== 'Closed'
          ).length;
          return {
            name: modName,
            total,
            closed,
            open,
            highOpen,
            percentClosed: total > 0 ? Math.round((closed / total) * 100) : 0,
            filteredIssues: modFiltered,
          };
        })
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name);
        });

      const total = coreAllIssues.length;
      const closed = coreAllIssues.filter((i) => i.status === 'Closed').length;
      const open = total - closed;
      const highOpen = coreAllIssues.filter(
        (i) => i.priority.includes('High') && i.status !== 'Closed'
      ).length;

      return {
        core,
        meta: CORE_FUNCTION_META[core],
        total,
        closed,
        open,
        highOpen,
        percentClosed: total > 0 ? Math.round((closed / total) * 100) : 0,
        filteredIssues: coreFilteredIssues,
        subModules,
      };
    });
  }, [issues, matchingIssues, modules]);

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
        closed: 0,
        open: 0,
        highOpen: 0,
        percentClosed: 0,
        filteredIssues: activeCoreSummary.filteredIssues.filter(
          (i) => i.module === selectedModule
        ),
      }
    );
  }, [activeCoreSummary, selectedModule]);

  const handleSaveNewSubModule = async () => {
    const trimmed = newSubModuleName.trim();
    if (!trimmed || !selectedCore || !onAddModule) return;
    setSavingSubModule(true);
    try {
      await onAddModule(trimmed, selectedCore);
      setNewSubModuleName('');
      setAddingSubModule(false);
    } finally {
      setSavingSubModule(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Global Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCEBFF] shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา ISSUE_ID, รายละเอียดปัญหา, กลุ่มหลัก, กลุ่มย่อย..."
              value={filter.search}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0086FF] outline-none focus:bg-white transition-all"
            />
            {filter.search && (
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter: Status */}
          <div className="md:col-span-2">
            <select
              value={filter.status}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">ทุก Status</option>
              <option value="Open">Open</option>
              <option value="Need Info">Need Info (รอข้อมูลเพิ่ม)</option>
              <option value="In Progress">In Progress</option>
              <option value="Test">Test</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Filter: Priority */}
          <div className="md:col-span-2">
            <select
              value={filter.priority}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">ทุก Priority</option>
              <option value="1.High">1.High</option>
              <option value="2.Medium">2.Medium</option>
              <option value="3.Low">3.Low</option>
            </select>
          </div>

          {/* Filter: Raise By */}
          <div className="md:col-span-2">
            <select
              value={filter.raise_by}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, raise_by: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-[#0086FF] outline-none"
            >
              <option value="">ผู้แจ้งทั้งหมด</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filter */}
          <div className="md:col-span-1 flex justify-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-1 px-3 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                title="ล้างตัวกรอง"
              >
                <Filter className="w-3.5 h-3.5" />
                ล้าง
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400 px-2 py-2 text-center w-full">
                {issues.length} เรื่อง
              </span>
            )}
          </div>
        </div>

        {/* Quick Need Info Alert Strip (if any cases wait for opener response) */}
        {issues.some((i) => i.status === 'Need Info') && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-orange-50/90 border border-orange-300 text-xs">
            <div className="flex items-center gap-2 text-orange-950 font-bold">
              <HelpCircle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                มีเคสที่ Dev ขอข้อมูลเพิ่มเติม ({issues.filter((i) => i.status === 'Need Info').length} รายการ) — รอผู้เปิด Case เข้าไป Action ตอบกลับ
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onFilterChange((prev) => ({
                  ...prev,
                  status: prev.status === 'Need Info' ? '' : 'Need Info',
                }))
              }
              className={`px-3 py-1 rounded-lg font-extrabold transition-colors border ${
                filter.status === 'Need Info'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white hover:bg-orange-100 text-orange-800 border-orange-300'
              }`}
            >
              {filter.status === 'Need Info' ? '✓ กำลังกรอง Need Info (คลิกเพื่อดูทั้งหมด)' : 'กรองเฉพาะ Need Info'}
            </button>
          </div>
        )}

        {/* Breadcrumb & 5 Core Quick Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => {
                onSelectCore(null);
                onSelectModule(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                !selectedCore
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              กลุ่มหลักทั้งหมด (5 Core)
            </button>

            {selectedCore && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => onSelectModule(null)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    !selectedModule
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white shadow-xs">
                  <Layers className="w-3.5 h-3.5" />
                  {selectedModule}
                </span>
              </>
            )}
          </div>

          {/* Quick jump pills for 5 Core Functions */}
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
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {c.meta.order}. {c.meta.shortName}{' '}
                  <span className={active ? 'text-indigo-300' : 'text-slate-400'}>
                    ({hasActiveFilters ? c.filteredIssues.length : c.total})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 3: DRILLED INTO A SPECIFIC SUB-MODULE                            */}
      {/* ===================================================================== */}
      {selectedCore && selectedModule && activeCoreSummary && activeModuleSummary && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onSelectModule(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mt-0.5"
                title={`กลับไปยังกลุ่มย่อยของ ${selectedCore}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${activeCoreSummary.meta.badgeBg} ${activeCoreSummary.meta.badgeText} ${activeCoreSummary.meta.badgeBorder}`}>
                    #{activeCoreSummary.meta.order} {selectedCore}
                  </span>
                  <span className="text-xs text-slate-400">/</span>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    {selectedModule}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ทั้งหมด {activeModuleSummary.total} รายการ • ปิดแล้ว {activeModuleSummary.closed} • คงค้าง {activeModuleSummary.open}
                  {hasActiveFilters && ` (ตรงตามตัวกรอง ${activeModuleSummary.filteredIssues.length} รายการ)`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onUpdateModule && (
                <button
                  type="button"
                  onClick={() => handleOpenRename(selectedModule, selectedCore)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  title={`แก้ไขชื่อกลุ่มย่อย "${selectedModule}"`}
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-600" />
                  แก้ไขชื่อ
                </button>
              )}
              {onDeleteModule && (
                <button
                  type="button"
                  onClick={() =>
                    handleAttemptDeleteModule(selectedModule, selectedCore, activeModuleSummary.total)
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                    activeModuleSummary.total > 0
                      ? 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                  title={
                    activeModuleSummary.total > 0
                      ? `มี ${activeModuleSummary.total} Issue ในกลุ่มย่อยนี้ (ห้ามลบ)`
                      : `ลบกลุ่มย่อย "${selectedModule}"`
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบกลุ่มย่อย
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onExportExcel(
                    activeModuleSummary.filteredIssues,
                    `${selectedCore} - ${selectedModule}`
                  )
                }
                disabled={activeModuleSummary.filteredIssues.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel ({activeModuleSummary.filteredIssues.length})
              </button>
              <button
                type="button"
                onClick={() => onCreateIssue(selectedCore, selectedModule)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                แจ้งปัญหาใน {selectedModule}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {activeModuleSummary.filteredIssues.length === 0 ? (
              <div className="text-center py-14 px-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {hasActiveFilters
                    ? `ไม่พบรายการในกลุ่มย่อย "${selectedModule}" ที่ตรงกับตัวกรอง`
                    : `ยังไม่มีรายการปัญหาใน "${selectedModule}"`}
                </p>
                <div className="flex justify-center gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-indigo-600 hover:underline px-3 py-1.5"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onCreateIssue(selectedCore, selectedModule)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มปัญหาแรกใน {selectedModule}
                  </button>
                </div>
              </div>
            ) : (
              <IssueRowsTable
                items={activeModuleSummary.filteredIssues}
                sortField={sortField}
                sortAsc={sortAsc}
                onSort={handleSort}
                onSelectIssue={onSelectIssue}
                onEditIssue={onEditIssue}
                onDeleteIssue={onDeleteIssue}
              />
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LEVEL 2: DRILLED INTO A CORE FUNCTION (SHOW SUB-MODULE FOLDERS + LIST) */}
      {/* ===================================================================== */}
      {selectedCore && !selectedModule && activeCoreSummary && (
        <div className="space-y-5">
          {/* Core Function Banner Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSelectCore(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mt-0.5"
                  title="กลับไปหน้า 5 Core Functions"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${activeCoreSummary.meta.badgeBg} ${activeCoreSummary.meta.badgeText} ${activeCoreSummary.meta.badgeBorder}`}>
                      Core #{activeCoreSummary.meta.order}
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {activeCoreSummary.core}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeCoreSummary.meta.description} • {activeCoreSummary.subModules.length} กลุ่มย่อย • ทั้งหมด {activeCoreSummary.total} ปัญหา (ปิดแล้ว {activeCoreSummary.closed} / ค้าง {activeCoreSummary.open})
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onAddModule && (
                  <button
                    type="button"
                    onClick={() => setAddingSubModule((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                    เพิ่มกลุ่มย่อย
                  </button>
                )}
                {(onUpdateModule || onDeleteModule) && (
                  <button
                    type="button"
                    onClick={() => setManagingModules(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    title={`จัดการ แก้ไข หรือลบกลุ่มย่อยใน ${activeCoreSummary.meta.shortName}`}
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-600" />
                    จัดการกลุ่มย่อย ({activeCoreSummary.subModules.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onExportExcel(activeCoreSummary.filteredIssues, selectedCore)
                  }
                  disabled={activeCoreSummary.filteredIssues.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export กลุ่มนี้ ({activeCoreSummary.filteredIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => onCreateIssue(selectedCore)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  แจ้งปัญหาใน {activeCoreSummary.meta.shortName}
                </button>
              </div>
            </div>

            {addingSubModule && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <input
                  type="text"
                  placeholder={`ชื่อกลุ่มย่อย (Module) ใหม่ใน ${selectedCore}...`}
                  value={newSubModuleName}
                  onChange={(e) => setNewSubModuleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNewSubModule();
                    }
                  }}
                  className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={!newSubModuleName.trim() || savingSubModule}
                  onClick={handleSaveNewSubModule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                >
                  {savingSubModule ? 'กำลังบันทึก...' : 'บันทึกกลุ่มย่อย'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingSubModule(false);
                    setNewSubModuleName('');
                  }}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold"
                >
                  ยกเลิก
                </button>
              </div>
            )}

            {/* Sub-module Folder Grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                เลือกกลุ่มย่อย (Modules) ใน {selectedCore}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {activeCoreSummary.subModules.map((mod) => {
                  const displayCount = hasActiveFilters ? mod.filteredIssues.length : mod.total;
                  return (
                    <div
                      key={mod.name}
                      onClick={() => onSelectModule(mod.name)}
                      className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        displayCount > 0
                          ? 'bg-slate-50/70 hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow'
                          : 'bg-white hover:bg-slate-50 border-slate-200/70 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className={`w-4 h-4 shrink-0 ${displayCount > 0 ? 'text-indigo-600 fill-indigo-100' : 'text-slate-400'}`} />
                          <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                            {mod.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                            {displayCount}
                          </span>
                          {onUpdateModule && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRename(mod.name, selectedCore);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                              title={`แก้ไขชื่อกลุ่มย่อย "${mod.name}"`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteModule && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttemptDeleteModule(mod.name, selectedCore, mod.total);
                              }}
                              className={`p-1 rounded transition-colors ${
                                mod.total > 0
                                  ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={
                                mod.total > 0
                                  ? `มี ${mod.total} Issue ในกลุ่มนี้ (ห้ามลบ)`
                                  : `ลบกลุ่มย่อย "${mod.name}"`
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            <b className="text-emerald-600">{mod.closed}</b> ปิด / <b className="text-amber-600">{mod.open}</b> ค้าง
                          </span>
                          {mod.highOpen > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              <Flame className="w-2.5 h-2.5" /> {mod.highOpen} High
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                          {mod.total > 0 ? (
                            <>
                              {mod.closed > 0 && (
                                <div className="bg-emerald-500 h-full" style={{ width: `${mod.percentClosed}%` }} />
                              )}
                              {mod.open > 0 && (
                                <div className="bg-amber-400 h-full" style={{ width: `${100 - mod.percentClosed}%` }} />
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grouped Accordion Issues within selected Core Function */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                รายการปัญหาใน {selectedCore} แยกตามกลุ่มย่อย ({activeCoreSummary.filteredIssues.length} รายการ)
              </h3>
            </div>

            {activeCoreSummary.subModules.filter((m) => m.filteredIssues.length > 0).length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {hasActiveFilters
                    ? `ไม่พบรายการปัญหาใน ${selectedCore} ที่ตรงกับเงื่อนไขการกรอง`
                    : `ยังไม่มีรายการปัญหาใน ${selectedCore}`}
                </p>
                <div className="flex justify-center gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-indigo-600 hover:underline px-3 py-1.5"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onCreateIssue(selectedCore)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มปัญหาใน {activeCoreSummary.meta.shortName}
                  </button>
                </div>
              </div>
            ) : (
              activeCoreSummary.subModules
                .filter((m) => m.filteredIssues.length > 0)
                .map((mod) => {
                  const key = `${selectedCore}::${mod.name}`;
                  const isCollapsed = Boolean(collapsedSubModules[key]);
                  return (
                    <div
                      key={mod.name}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedSubModules((prev) => ({
                              ...prev,
                              [key]: !prev[key],
                            }))
                          }
                          className="flex items-center gap-2 text-left group"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          )}
                          <FolderOpen className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700">
                            {mod.name}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {mod.filteredIssues.length} รายการ
                          </span>
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            ({mod.closed} ปิด / {mod.open} ค้าง)
                          </span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectModule(mod.name)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            เปิดเฉพาะกลุ่มนี้ →
                          </button>
                          <button
                            type="button"
                            onClick={() => onCreateIssue(selectedCore, mod.name)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> เพิ่ม
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <IssueRowsTable
                          items={mod.filteredIssues}
                          sortField={sortField}
                          sortAsc={sortAsc}
                          onSort={handleSort}
                          onSelectIssue={onSelectIssue}
                          onEditIssue={onEditIssue}
                          onDeleteIssue={onDeleteIssue}
                        />
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LEVEL 1: TOP-LEVEL VIEW (5 CORE FUNCTION FOLDERS OR FILTERED GROUPS)  */}
      {/* ===================================================================== */}
      {!selectedCore && !hasActiveFilters && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                ดูข้อมูลปัญหาตามกลุ่มหลัก (5 Core Functions)
              </h2>
              <p className="text-xs text-slate-500">
                เลือกกลุ่มหลักเพื่อเข้าไปดูกลุ่มย่อย (Modules) หรือคลิกที่ชิปกลุ่มย่อยเพื่อเปิดรายการปัญหานั้นทันที
              </p>
            </div>
            <button
              type="button"
              onClick={() => onExportExcel(issues, 'All Core Functions')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export สรุปทั้งหมดพร้อมรูป ({issues.length} เรื่อง)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreSummaries.map((c) => {
              const nonEmptyMods = c.subModules.filter((m) => m.total > 0);
              const previewMods =
                nonEmptyMods.length > 0 ? nonEmptyMods : c.subModules.slice(0, 6);

              return (
                <div
                  key={c.core}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => onSelectCore(c.core)}
                        className="cursor-pointer group flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${c.meta.badgeBg} ${c.meta.badgeText} ${c.meta.badgeBorder}`}>
                            Core #{c.meta.order}
                          </span>
                          {c.highOpen > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
                              <Flame className="w-3 h-3" /> {c.highOpen} High เปิดอยู่
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                          {c.core}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{c.meta.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-slate-900 leading-none">
                          {c.total}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400 mt-1">
                          รายการปัญหา
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          ปิดแล้ว <b className="text-emerald-600">{c.closed}</b> • คงค้าง <b className="text-amber-600">{c.open}</b>
                        </span>
                        <span className="font-bold text-slate-700">
                          {c.total > 0 ? `${c.percentClosed}% สำเร็จ` : 'ยังไม่มีรายการ'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex border border-slate-200/70">
                        {c.total > 0 ? (
                          <>
                            {c.closed > 0 && (
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full"
                                style={{ width: `${c.percentClosed}%` }}
                              />
                            )}
                            {c.open > 0 && (
                              <div
                                className="bg-gradient-to-r from-amber-400 to-orange-400 h-full"
                                style={{ width: `${100 - c.percentClosed}%` }}
                              />
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-slate-200/60" />
                        )}
                      </div>
                    </div>

                    {/* Sub-module Quick Pills */}
                    <div className="pt-1">
                      <p className="text-[11px] font-bold text-slate-400 mb-1.5">
                        กลุ่มย่อย ({c.subModules.length} โมดูล):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {previewMods.map((m) => (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => {
                              onSelectCore(c.core);
                              onSelectModule(m.name);
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                              m.total > 0
                                ? 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className={m.total > 0 ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}>
                              ({m.total})
                            </span>
                          </button>
                        ))}
                        {c.subModules.length > previewMods.length && (
                          <button
                            type="button"
                            onClick={() => onSelectCore(c.core)}
                            className="text-[11px] font-semibold px-2 py-1 text-slate-500 hover:text-indigo-700"
                          >
                            +{c.subModules.length - previewMods.length} อื่นๆ...
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCreateIssue(c.core)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        แจ้งปัญหา
                      </button>
                      {c.total > 0 && (
                        <button
                          type="button"
                          onClick={() => onExportExcel(c.filteredIssues, c.core)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCore(c.core)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors"
                    >
                      เปิดดูกลุ่มย่อย ({c.subModules.length})
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FILTERED GROUPED VIEW (WHEN SEARCH OR GLOBAL FILTER IS ACTIVE)        */}
      {/* ===================================================================== */}
      {!selectedCore && hasActiveFilters && (
        <div className="space-y-4">
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                แสดงผลตามตัวกรองแบบจัดกลุ่มอัตโนมัติ (Core Function → กลุ่มย่อย)
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5">
                พบทั้งหมด <span className="font-extrabold">{matchingIssues.length}</span> รายการจากทุกกลุ่มหลัก
              </p>
            </div>
            <div className="flex items-center gap-2">
              {matchingIssues.length > 0 && (
                <button
                  type="button"
                  onClick={() => onExportExcel(matchingIssues, 'Filtered Issues')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export ผลลัพธ์ ({matchingIssues.length})
                </button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold"
              >
                กลับมุมมอง 5 กลุ่มหลัก
              </button>
            </div>
          </div>

          {matchingIssues.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center space-y-2">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">ไม่พบรายการปัญหาที่ตรงกับตัวกรอง</p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            coreSummaries
              .filter((c) => c.filteredIssues.length > 0)
              .map((c) => (
                <div key={c.core} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl">
                    <button
                      type="button"
                      onClick={() => onSelectCore(c.core)}
                      className="flex items-center gap-2 font-extrabold text-sm hover:text-indigo-300 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-indigo-400" />
                      #{c.meta.order} {c.core}
                      <span className="text-xs font-bold bg-white/15 px-2.5 py-0.5 rounded-full">
                        {c.filteredIssues.length} รายการ
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCore(c.core)}
                      className="text-xs text-indigo-300 hover:text-white font-semibold"
                    >
                      เปิดกลุ่มนี้ →
                    </button>
                  </div>

                  {c.subModules
                    .filter((m) => m.filteredIssues.length > 0)
                    .map((mod) => (
                      <div
                        key={`${c.core}-${mod.name}`}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ml-0 sm:ml-3"
                      >
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCore(c.core);
                              onSelectModule(mod.name);
                            }}
                            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-indigo-700"
                          >
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            {mod.name}
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {mod.filteredIssues.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCore(c.core);
                              onSelectModule(mod.name);
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            เจาะลึกกลุ่มย่อย →
                          </button>
                        </div>
                        <IssueRowsTable
                          items={mod.filteredIssues}
                          sortField={sortField}
                          sortAsc={sortAsc}
                          onSort={handleSort}
                          onSelectIssue={onSelectIssue}
                          onEditIssue={onEditIssue}
                          onDeleteIssue={onDeleteIssue}
                        />
                      </div>
                    ))}
                </div>
              ))
          )}
        </div>
      )}

      {/* Sub-module Management Modals (Rename, Delete Blocked, Confirm Delete, Manage List) */}
      <SubModuleModals
        renameTarget={renameTarget}
        renameValue={renameValue}
        savingRename={savingRename}
        onRenameValueChange={setRenameValue}
        onCloseRename={() => setRenameTarget(null)}
        onSaveRename={handleSaveRename}
        deleteBlockedNotice={deleteBlockedNotice}
        onCloseDeleteBlockedNotice={() => setDeleteBlockedNotice(null)}
        confirmDeleteTarget={confirmDeleteTarget}
        deletingModule={deletingModule}
        onCloseConfirmDelete={() => setConfirmDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        managingModules={managingModules}
        activeCoreSummary={activeCoreSummary}
        manageSearch={manageSearch}
        onManageSearchChange={setManageSearch}
        onCloseManagingModules={() => setManagingModules(false)}
        onOpenAddSubModule={() => {
          setManagingModules(false);
          setAddingSubModule(true);
        }}
        onOpenRename={handleOpenRename}
        onAttemptDeleteModule={handleAttemptDeleteModule}
        selectedCore={selectedCore}
        canUpdateModule={Boolean(onUpdateModule)}
        canDeleteModule={Boolean(onDeleteModule)}
      />
    </div>
  );
}
