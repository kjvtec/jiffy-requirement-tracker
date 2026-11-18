'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Layers,
  Clock,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  FolderTree,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  User,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  FileText,
  TestTube2,
  Compass,
} from 'lucide-react';
import {
  Requirement,
  TeamMember,
  SystemModule,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
  REQUIREMENT_TYPES,
  RequirementType,
} from '@/types';
import { getStatusBadgeClass, getStatusShortTh } from '@/lib/status';

interface DashboardViewProps {
  issues: Requirement[];
  teamMembers: TeamMember[];
  modules: SystemModule[];
  onSelectIssue: (req: Requirement) => void;
  onFilterByModule: (moduleName: string, coreFunction?: string) => void;
  onSelectCoreFunction?: (coreFunction: CoreFunctionType) => void;
  onFilterByStatus: (statusName: string) => void;
  onFilterByPriority: (priorityName: string) => void;
  onFilterByReporter: (reporterName: string) => void;
  onFilterByDev?: (devName: string) => void;
  onGoToTable: () => void;
  onGoToPriorityList?: () => void;
}

function useAnimatedNumber(target: number, duration = 260): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    const diff = target - startVal;
    if (diff === 0 || startVal === 0) {
      prevRef.current = target;
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    let rafId = 0;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + diff * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = target;
      }
    };
    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = target;
    };
  }, [target, duration]);

  return display;
}

export default function DashboardView({
  issues: requirements,
  teamMembers,
  modules,
  onSelectIssue,
  onFilterByModule,
  onSelectCoreFunction,
  onFilterByStatus,
  onFilterByPriority,
  onFilterByReporter,
  onFilterByDev,
  onGoToTable,
  onGoToPriorityList,
}: DashboardViewProps) {
  const [manualCore, setManualCore] = useState<CoreFunctionType | null>(null);
  const [urgentCollapsed, setUrgentCollapsed] = useState(false);

  // High-level statistics
  const stats = useMemo(() => {
    const total = requirements.length;
    const draft = requirements.filter((r) => r.status === 'Draft').length;
    const inReview = requirements.filter((r) => r.status === 'In Review').length;
    const inDev = requirements.filter((r) => r.status === 'In Development').length;
    const testing = requirements.filter((r) => r.status === 'Testing').length;
    const done = requirements.filter((r) => r.status === 'Done' || (r.status as string) === 'Closed').length;

    const high = requirements.filter((r) => r.priority === '1.High').length;
    const medium = requirements.filter((r) => r.priority === '2.Medium').length;
    const low = requirements.filter((r) => r.priority === '3.Low').length;

    const doneRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const activeCount = total - done;

    return {
      total,
      draft,
      inReview,
      inDev,
      testing,
      done,
      high,
      medium,
      low,
      doneRate,
      activeCount,
    };
  }, [requirements]);

  const animTotal = useAnimatedNumber(stats.total);
  const animDraft = useAnimatedNumber(stats.draft);
  const animInReview = useAnimatedNumber(stats.inReview);
  const animInDev = useAnimatedNumber(stats.inDev);
  const animTesting = useAnimatedNumber(stats.testing);
  const animDone = useAnimatedNumber(stats.done);
  const animRate = useAnimatedNumber(stats.doneRate);

  // Breakdown by Core Function
  const coreBreakdown = useMemo(() => {
    return CORE_FUNCTIONS.map((core) => {
      const coreReqs = requirements.filter(
        (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === core
      );
      const total = coreReqs.length;
      const done = coreReqs.filter((r) => r.status === 'Done' || (r.status as string) === 'Closed').length;
      const pending = total - done;
      const inDev = coreReqs.filter((r) => r.status === 'In Development').length;
      const highPending = coreReqs.filter(
        (r) => r.priority === '1.High' && r.status !== 'Done' && (r.status as string) !== 'Closed'
      ).length;
      const percentDone = total > 0 ? Math.round((done / total) * 100) : 0;

      // Collect sub-modules
      const subNameSet = new Set<string>(DEFAULT_MODULES_BY_CORE[core] || []);
      modules
        .filter((m) => (m.core_function || DEFAULT_CORE_FUNCTION) === core)
        .forEach((m) => {
          if (m.name) subNameSet.add(m.name);
        });
      coreReqs.forEach((r) => {
        if (r.module) subNameSet.add(r.module);
      });

      const subModules = Array.from(subNameSet)
        .map((modName) => {
          const modReqs = coreReqs.filter((r) => (r.module || 'General') === modName);
          const mTotal = modReqs.length;
          const mDone = modReqs.filter((r) => r.status === 'Done' || (r.status as string) === 'Closed').length;
          const mPending = mTotal - mDone;
          const mInDev = modReqs.filter((r) => r.status === 'In Development').length;
          return {
            name: modName,
            total: mTotal,
            done: mDone,
            pending: mPending,
            inDev: mInDev,
            percentDone: mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0,
          };
        })
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name, 'th');
        });

      return {
        core,
        meta: CORE_FUNCTION_META[core],
        total,
        done,
        pending,
        inDev,
        highPending,
        percentDone,
        subModules,
      };
    });
  }, [requirements, modules]);

  const activeCore = useMemo<CoreFunctionType>(() => {
    if (manualCore) return manualCore;
    const withReqs = coreBreakdown.find((c) => c.total > 0);
    return withReqs ? withReqs.core : CORE_FUNCTIONS[0];
  }, [manualCore, coreBreakdown]);

  const activeCoreData = useMemo(() => {
    return coreBreakdown.find((c) => c.core === activeCore) || coreBreakdown[0];
  }, [coreBreakdown, activeCore]);

  // Dev Workload Breakdown
  const devWorkload = useMemo(() => {
    const map: Record<string, { total: number; draft: number; inReview: number; inDev: number; testing: number; done: number }> = {};

    teamMembers.forEach((tm) => {
      map[tm.name] = { total: 0, draft: 0, inReview: 0, inDev: 0, testing: 0, done: 0 };
    });

    requirements.forEach((r) => {
      const devName = r.dev_assigned || (r as any).closed_by;
      if (devName) {
        if (!map[devName]) {
          map[devName] = { total: 0, draft: 0, inReview: 0, inDev: 0, testing: 0, done: 0 };
        }
        map[devName].total++;
        if (r.status === 'Draft') map[devName].draft++;
        else if (r.status === 'In Review') map[devName].inReview++;
        else if (r.status === 'In Development') map[devName].inDev++;
        else if (r.status === 'Testing') map[devName].testing++;
        else if (r.status === 'Done' || (r.status as string) === 'Closed') map[devName].done++;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => {
        const percentDone = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
        return {
          name,
          ...data,
          percentDone,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [requirements, teamMembers]);

  // Requirement Types Distribution
  const typeDistribution = useMemo(() => {
    const total = requirements.length;
    const counts: Record<string, number> = {};
    REQUIREMENT_TYPES.forEach((t) => {
      counts[t] = 0;
    });

    requirements.forEach((r) => {
      const t = r.type || 'New Feature';
      counts[t] = (counts[t] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [requirements]);

  // High Priority pending requirements
  const highPriorityPending = useMemo(() => {
    return requirements
      .filter((r) => r.priority === '1.High' && r.status !== 'Done' && (r.status as string) !== 'Closed')
      .slice(0, 8);
  }, [requirements]);

  // Requesters summary
  const requestersSummary = useMemo(() => {
    const map: Record<string, number> = {};
    requirements.forEach((r) => {
      const reqBy = r.requested_by || (r as any).raise_by || 'Unknown';
      map[reqBy] = (map[reqBy] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [requirements]);

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Cards (CI Matching Jiffy Royal Blue & Status Colors) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={onGoToTable}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-[#DCEBFF] hover:border-[#0086FF] hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Requirement ทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-[#044492]/10 text-[#044492] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#044492]">{animTotal}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              ความคืบหน้ารวม <span className="font-bold text-emerald-600">{animRate}%</span>
            </div>
          </div>
        </button>

        {/* Draft */}
        <button
          type="button"
          onClick={() => onFilterByStatus('Draft')}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">Draft (ร่าง)</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{animDraft}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">
              ร่างข้อกำหนดระบบ
            </div>
          </div>
        </button>

        {/* In Review */}
        <button
          type="button"
          onClick={() => onFilterByStatus('In Review')}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-900">In Review (รอตรวจ)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-800">{animInReview}</div>
            <div className="text-[11px] font-medium text-amber-700 mt-0.5">
              รอตรวจทาน / ประเมิน
            </div>
          </div>
        </button>

        {/* In Development */}
        <button
          type="button"
          onClick={() => onFilterByStatus('In Development')}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-900">In Dev (กำลังทำ)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-700">{animInDev}</div>
            <div className="text-[11px] font-medium text-indigo-600 mt-0.5">
              Dev กำลังพัฒนา
            </div>
          </div>
        </button>

        {/* Testing */}
        <button
          type="button"
          onClick={() => onFilterByStatus('Testing')}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-sky-200 hover:border-sky-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-900">Testing (รอทดสอบ)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TestTube2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-700">{animTesting}</div>
            <div className="text-[11px] font-medium text-sky-600 mt-0.5">
              กำลังทดสอบ / UAT
            </div>
          </div>
        </button>

        {/* Done */}
        <button
          type="button"
          onClick={() => onFilterByStatus('Done')}
          className="group relative overflow-hidden bg-white p-4 rounded-2xl border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-900">Done (เสร็จสมบูรณ์)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{animDone}</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
              เสร็จสมบูรณ์ / Released
            </div>
          </div>
        </button>
      </div>

      {/* 3. Core Function & Module Breakdown */}
      <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#0086FF]" />
              <h3 className="text-base font-bold text-[#044492]">
                ความคืบหน้าแยกตาม Core Function และ Module
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามสัดส่วนความคืบหน้าของ 5 แกนหลักระบบ Jiffy POS & Backoffice
            </p>
          </div>

          {/* Quick Core Function Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {coreBreakdown.map((item) => {
              const isSelected = item.core === activeCore;
              return (
                <button
                  key={item.core}
                  type="button"
                  onClick={() => setManualCore(item.core)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-[#044492] text-white border-[#044492] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.meta.shortName} ({item.total})
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Core Function Detailed Card */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Core Summary info */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl p-4 border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${activeCoreData.meta.badgeBg} ${activeCoreData.meta.badgeText} ${activeCoreData.meta.badgeBorder}`}>
                  {activeCoreData.core}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {activeCoreData.percentDone}% เสร็จสมบูรณ์
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                {activeCoreData.meta.description}
              </p>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>ความคืบหน้า</span>
                  <span>{activeCoreData.done} / {activeCoreData.total} เรื่อง</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${activeCoreData.percentDone}%` }}
                    className="h-full bg-gradient-to-r from-[#0086FF] to-emerald-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <div className="text-[10px] text-slate-500">คงค้าง</div>
                  <div className="text-base font-bold text-slate-800">{activeCoreData.pending}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-indigo-200">
                  <div className="text-[10px] text-indigo-600 font-medium">In Dev</div>
                  <div className="text-base font-bold text-indigo-700">{activeCoreData.inDev}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-medium">High ค้าง</div>
                  <div className="text-base font-bold text-rose-700">{activeCoreData.highPending}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSelectCoreFunction) onSelectCoreFunction(activeCoreData.core);
                onGoToTable();
              }}
              className="mt-4 w-full py-2 px-3 rounded-lg bg-white border border-[#0086FF]/40 text-[#044492] hover:bg-[#0086FF] hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <span>ดูตาราง {activeCoreData.meta.shortName} ทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Sub-modules Grid */}
          <div className="lg:col-span-2">
            <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
              <span>โมดูลย่อยใน {activeCoreData.core}</span>
              <span className="text-[11px] font-normal text-slate-500">
                (คลิกโมดูลเพื่อกรองในตาราง)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
              {activeCoreData.subModules.map((mod) => (
                <button
                  key={mod.name}
                  type="button"
                  onClick={() => {
                    onFilterByModule(mod.name, activeCoreData.core);
                    onGoToTable();
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-[#0086FF] hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between bg-white group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#044492] truncate">
                      {mod.name}
                    </span>
                    <span className="text-[11px] font-bold text-[#044492] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                      {mod.total}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>เสร็จ {mod.done}/{mod.total}</span>
                      <span className="font-semibold text-emerald-600">{mod.percentDone}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${mod.percentDone}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dev Workload & Requirement Types (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dev Workload */}
        <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#0086FF]" />
              <h3 className="text-base font-bold text-[#044492]">ภาระงาน Developer (Dev Workload)</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {devWorkload.filter((d) => d.total > 0).length} ท่านมีงานรับผิดชอบ
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {devWorkload.map((dev) => (
              <div
                key={dev.name}
                className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-[#044492] font-bold text-xs flex items-center justify-center">
                      {dev.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">{dev.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">
                        (รับผิดชอบ {dev.total} เรื่อง)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                      In Dev: {dev.inDev}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                      Test: {dev.testing}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      Done: {dev.done}
                    </span>
                  </div>
                </div>

                {/* Dev progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${dev.percentDone}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requirement Types Distribution & Priority Summary */}
        <div className="bg-white rounded-2xl border border-[#DCEBFF] shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0086FF]" />
                <h3 className="text-base font-bold text-[#044492]">ประเภท Requirement & ความเร่งด่วน</h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                จำแนกตาม Type
              </span>
            </div>

            {/* Types breakdown */}
            <div className="mt-4 space-y-2.5">
              {typeDistribution.map((item) => (
                <div key={item.type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.type}</span>
                    <span className="text-slate-500 font-medium">
                      {item.count} เรื่อง ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${item.percent}%` }}
                      className="h-full bg-[#0086FF] rounded-full transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Priority badges row */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2.5">
                ระดับความเร่งด่วน (Priority)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onFilterByPriority('1.High')}
                  className="p-2.5 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-left transition-all"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-red-700">
                    <Flame className="w-3.5 h-3.5" />
                    1.High
                  </div>
                  <div className="text-lg font-black text-red-900 mt-1">{stats.high}</div>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterByPriority('2.Medium')}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition-all"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    2.Medium
                  </div>
                  <div className="text-lg font-black text-amber-900 mt-1">{stats.medium}</div>
                </button>

                <button
                  type="button"
                  onClick={() => onFilterByPriority('3.Low')}
                  className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-50 text-left transition-all"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-sky-700">
                    <Layers className="w-3.5 h-3.5" />
                    3.Low
                  </div>
                  <div className="text-lg font-black text-sky-900 mt-1">{stats.low}</div>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToPriorityList}
            className="mt-5 w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-[#0086FF] hover:text-white text-[#044492] border border-slate-200 hover:border-[#0086FF] text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <span>ดูรายการแยกตาม Priority List ทั้งหมด</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. High Priority Requirements Pending (Urgent Action List) */}
      {highPriorityPending.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50/40 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-950">
                  High Priority Requirements ที่ยังคงค้าง ({highPriorityPending.length} เรื่อง)
                </h3>
                <p className="text-[11px] text-red-700/80">
                  รายการเร่งด่วนที่ต้องเร่งพัฒนาให้เสร็จทันกำหนด SIT
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onFilterByPriority('1.High')}
              className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1"
            >
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-red-50">
            {highPriorityPending.map((req) => (
              <div
                key={req.id}
                onClick={() => onSelectIssue(req)}
                className="p-3.5 hover:bg-red-50/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="shrink-0 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-md border border-red-200">
                    {req.req_id || req.log_id}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 hover:text-[#0086FF] truncate">
                      {req.title || req.details}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{req.core_function}</span>
                      <span>•</span>
                      <span>{req.module}</span>
                      {req.target_version && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">{req.target_version}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {req.dev_assigned && (
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Dev: {req.dev_assigned}
                    </span>
                  )}
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                    {getStatusShortTh(req.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
