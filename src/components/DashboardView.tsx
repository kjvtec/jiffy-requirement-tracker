'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Code2,
  Flame,
  Layers,
  ListOrdered,
  PieChart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  CORE_FUNCTIONS,
  CORE_FUNCTION_META,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  type CoreFunctionType,
  type Developer,
  type Requirement,
  type RequirementStatusType,
  type SystemModule,
} from '@/types';
import { CORE_ICON } from '@/lib/coreIcons';
import { STATUS_META } from '@/lib/status';
import { NeedInfoBadge, PriorityBadge, StatusBadge, formatDateTime } from './Badges';

interface DashboardViewProps {
  requirements: Requirement[];
  developers: Developer[];
  modules: SystemModule[];
  onSelectRequirement: (req: Requirement) => void;
  onFilterByModule: (moduleName: string, coreFunction?: string) => void;
  onSelectCoreFunction: (coreFunction: CoreFunctionType) => void;
  onFilterByStatus: (statusName: string) => void;
  onFilterByPriority: (priorityName: string) => void;
  onFilterByDev: (devName: string) => void;
  onFilterNeedsInfo: () => void;
  onGoToTable: () => void;
  onGoToPriorityList: () => void;
}

/** Counts up smoothly when the target changes. */
function useAnimatedNumber(target: number, duration = 450): number {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function Kpi({
  label,
  hint,
  value,
  icon: Icon,
  tile,
  card,
  valueClass,
  onClick,
}: {
  label: string;
  hint: string;
  value: number;
  icon: LucideIcon;
  tile: string;
  card: string;
  valueClass: string;
  onClick: () => void;
}) {
  const shown = useAnimatedNumber(value);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden text-left rounded-xl border p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised ${card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className={`h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-card transition-transform group-hover:scale-110 group-hover:rotate-3 ${tile}`}>
          <Icon className="w-5 h-5" aria-hidden />
        </span>
      </div>
      <div className={`mt-2 text-3xl font-bold leading-none tabular-nums ${valueClass}`}>{shown}</div>
      <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
      <ArrowRight className="absolute right-3 bottom-3 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
    </button>
  );
}

function PanelTitle({ icon: Icon, tone, title, hint }: { icon: LucideIcon; tone: string; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-9 w-9 rounded-xl text-white flex items-center justify-center shadow-card ${tone}`}>
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-bold text-jiffy-ink leading-tight">{title}</h3>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

const TYPE_BAR = ['bg-sky-500', 'bg-fuchsia-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];
const AVATAR_TONES = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-pink-600',
  'from-indigo-400 to-violet-600',
];

export default function DashboardView({
  requirements,
  developers,
  modules,
  onSelectRequirement,
  onFilterByModule,
  onSelectCoreFunction,
  onFilterByStatus,
  onFilterByPriority,
  onFilterByDev,
  onFilterNeedsInfo,
  onGoToTable,
  onGoToPriorityList,
}: DashboardViewProps) {
  const [manualCore, setManualCore] = useState<CoreFunctionType | null>(null);
  const [urgentCollapsed, setUrgentCollapsed] = useState(false);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(
      REQUIREMENT_STATUSES.map((s) => [s, requirements.filter((r) => r.status === s).length])
    ) as Record<RequirementStatusType, number>;
    const total = requirements.length;
    return {
      total,
      byStatus,
      doneRate: total > 0 ? Math.round((byStatus.Done / total) * 100) : 0,
      high: requirements.filter((r) => r.priority === '1.High').length,
      medium: requirements.filter((r) => r.priority === '2.Medium').length,
      low: requirements.filter((r) => r.priority === '3.Low').length,
    };
  }, [requirements]);

  const needsInfo = useMemo(
    () =>
      requirements
        .filter((r) => r.info_requested && r.status !== 'Done')
        .sort((a, b) => (b.info_requested_at || '').localeCompare(a.info_requested_at || '')),
    [requirements]
  );

  const highPending = useMemo(
    () => requirements.filter((r) => r.priority === '1.High' && r.status !== 'Done'),
    [requirements]
  );

  const coreBreakdown = useMemo(
    () =>
      CORE_FUNCTIONS.map((core) => {
        const list = requirements.filter((r) => r.core_function === core);
        const done = list.filter((r) => r.status === 'Done').length;
        const names = new Set<string>();
        modules.filter((m) => m.core_function === core).forEach((m) => names.add(m.name));
        list.forEach((r) => names.add(r.module));
        const subModules = Array.from(names)
          .map((name) => {
            const l = list.filter((r) => r.module === name);
            return { name, total: l.length, done: l.filter((r) => r.status === 'Done').length };
          })
          .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th'));
        return {
          core,
          total: list.length,
          done,
          pending: list.length - done,
          inDev: list.filter((r) => r.status === 'In Development').length,
          high: list.filter((r) => r.priority === '1.High' && r.status !== 'Done').length,
          percent: list.length > 0 ? Math.round((done / list.length) * 100) : 0,
          subModules,
        };
      }),
    [requirements, modules]
  );

  const activeCore = useMemo(
    () => manualCore ?? coreBreakdown.find((c) => c.total > 0)?.core ?? CORE_FUNCTIONS[0],
    [manualCore, coreBreakdown]
  );
  const activeData = coreBreakdown.find((c) => c.core === activeCore) ?? coreBreakdown[0];

  const devWorkload = useMemo(
    () =>
      developers
        .map((d) => {
          const list = requirements.filter((r) => r.dev_assigned === d.name);
          return {
            name: d.name,
            total: list.length,
            inDev: list.filter((r) => r.status === 'In Development').length,
            testing: list.filter((r) => r.status === 'Testing').length,
            done: list.filter((r) => r.status === 'Done').length,
          };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'th')),
    [requirements, developers]
  );
  const unassigned = requirements.filter((r) => !r.dev_assigned && r.status !== 'Done').length;

  const typeDistribution = useMemo(
    () =>
      REQUIREMENT_TYPES.map((type) => {
        const count = requirements.filter((r) => r.type === type).length;
        return { type, count, percent: requirements.length ? Math.round((count / requirements.length) * 100) : 0 };
      }),
    [requirements]
  );

  const kpis: Array<{ status: RequirementStatusType; hint: string }> = [
    { status: 'New', hint: 'รอเริ่มดำเนินการ' },
    { status: 'In Development', hint: 'Dev กำลังพัฒนา' },
    { status: 'Testing', hint: 'กำลังทดสอบ / UAT' },
    { status: 'Done', hint: 'เสร็จสมบูรณ์ / Released' },
  ];

  return (
    <div className="space-y-5">
      {/* Dev is waiting for information: blinks until the requester answers */}
      {needsInfo.length > 0 && (
        <section className="need-info-beacon rounded-xl border-2 overflow-hidden" aria-label="Requirement ที่ Dev ขอข้อมูลเพิ่ม">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-card">
                <CircleHelp className="w-6 h-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-bold text-orange-950">Dev ขอข้อมูลเพิ่ม {needsInfo.length} เรื่อง</h3>
                <p className="text-sm text-orange-900/80">ผู้เปิด Requirement ต้องให้ข้อมูลเพื่อให้ Dev ทำงานต่อได้</p>
              </div>
            </div>
            <button type="button" onClick={onFilterNeedsInfo} className="btn bg-orange-500 text-white hover:bg-orange-600 shadow-card">
              ดูทั้งหมด
              <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <ul className="divide-y divide-orange-200/70 bg-white/70">
            {needsInfo.slice(0, 5).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelectRequirement(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors flex flex-wrap items-center gap-x-4 gap-y-1"
                >
                  <span className="font-mono text-xs font-bold text-orange-800 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md">{r.req_id}</span>
                  <span className="font-semibold text-slate-900 flex-1 min-w-[200px] truncate">{r.title}</span>
                  <span className="text-xs text-slate-600">
                    <b className="text-orange-800">{r.info_requested_by || 'Dev'}</b> ถาม <b>{r.requested_by}</b> · {formatDateTime(r.info_requested_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          label="Requirement ทั้งหมด"
          hint={`เสร็จแล้ว ${stats.doneRate}%`}
          value={stats.total}
          icon={Layers}
          tile="bg-gradient-to-br from-jiffy-blue to-jiffy-navy"
          card="bg-gradient-to-br from-white to-jiffy-sky border-jiffy-mist hover:border-jiffy-blue"
          valueClass="text-jiffy-navy"
          onClick={onGoToTable}
        />
        {kpis.map(({ status, hint }) => {
          const meta = STATUS_META[status];
          return (
            <Kpi
              key={status}
              label={meta.label}
              hint={hint}
              value={stats.byStatus[status]}
              icon={meta.icon}
              tile={meta.tileClass}
              card={`bg-gradient-to-br from-white ${meta.softClass}`}
              valueClass={meta.textClass}
              onClick={() => onFilterByStatus(status)}
            />
          );
        })}
      </div>

      {/* High priority still open */}
      {highPending.length > 0 && (
        <section className="card border-red-200 overflow-hidden" aria-label="High Priority ที่ยังค้าง">
          <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-white border-b border-red-100 flex items-center justify-between gap-3">
            <PanelTitle
              icon={Flame}
              tone="bg-gradient-to-br from-red-500 to-rose-600"
              title={`High Priority ที่ยังค้าง (${highPending.length} เรื่อง)`}
              hint="งานเร่งด่วนที่ต้องเสร็จทันกำหนด SIT"
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onFilterByPriority('1.High')} className="text-sm font-semibold text-red-700 hover:text-red-900 inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50">
                ดูทั้งหมด <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setUrgentCollapsed((v) => !v)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white"
                aria-label={urgentCollapsed ? 'ขยาย' : 'ย่อ'}
                aria-expanded={!urgentCollapsed}
              >
                {urgentCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {!urgentCollapsed && (
            <ul className="divide-y divide-red-50">
              {highPending.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => onSelectRequirement(r)} className="w-full text-left px-4 py-3 hover:bg-red-50/50 transition-colors flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-md">{r.req_id}</span>
                    <span className="flex-1 min-w-[220px]">
                      <span className="block font-semibold text-slate-900 truncate">{r.title}</span>
                      <span className="block text-xs text-slate-500">
                        {r.core_function} · {r.module}
                      </span>
                    </span>
                    {r.info_requested && <NeedInfoBadge />}
                    {r.dev_assigned && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                        <Code2 className="w-3.5 h-3.5" aria-hidden />
                        {r.dev_assigned}
                      </span>
                    )}
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Progress by Core Function */}
      <section className="card p-4 sm:p-5 space-y-4" aria-label="ความคืบหน้าแยกตามระบบ">
        <PanelTitle icon={BarChart3} tone="bg-gradient-to-br from-jiffy-blue to-jiffy-navy" title="ความคืบหน้าแยกตามระบบหลักและโมดูล" hint="คลิกการ์ดเพื่อดูโมดูล · คลิกโมดูลเพื่อกรองในตาราง" />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {coreBreakdown.map((c) => {
            const meta = CORE_FUNCTION_META[c.core];
            const Icon = CORE_ICON[c.core];
            const active = c.core === activeCore;
            return (
              <button
                key={c.core}
                type="button"
                onClick={() => setManualCore(c.core)}
                style={{ borderTopColor: meta.accentHex, ...(active ? { boxShadow: `0 0 0 2px ${meta.accentHex}55` } : {}) }}
                className={`text-left rounded-xl border border-t-4 p-3 transition-all hover:-translate-y-0.5 hover:shadow-raised ${meta.badgeBg} ${active ? 'shadow-raised' : 'border-line'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg text-white flex items-center justify-center shadow-card" style={{ backgroundColor: meta.accentHex }}>
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold truncate ${meta.badgeText}`}>{meta.shortName}</div>
                    <div className="text-xs text-slate-500">{c.total} เรื่อง</div>
                  </div>
                </div>
                <div className="mt-2.5 h-2 rounded-full bg-white/80 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.percent}%`, backgroundColor: meta.accentHex }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-slate-600">
                  <span>เสร็จ {c.percent}%</span>
                  {c.high > 0 && <span className="text-red-600 font-semibold">High {c.high}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {activeData && (
          <div className="rounded-xl border border-line bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-sm text-slate-600">
                <b className="text-jiffy-ink">{activeData.core}</b> · คงค้าง {activeData.pending} · กำลังพัฒนา {activeData.inDev}
              </div>
              <button type="button" onClick={() => onSelectCoreFunction(activeData.core)} className="text-sm font-semibold text-jiffy-blue hover:underline inline-flex items-center gap-1">
                ดูตารางของระบบนี้ <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {activeData.subModules.map((m) => {
                const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
                const meta = CORE_FUNCTION_META[activeData.core];
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => onFilterByModule(m.name, activeData.core)}
                    className="text-left bg-white rounded-lg border border-line p-2.5 hover:border-jiffy-blue hover:shadow-card transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{m.name}</span>
                      <span className="text-xs font-bold text-white rounded-full px-2 py-0.5 shrink-0" style={{ backgroundColor: m.total ? meta.accentHex : '#cbd5e1' }}>
                        {m.total}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      เสร็จ {m.done}/{m.total}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dev workload */}
        <section className="card p-4 sm:p-5 space-y-3" aria-label="ภาระงาน Dev">
          <div className="flex items-start justify-between gap-2">
            <PanelTitle icon={Users} tone="bg-gradient-to-br from-indigo-400 to-violet-600" title="ภาระงาน Developer" hint={`${developers.length} คน · ยังไม่มอบหมาย ${unassigned} เรื่อง`} />
          </div>
          {devWorkload.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">ยังไม่มีรายชื่อ Dev</p>
          ) : (
            <ul className="space-y-2.5">
              {devWorkload.map((d, i) => (
                <li key={d.name}>
                  <button type="button" onClick={() => onFilterByDev(d.name)} className="w-full text-left rounded-lg border border-line p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`h-9 w-9 rounded-full bg-gradient-to-br ${AVATAR_TONES[i % AVATAR_TONES.length]} text-white flex items-center justify-center font-bold shadow-card`}>
                        {d.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {d.name} <span className="text-xs font-normal text-slate-500">รับผิดชอบ {d.total} เรื่อง</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden flex">
                          {d.total > 0 && (
                            <>
                              <div className="bg-indigo-500" style={{ width: `${(d.inDev / d.total) * 100}%` }} />
                              <div className="bg-amber-400" style={{ width: `${(d.testing / d.total) * 100}%` }} />
                              <div className="bg-emerald-500" style={{ width: `${(d.done / d.total) * 100}%` }} />
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 text-xs font-semibold shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700" title="กำลังพัฒนา">{d.inDev}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="ทดสอบ">{d.testing}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700" title="เสร็จ">{d.done}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Type + priority */}
        <section className="card p-4 sm:p-5 space-y-4" aria-label="ประเภทและความเร่งด่วน">
          <PanelTitle icon={PieChart} tone="bg-gradient-to-br from-fuchsia-400 to-pink-600" title="ประเภท Requirement & ความเร่งด่วน" hint="จำแนกตามประเภทและ Priority" />
          <ul className="space-y-2.5">
            {typeDistribution.map((t, i) => (
              <li key={t.type}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{t.type}</span>
                  <span className="text-slate-500">{t.count} เรื่อง ({t.percent}%)</span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${TYPE_BAR[i % TYPE_BAR.length]}`} style={{ width: `${t.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {([
              ['1.High', stats.high],
              ['2.Medium', stats.medium],
              ['3.Low', stats.low],
            ] as const).map(([p, n]) => (
              <button key={p} type="button" onClick={() => onFilterByPriority(p)} className="rounded-lg border border-line p-2.5 text-center hover:shadow-card hover:-translate-y-0.5 transition-all bg-white">
                <PriorityBadge priority={p} />
                <div className="mt-1.5 text-2xl font-bold text-slate-800 tabular-nums">{n}</div>
              </button>
            ))}
          </div>
          <button type="button" onClick={onGoToPriorityList} className="btn-secondary w-full">
            <ListOrdered className="w-4 h-4" aria-hidden />
            ดูรายการแยกตาม Priority
          </button>
        </section>
      </div>
    </div>
  );
}
