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

const COLUMN_ACCENT: Record<RequirementStatusType, string> = {
  Draft: 'border-t-slate-400',
  'In Review': 'border-t-amber-500',
  'In Development': 'border-t-indigo-500',
  Testing: 'border-t-sky-500',
  Done: 'border-t-emerald-500',
};

const PRIORITY_CLASS: Record<string, string> = {
  '1.High': 'bg-red-50 text-red-700 border-red-200',
  '2.Medium': 'bg-amber-50 text-amber-800 border-amber-200',
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
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Req ID, หัวข้อ, ผู้ขอ, Dev"
            aria-label="ค้นหา Requirement"
            className="field pl-9"
          />
        </div>
        <select
          value={coreFilter}
          onChange={(e) => setCoreFilter(e.target.value)}
          aria-label="กรองตาม Core Function"
          className="field !w-auto font-medium"
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
          aria-label="กรองตาม Dev"
          className="field !w-auto font-medium"
        >
          <option value="">Dev ทั้งหมด</option>
          <option value="__none__">ยังไม่มอบหมาย</option>
          {team.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
        {columns.map(({ status, items }, colIdx) => {
          const meta = STATUS_META[status];
          const next = REQUIREMENT_STATUSES[colIdx + 1];
          const isOver = overStatus === status && dragId !== null;
          return (
            <section
              key={status}
              aria-label={meta.label}
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
              className={`rounded-xl border border-t-4 ${COLUMN_ACCENT[status]} p-2.5 min-h-[240px] transition-colors ${
                isOver
                  ? 'bg-jiffy-sky border-x-jiffy-blue border-b-jiffy-blue'
                  : 'bg-slate-100/80 border-x-line border-b-line'
              }`}
            >
              <header className="flex items-start justify-between gap-2 px-1 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-jiffy-ink truncate">{meta.label}</h3>
                    <span className="min-w-[22px] text-center text-xs font-semibold text-slate-600 bg-white border border-line rounded-full px-1.5">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{meta.shortTh}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onCreateRequirement(status)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-jiffy-navy hover:bg-white"
                  title={`เพิ่ม Requirement ใน ${meta.label}`}
                  aria-label={`เพิ่ม Requirement ใน ${meta.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </header>

              <div className="space-y-2.5">
                {items.length === 0 && (
                  <div className="text-center text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg py-8">
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
                      className={`bg-white rounded-lg border border-line p-3 cursor-grab active:cursor-grabbing shadow-card hover:border-jiffy-blue hover:shadow-raised transition-shadow ${
                        dragId === r.id ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-jiffy-navy">{r.req_id}</span>
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                            PRIORITY_CLASS[r.priority] || ''
                          }`}
                        >
                          {r.priority === '1.High' && <Flame className="w-3 h-3" aria-hidden />}
                          {r.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 mt-2 leading-snug line-clamp-3">
                        {r.title}
                      </h4>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${core.badgeBg} ${core.badgeText} ${core.badgeBorder}`}
                        >
                          {core.shortName}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">{r.module}</span>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 inline-flex items-center gap-1.5 min-w-0">
                          <User className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
                          <span className="truncate">{r.dev_assigned || 'ยังไม่มอบหมาย'}</span>
                        </span>
                        {next && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              move(r.id, next);
                            }}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-jiffy-navy bg-jiffy-sky hover:bg-jiffy-yellow hover:text-jiffy-ink border border-jiffy-mist hover:border-jiffy-gold rounded-md px-2 py-1 transition-colors"
                            title={`ส่งต่อไป ${STATUS_META[next].label}`}
                          >
                            ส่งต่อ
                            <ArrowRight className="w-3 h-3" aria-hidden />
                          </button>
                        )}
                      </div>
                      {r.target_version && (
                        <div className="mt-1.5 text-xs text-slate-400 font-mono">{r.target_version}</div>
                      )}
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
