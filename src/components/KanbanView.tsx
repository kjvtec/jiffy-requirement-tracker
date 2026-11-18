'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Flame, Plus, Search, User } from 'lucide-react';
import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  REQUIREMENT_STATUSES,
  type Requirement,
  type RequirementStatusType,
  type TeamMember,
} from '@/types';
import { STATUS_META } from '@/lib/status';
import { parseReqNumber } from '@/lib/requirementSort';

interface KanbanViewProps {
  requirements: Requirement[];
  team: TeamMember[];
  onSelectRequirement: (req: Requirement) => void;
  onChangeStatus: (id: string, status: RequirementStatusType) => Promise<void>;
  onCreateRequirement: (status: RequirementStatusType) => void;
}

const PRIORITY_CLASS: Record<string, string> = {
  '1.High': 'bg-red-50 text-red-700 border-red-200',
  '2.Medium': 'bg-amber-50 text-amber-700 border-amber-200',
  '3.Low': 'bg-sky-50 text-sky-700 border-sky-200',
};

export default function KanbanView({
  requirements,
  team,
  onSelectRequirement,
  onChangeStatus,
  onCreateRequirement,
}: KanbanViewProps) {
  const [search, setSearch] = useState('');
  const [coreFilter, setCoreFilter] = useState('');
  const [devFilter, setDevFilter] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<RequirementStatusType | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requirements.filter((r) => {
      if (coreFilter && r.core_function !== coreFilter) return false;
      if (devFilter === '__none__' && r.dev_assigned) return false;
      if (devFilter && devFilter !== '__none__' && r.dev_assigned !== devFilter) return false;
      if (!q) return true;
      return [r.req_id, r.title, r.details, r.module, r.requested_by, r.dev_assigned || '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [requirements, search, coreFilter, devFilter]);

  const columns = useMemo(() => {
    return REQUIREMENT_STATUSES.map((status) => ({
      status,
      items: filtered
        .filter((r) => r.status === status)
        // High priority first, then oldest ID first
        .sort(
          (a, b) =>
            a.priority.localeCompare(b.priority) || parseReqNumber(a.req_id) - parseReqNumber(b.req_id)
        ),
    }));
  }, [filtered]);

  const move = (id: string, status: RequirementStatusType) => {
    // Errors are surfaced as a toast by the hook; nothing more to do here.
    onChangeStatus(id, status).catch(() => undefined);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#DCEBFF] p-3 flex flex-wrap items-center gap-2 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Req ID, หัวข้อ, ผู้ขอ, Dev..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0086FF]"
          />
        </div>
        <select
          value={coreFilter}
          onChange={(e) => setCoreFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
        >
          <option value="">ทุก Core Function</option>
          {CORE_FUNCTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={devFilter}
          onChange={(e) => setDevFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
        >
          <option value="">Dev ทั้งหมด</option>
          <option value="__none__">ยังไม่มอบหมาย</option>
          {team.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500 ml-auto">
          ลากการ์ดไปวางในคอลัมน์ หรือกดปุ่มลูกศรเพื่อส่งต่อสถานะ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
        {columns.map(({ status, items }, colIdx) => {
          const meta = STATUS_META[status];
          const next = REQUIREMENT_STATUSES[colIdx + 1];
          const isOver = overStatus === status && dragId !== null;
          return (
            <section
              key={status}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverStatus(status);
              }}
              onDragLeave={() => setOverStatus((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, status);
                setDragId(null);
                setOverStatus(null);
              }}
              className={`rounded-2xl border bg-slate-50/80 p-2.5 min-h-[180px] transition-colors ${
                isOver ? 'border-[#0086FF] bg-blue-50/70' : 'border-slate-200'
              }`}
            >
              <header className="flex items-center justify-between px-1 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                  <h3 className="text-xs font-black text-slate-800 truncate">{meta.label}</h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-1.5">
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateRequirement(status)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#044492] hover:bg-white"
                  title={`เพิ่ม Requirement ใน ${meta.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </header>
              <p className="text-[10px] text-slate-400 px-1 -mt-1.5 pb-2">{meta.shortTh}</p>

              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-xl py-6">
                    ไม่มีรายการ
                  </div>
                )}
                {items.map((r) => {
                  const core = CORE_FUNCTION_META[r.core_function];
                  return (
                    <article
                      key={r.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(r.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', r.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStatus(null);
                      }}
                      onClick={() => onSelectRequirement(r)}
                      className={`group bg-white rounded-xl border border-slate-200 p-2.5 cursor-pointer shadow-2xs hover:border-[#0086FF] hover:shadow-md transition-all ${
                        dragId === r.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] font-black text-[#044492] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                          {r.req_id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${
                            PRIORITY_CLASS[r.priority] || ''
                          }`}
                        >
                          {r.priority === '1.High' && <Flame className="w-3 h-3" />}
                          {r.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug line-clamp-3">
                        {r.title}
                      </h4>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${core.badgeBg} ${core.badgeText} ${core.badgeBorder}`}
                        >
                          {core.shortName}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[110px]">{r.module}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-500 inline-flex items-center gap-1 min-w-0">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{r.dev_assigned || 'ยังไม่มอบหมาย'}</span>
                          {r.target_version && (
                            <span className="font-mono text-slate-400">· {r.target_version}</span>
                          )}
                        </span>
                        {next && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              move(r.id, next);
                            }}
                            className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#044492] bg-blue-50 hover:bg-[#FFCB06] hover:text-slate-950 border border-blue-100 rounded-lg px-1.5 py-0.5 transition-colors"
                            title={`ส่งต่อไป ${STATUS_META[next].label}`}
                          >
                            ส่งต่อ
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
