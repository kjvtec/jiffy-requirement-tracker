'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Code2,
  Download,
  Eye,
  Edit,
  FileText,
  FolderOpen,
  FolderTree,
  Image as ImageIcon,
  Layers,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  User,
  X,
  FilterX,
  CircleHelp,
} from 'lucide-react';
import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  REQUIREMENT_TYPES,
  type CoreFunctionType,
  type Developer,
  type Requirement,
  type RequirementFilter,
  type SystemModule,
  type TeamMember,
} from '@/types';
import { CORE_ICON } from '@/lib/coreIcons';
import { nextSort, sortRequirements, type RequirementSortKey, type SortState } from '@/lib/sort';
import { NeedInfoBadge, PriorityBadge, StatusBadge, formatDateTime } from './Badges';
import SortHeader from './SortHeader';

interface RequirementExplorerViewProps {
  requirements: Requirement[];
  modules: SystemModule[];
  developers: Developer[];
  team: TeamMember[];
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
  onAddModule: (name: string, coreFunction: CoreFunctionType) => Promise<void>;
  onUpdateModule: (oldName: string, newName: string, coreFunction: CoreFunctionType) => Promise<void>;
  onDeleteModule: (
    name: string,
    coreFunction: CoreFunctionType
  ) => Promise<{ success: boolean; message?: string }>;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function RequirementExplorerView({
  requirements,
  modules,
  developers,
  team,
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
  const [sort, setSort] = useState<SortState<RequirementSortKey>>({ key: 'req_id', dir: 'desc' });

  // Module management (inline, replaces the old unreachable modal)
  const [managing, setManaging] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [renaming, setRenaming] = useState<{ name: string; value: string } | null>(null);

  /* ---------- filtering + sorting ---------- */
  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return requirements.filter((r) => {
      if (q) {
        const hay = [r.req_id, r.title, r.details, r.module, r.core_function, r.dev_assigned || '', r.requested_by]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter.status && r.status !== filter.status) return false;
      if (filter.priority && r.priority !== filter.priority) return false;
      if (filter.type && r.type !== filter.type) return false;
      if (filter.dev_assigned && r.dev_assigned !== filter.dev_assigned) return false;
      if (filter.requested_by && r.requested_by !== filter.requested_by) return false;
      if (filter.needs_info && !(r.info_requested && r.status !== 'Done')) return false;
      return true;
    });
  }, [requirements, filter]);

  const coreCounts = useMemo(() => {
    const map = new Map<CoreFunctionType, number>();
    filtered.forEach((r) => map.set(r.core_function, (map.get(r.core_function) || 0) + 1));
    return map;
  }, [filtered]);

  const visible = useMemo(() => {
    const scoped = filtered.filter(
      (r) => (!selectedCore || r.core_function === selectedCore) && (!selectedModule || r.module === selectedModule)
    );
    return sortRequirements(scoped, sort);
  }, [filtered, selectedCore, selectedModule, sort]);

  const needsInfoTotal = useMemo(
    () => requirements.filter((r) => r.info_requested && r.status !== 'Done').length,
    [requirements]
  );

  const moduleChips = useMemo(() => {
    if (!selectedCore) return [];
    const names = new Set<string>();
    modules.filter((m) => m.core_function === selectedCore).forEach((m) => names.add(m.name));
    requirements.filter((r) => r.core_function === selectedCore).forEach((r) => names.add(r.module));
    return Array.from(names)
      .map((name) => ({
        name,
        total: requirements.filter((r) => r.core_function === selectedCore && r.module === name).length,
        shown: filtered.filter((r) => r.core_function === selectedCore && r.module === name).length,
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th'));
  }, [modules, requirements, filtered, selectedCore]);

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.status ||
      filter.priority ||
      filter.type ||
      filter.dev_assigned ||
      filter.requested_by ||
      filter.needs_info
  );

  const clearFilters = () =>
    onFilterChange({
      search: '',
      core_function: '',
      status: '',
      priority: '',
      type: '',
      module: '',
      requested_by: '',
      dev_assigned: '',
      needs_info: false,
    });

  /* ---------- module management ---------- */
  const addModule = async () => {
    const name = newModule.trim();
    if (!name || !selectedCore) return;
    try {
      await onAddModule(name, selectedCore);
      setNewModule('');
    } catch (e) {
      alert('เพิ่มโมดูลไม่สำเร็จ: ' + errText(e));
    }
  };

  const saveRename = async () => {
    if (!renaming || !selectedCore) return;
    const value = renaming.value.trim();
    if (!value || value === renaming.name) {
      setRenaming(null);
      return;
    }
    try {
      await onUpdateModule(renaming.name, value, selectedCore);
      if (selectedModule === renaming.name) onSelectModule(value);
      setRenaming(null);
    } catch (e) {
      alert('แก้ชื่อโมดูลไม่สำเร็จ: ' + errText(e));
    }
  };

  const removeModule = async (name: string) => {
    if (!selectedCore) return;
    if (!window.confirm(`ลบโมดูล "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await onDeleteModule(name, selectedCore);
      if (!res.success) alert(res.message || 'ลบโมดูลไม่สำเร็จ');
      else if (selectedModule === name) onSelectModule(null);
    } catch (e) {
      alert('ลบโมดูลไม่สำเร็จ: ' + errText(e));
    }
  };

  const onSort = (key: RequirementSortKey) => setSort((cur) => nextSort(cur, key));

  const selectCls = 'field !w-auto min-w-[150px] font-medium';

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-jiffy-blue absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              type="search"
              placeholder="ค้นหา Req ID, หัวข้อ, รายละเอียด, Dev, ผู้ขอ"
              aria-label="ค้นหา Requirement"
              value={filter.search}
              onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
              className="field pl-9"
            />
          </div>
          <select
            value={filter.status}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, status: e.target.value }))}
            aria-label="กรองตามสถานะ"
            className={selectCls}
          >
            <option value="">ทุกสถานะ</option>
            <option value="New">New (ใหม่)</option>
            <option value="In Development">In Development</option>
            <option value="Testing">Testing (UAT)</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, priority: e.target.value }))}
            aria-label="กรองตาม Priority"
            className={selectCls}
          >
            <option value="">ทุก Priority</option>
            <option value="1.High">1.High</option>
            <option value="2.Medium">2.Medium</option>
            <option value="3.Low">3.Low</option>
          </select>
          <select
            value={filter.type}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, type: e.target.value }))}
            aria-label="กรองตามประเภท Requirement"
            className={selectCls}
          >
            <option value="">ทุกประเภท</option>
            {REQUIREMENT_TYPES.map((typeName) => (
              <option key={typeName} value={typeName}>
                {typeName}
              </option>
            ))}
          </select>
          <select
            value={filter.dev_assigned}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, dev_assigned: e.target.value }))}
            aria-label="กรองตาม Dev"
            className={selectCls}
          >
            <option value="">Dev ทั้งหมด</option>
            {developers.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={filter.requested_by}
            onChange={(e) => onFilterChange((prev) => ({ ...prev, requested_by: e.target.value }))}
            aria-label="กรองตาม Tester"
            className={selectCls}
          >
            <option value="">Tester ทั้งหมด</option>
            {team.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onFilterChange((prev) => ({ ...prev, needs_info: !prev.needs_info }))}
            aria-pressed={filter.needs_info}
            className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-semibold transition-colors ${
              filter.needs_info
                ? 'bg-orange-500 border-orange-500 text-white'
                : needsInfoTotal > 0
                ? 'need-info-beacon border-orange-400 text-orange-800'
                : 'bg-white border-line text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CircleHelp className="w-4 h-4" aria-hidden />
            ขอข้อมูลเพิ่ม ({needsInfoTotal})
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn-secondary !text-red-600 h-10">
              <FilterX className="w-4 h-4" aria-hidden />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Core Function picker */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onSelectCore(null);
              onSelectModule(null);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              !selectedCore
                ? 'bg-jiffy-navy text-white border-jiffy-navy shadow-card'
                : 'bg-white text-slate-700 border-line hover:border-jiffy-blue hover:text-jiffy-navy'
            }`}
          >
            <FolderTree className="w-4 h-4" aria-hidden />
            ทุกระบบ
            <span className="text-xs opacity-80">({filtered.length})</span>
          </button>
          {CORE_FUNCTIONS.map((core) => {
            const meta = CORE_FUNCTION_META[core];
            const Icon = CORE_ICON[core];
            const active = selectedCore === core;
            return (
              <button
                key={core}
                type="button"
                onClick={() => {
                  onSelectCore(core);
                  onSelectModule(null);
                }}
                style={active ? { backgroundColor: meta.accentHex, borderColor: meta.accentHex } : undefined}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? 'text-white shadow-card'
                    : `${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} hover:shadow-card`
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {meta.shortName}
                <span className="text-xs opacity-80">({coreCounts.get(core) || 0})</span>
              </button>
            );
          })}
        </div>

        {/* Modules of the selected Core Function */}
        {selectedCore && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <FolderOpen className="w-4 h-4 text-jiffy-blue" aria-hidden />
                <span className="font-semibold text-jiffy-ink">{selectedCore}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden />
                <span>โมดูล</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManaging((v) => !v);
                  setRenaming(null);
                }}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  managing ? 'bg-jiffy-navy text-white' : 'text-jiffy-navy hover:bg-jiffy-sky'
                }`}
              >
                <Settings2 className="w-4 h-4" aria-hidden />
                {managing ? 'เสร็จสิ้น' : 'จัดการโมดูล'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectModule(null)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold border transition-colors ${
                  !selectedModule
                    ? 'bg-jiffy-blue text-white border-jiffy-blue'
                    : 'bg-white text-slate-700 border-line hover:border-jiffy-blue'
                }`}
              >
                ทุกโมดูล
              </button>
              {moduleChips.map((m) => {
                const active = selectedModule === m.name;
                if (renaming?.name === m.name) {
                  return (
                    <span key={m.name} className="inline-flex items-center gap-1">
                      <input
                        autoFocus
                        value={renaming.value}
                        onChange={(e) => setRenaming({ name: m.name, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRename();
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="field !w-44 !py-1"
                      />
                      <button type="button" onClick={() => void saveRename()} className="p-1.5 rounded-lg bg-emerald-500 text-white" aria-label="บันทึกชื่อ">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setRenaming(null)} className="p-1.5 rounded-lg bg-slate-200 text-slate-700" aria-label="ยกเลิก">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  );
                }
                return (
                  <span
                    key={m.name}
                    className={`inline-flex items-center rounded-lg border text-sm font-medium transition-colors ${
                      active
                        ? 'bg-jiffy-navy text-white border-jiffy-navy'
                        : 'bg-white text-slate-700 border-line hover:border-jiffy-blue'
                    }`}
                  >
                    <button type="button" onClick={() => onSelectModule(m.name)} className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1">
                      <Layers className="w-3.5 h-3.5" aria-hidden />
                      {m.name}
                      <span className={`text-xs ${active ? 'text-blue-100' : 'text-slate-400'}`}>{m.shown}</span>
                    </button>
                    {managing && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRenaming({ name: m.name, value: m.name })}
                          className="px-1.5 py-1 hover:text-amber-500"
                          aria-label={`แก้ชื่อ ${m.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeModule(m.name)}
                          className="pr-2 pl-0.5 py-1 hover:text-red-500"
                          aria-label={`ลบ ${m.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </span>
                );
              })}
              {managing && (
                <span className="inline-flex items-center gap-1">
                  <input
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void addModule();
                    }}
                    placeholder="ชื่อโมดูลใหม่"
                    aria-label="ชื่อโมดูลใหม่"
                    className="field !w-44 !py-1"
                  />
                  <button type="button" onClick={() => void addModule()} className="btn-brand !py-1.5 !px-2.5">
                    <Plus className="w-4 h-4" aria-hidden />
                    เพิ่ม
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-jiffy-sky to-white border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-jiffy-navy text-white flex items-center justify-center">
              <FileText className="w-4 h-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-base font-bold text-jiffy-ink leading-tight">
                {selectedModule ? `โมดูล: ${selectedModule}` : selectedCore ? selectedCore : 'Requirement ทั้งหมด'}
              </h3>
              <p className="text-xs text-slate-500">
                แสดง {visible.length} จาก {requirements.length} เรื่อง
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExportExcel(visible, selectedModule || selectedCore || 'All Requirements')}
              className="btn-secondary !py-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" aria-hidden />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => onCreateRequirement(selectedCore || undefined, selectedModule || undefined)}
              className="btn-brand !py-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden />
              เพิ่ม Requirement
            </button>
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-line text-xs">
                  <SortHeader label="Req ID" sortKey="req_id" sort={sort} onSort={onSort} className="w-28 whitespace-nowrap" />
                  <SortHeader label="ระบบ / โมดูล" sortKey="module" sort={sort} onSort={onSort} className="w-36 whitespace-nowrap" />
                  <SortHeader label="Priority" sortKey="priority" sort={sort} onSort={onSort} className="w-24 whitespace-nowrap" />
                  <SortHeader label="สถานะ" sortKey="status" sort={sort} onSort={onSort} className="w-32 whitespace-nowrap" />
                  <SortHeader label="หัวข้อ" sortKey="title" sort={sort} onSort={onSort} className="w-[42%] min-w-[380px]" />
                  <SortHeader label="Dev" sortKey="dev_assigned" sort={sort} onSort={onSort} className="w-28 whitespace-nowrap" />
                  <SortHeader label="Tester / วันที่-เวลา" sortKey="request_date" sort={sort} onSort={onSort} className="w-36 whitespace-nowrap" />
                  <th className="py-3 px-3 text-right w-24 font-semibold text-slate-600 whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((req) => {
                  const meta = CORE_FUNCTION_META[req.core_function];
                  const CoreIcon = CORE_ICON[req.core_function];
                  const isDone = req.status === 'Done';
                  const needsInfo = req.info_requested && !isDone;
                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequirement(req)}
                      style={{ boxShadow: `inset 4px 0 0 ${meta.accentHex}` }}
                      className={`cursor-pointer group transition-colors ${
                        isDone ? 'bg-slate-50/70 hover:bg-slate-100/70' : 'hover:bg-jiffy-sky/60'
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <span className="font-mono text-xs font-bold text-jiffy-navy bg-jiffy-sky px-2.5 py-1 rounded-lg border border-jiffy-mist whitespace-nowrap group-hover:bg-jiffy-blue group-hover:border-jiffy-blue group-hover:text-white transition-colors">
                          {req.req_id}
                        </span>
                        <div className="text-xs text-slate-500 mt-1.5 pl-0.5">{req.type}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                        >
                          <CoreIcon className="w-3.5 h-3.5" aria-hidden />
                          {meta.shortName}
                        </span>
                        <div className="text-xs text-slate-600 mt-1.5 inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" aria-hidden />
                          {req.module}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3 px-4 align-top">
                        <StatusBadge status={req.status} showThai />
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div
                          className="text-[15px] font-bold text-slate-900 group-hover:text-jiffy-blue transition-colors leading-snug break-words"
                          title={req.title}
                        >
                          {req.title}
                        </div>
                        {req.details && (
                          <p className="text-slate-500 line-clamp-2 text-xs leading-relaxed mt-1">{req.details}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {needsInfo && <NeedInfoBadge />}
                          {req.images.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                              <ImageIcon className="w-3 h-3" aria-hidden />
                              {req.images.length} รูป
                            </span>
                          )}
                          {req.files.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <Paperclip className="w-3 h-3" aria-hidden />
                              {req.files.length} ไฟล์
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        {req.dev_assigned ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            <Code2 className="w-3.5 h-3.5 text-indigo-600" aria-hidden />
                            {req.dev_assigned}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">ยังไม่มอบหมาย</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                          {req.requested_by || '-'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(req.request_date)}</p>
                      </td>
                      <td className="py-3 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectRequirement(req)}
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                            aria-label="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRequirement(req)}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="แก้ไข"
                            aria-label="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRequirement(req.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ"
                            aria-label="ลบ"
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
        ) : (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden />
            <h4 className="text-base font-semibold text-slate-700">ไม่พบ Requirement ที่ตรงกับเงื่อนไข</h4>
            <p className="text-sm text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูทั้งหมด</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="btn-brand mt-4">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
