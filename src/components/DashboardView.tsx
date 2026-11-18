'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  User,
  ArrowRight,
  ShieldAlert,
  Flame,
  ImageIcon,
  FolderTree,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  HelpCircle,
  Send,
  ListOrdered,
  Sparkles,
  X,
  Search,
  Filter,
} from 'lucide-react';
import {
  Issue,
  TeamMember,
  SystemModule,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
} from '@/types';
import { getLatestTimelineInfo } from '@/lib/timeline';
import { parseIssueNumber } from '@/lib/issueSort';
import RecentIssuesModal from './RecentIssuesModal';

interface DashboardViewProps {
  issues: Issue[];
  teamMembers: TeamMember[];
  modules: SystemModule[];
  onSelectIssue: (issue: Issue) => void;
  onFilterByModule: (moduleName: string, coreFunction?: string) => void;
  onSelectCoreFunction?: (coreFunction: CoreFunctionType) => void;
  onFilterByStatus: (statusName: string) => void;
  onFilterByPriority: (priorityName: string) => void;
  onFilterByReporter: (reporterName: string) => void;
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
  issues,
  teamMembers,
  modules,
  onSelectIssue,
  onFilterByModule,
  onSelectCoreFunction,
  onFilterByStatus,
  onFilterByPriority,
  onFilterByReporter,
  onGoToTable,
  onGoToPriorityList,
}: DashboardViewProps) {
  const [manualCore, setManualCore] = useState<CoreFunctionType | null>(null);
  const [urgentCollapsed, setUrgentCollapsed] = useState(false);
  const [moduleChartMode, setModuleChartMode] = useState<'bar' | 'pie'>('bar');
  // Statistics Calculations
  const stats = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((i) => i.status === 'Open').length;
    const needInfo = issues.filter((i) => i.status === 'Need Info').length;
    const inProgress = issues.filter((i) => i.status === 'In Progress').length;
    const test = issues.filter((i) => i.status === 'Test').length;
    const closed = issues.filter((i) => i.status === 'Closed').length;
    const high = issues.filter((i) => i.priority.includes('High')).length;
    const medium = issues.filter((i) => i.priority.includes('Medium')).length;
    const low = issues.filter((i) => i.priority.includes('Low')).length;
    const withImages = issues.filter((i) => i.images && i.images.length > 0).length;

    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const activeRate = total > 0 ? Math.round(((open + needInfo + inProgress + test) / total) * 100) : 0;

    return {
      total,
      open,
      needInfo,
      inProgress,
      test,
      closed,
      high,
      medium,
      low,
      withImages,
      resolutionRate,
      activeRate,
    };
  }, [issues]);

  const animTotal = useAnimatedNumber(stats.total);
  const animOpen = useAnimatedNumber(stats.open);
  const animNeedInfo = useAnimatedNumber(stats.needInfo);
  const animInProgress = useAnimatedNumber(stats.inProgress);
  const animTest = useAnimatedNumber(stats.test);
  const animClosed = useAnimatedNumber(stats.closed);
  const animRemaining = useAnimatedNumber(stats.open + stats.needInfo + stats.inProgress + stats.test);
  const animHigh = useAnimatedNumber(stats.high);
  const animMedium = useAnimatedNumber(stats.medium);
  const animLow = useAnimatedNumber(stats.low);
  const animRate = useAnimatedNumber(stats.resolutionRate);

  // Breakdown by Core Function -> Sub-module
  const coreBreakdown = useMemo(() => {
    return CORE_FUNCTIONS.map((core) => {
      const coreIssues = issues.filter(
        (i) => (i.core_function || DEFAULT_CORE_FUNCTION) === core
      );
      const total = coreIssues.length;
      const closed = coreIssues.filter((i) => i.status === 'Closed').length;
      const open = total - closed;
      const highOpen = coreIssues.filter(
        (i) => i.priority.includes('High') && i.status !== 'Closed'
      ).length;
      const percentClosed = total > 0 ? Math.round((closed / total) * 100) : 0;

      // Collect sub-module names from DB modules + defaults + issue data
      const subNameSet = new Set<string>(DEFAULT_MODULES_BY_CORE[core] || []);
      modules
        .filter((m) => (m.core_function || DEFAULT_CORE_FUNCTION) === core)
        .forEach((m) => {
          if (m.name) subNameSet.add(m.name);
        });
      coreIssues.forEach((i) => {
        if (i.module) subNameSet.add(i.module);
      });

      const subModules = Array.from(subNameSet)
        .map((modName) => {
          const modIssues = coreIssues.filter((i) => (i.module || 'Other') === modName);
          const mTotal = modIssues.length;
          const mClosed = modIssues.filter((i) => i.status === 'Closed').length;
          const mOpen = mTotal - mClosed;
          const mHighOpen = modIssues.filter(
            (i) => i.priority.includes('High') && i.status !== 'Closed'
          ).length;
          return {
            name: modName,
            total: mTotal,
            closed: mClosed,
            open: mOpen,
            highOpen: mHighOpen,
            percentClosed: mTotal > 0 ? Math.round((mClosed / mTotal) * 100) : 0,
          };
        })
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name);
        });

      return {
        core,
        meta: CORE_FUNCTION_META[core],
        total,
        closed,
        open,
        highOpen,
        percentClosed,
        subModules,
      };
    });
  }, [issues, modules]);

  const activeCore = useMemo<CoreFunctionType>(() => {
    if (manualCore) return manualCore;
    const withIssues = coreBreakdown.find((c) => c.total > 0);
    return withIssues ? withIssues.core : CORE_FUNCTIONS[0];
  }, [manualCore, coreBreakdown]);

  const activeCoreData = useMemo(() => {
    return coreBreakdown.find((c) => c.core === activeCore) || coreBreakdown[0];
  }, [coreBreakdown, activeCore]);

  // Breakdown by Team Member
  const teamBreakdown = useMemo(() => {
    const map: Record<string, { raised: number; closed: number; needInfoPending: number }> = {};

    // Ensure all defined team members are listed
    teamMembers.forEach((tm) => {
      map[tm.name] = { raised: 0, closed: 0, needInfoPending: 0 };
    });

    issues.forEach((item) => {
      if (item.raise_by) {
        if (!map[item.raise_by]) map[item.raise_by] = { raised: 0, closed: 0, needInfoPending: 0 };
        map[item.raise_by].raised++;
        if (item.status === 'Need Info') {
          map[item.raise_by].needInfoPending++;
        }
      }
      if (item.closed_by) {
        if (!map[item.closed_by]) map[item.closed_by] = { raised: 0, closed: 0, needInfoPending: 0 };
        map[item.closed_by].closed++;
      }
    });

    const teamHierarchy: Record<string, number> = {
      'Aoy': 1,
      'Kampon': 2,
      'Kraijate': 3,
      'Tukta': 4,
      'Nat': 5,
    };

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        raised: data.raised,
        closed: data.closed,
        needInfoPending: data.needInfoPending,
      }))
      .sort((a, b) => {
        const rankA = teamHierarchy[a.name] || 99;
        const rankB = teamHierarchy[b.name] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return b.raised - a.raised;
      });
  }, [issues, teamMembers]);

  // All High Priority Issues (Ordered by Issue No ascending)
  const urgentIssues = useMemo(() => {
    return issues
      .filter((i) => i.priority.includes('High') && i.status !== 'Closed')
      .sort((a, b) => {
        const numA = parseInt(a.log_id.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.log_id.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
  }, [issues]);

  // Issues where Dev requested Need Info (waiting on Case Owner / raise_by)
  const needInfoIssues = useMemo(() => {
    return issues
      .filter((i) => i.status === 'Need Info')
      .sort((a, b) => {
        const numA = parseInt(a.log_id.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.log_id.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
  }, [issues]);

  // Find latest issue by Issue Number descending (ISSUE_39 -> ISSUE_1)
  const latestIssue = useMemo(() => {
    if (!issues || issues.length === 0) return null;
    return (
      [...issues].sort((a, b) => {
        const numA = parseIssueNumber(a.log_id);
        const numB = parseIssueNumber(b.log_id);
        return numB - numA;
      })[0] || null
    );
  }, [issues]);

  const [showRecentModal, setShowRecentModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Hero Counter Command Card (Jiffy Frost Light CI Theme) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#F4F9FF] to-[#EBF4FF] text-[#0C2553] p-5 sm:p-6 shadow-sm border border-[#CFE4FF] space-y-4">
        {/* Ambient Soft Jiffy Glow Accents */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,134,255,0.14)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute left-1/4 -bottom-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,203,6,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Compact Top Bar: Brand + Live Pill + Quick Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#0C2553]">
              Issue Tracker New Pos Jiffy
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EFF7FF] text-[#044492] border border-[#B8DCFF]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0086FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0086FF]" />
              </span>
              VTec Pos Retail • Jiffy Project
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onGoToTable}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0086FF] hover:bg-[#0070DB] text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              ดูแยกตามกลุ่ม (Core → Module)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFilterByPriority('1.High')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#CF1818] border border-red-200 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-[#EB1C24] animate-pulse" />
              High Priority ({animHigh})
            </button>
          </div>
        </div>

        {/* Centerpiece Interactive Issue Counter Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: Giant Total + 5 Interactive Status Counter Tiles + Multi-Segment Stack Bar */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-3 bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-[#DCEBFF] shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* Total Counter Hero Spotlight */}
              <div
                onClick={onGoToTable}
                className="sm:col-span-3 p-3 rounded-xl bg-gradient-to-br from-[#EFF7FF] via-white to-[#FFFBEB]/70 border border-[#B8DCFF] hover:border-[#0086FF] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-[#044492] tracking-wider">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-[#0086FF] shrink-0" />
                    ปัญหาทั้งหมด
                  </span>
                </div>
                <div className="my-1.5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black tracking-tight text-[#0C2553] tabular-nums group-hover:scale-105 transition-transform origin-left">
                    {animTotal}
                  </span>
                  <span className="text-xs font-bold text-[#044492]">เรื่อง</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold">
                  <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    ค้าง {animRemaining}
                  </span>
                  <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    ปิด {animClosed}
                  </span>
                </div>
              </div>

              {/* 5 Status Counter Tiles */}
              <div className="sm:col-span-9 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  {
                    label: 'Open',
                    sub: 'รอแก้ไข',
                    count: animOpen,
                    raw: stats.open,
                    filterKey: 'Open',
                    dot: 'bg-amber-400',
                    ping: stats.open > 0,
                    blinkBeacon: false,
                    ring: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50',
                    numColor: 'text-amber-600',
                  },
                  {
                    label: 'Need Info',
                    sub: 'รอข้อมูล',
                    count: animNeedInfo,
                    raw: stats.needInfo,
                    filterKey: 'Need Info',
                    dot: 'bg-orange-500',
                    ping: stats.needInfo > 0,
                    blinkBeacon: stats.needInfo > 0,
                    ring: 'border-orange-300 hover:border-orange-400',
                    numColor: 'text-orange-600',
                  },
                  {
                    label: 'In Progress',
                    sub: 'กำลังแก้',
                    count: animInProgress,
                    raw: stats.inProgress,
                    filterKey: 'In Progress',
                    dot: 'bg-violet-500',
                    ping: false,
                    blinkBeacon: false,
                    ring: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/50',
                    numColor: 'text-violet-600',
                  },
                  {
                    label: 'Test',
                    sub: 'รอทดสอบ',
                    count: animTest,
                    raw: stats.test,
                    filterKey: 'Test',
                    dot: 'bg-sky-500',
                    ping: false,
                    blinkBeacon: false,
                    ring: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50/50',
                    numColor: 'text-sky-600',
                  },
                  {
                    label: 'Closed',
                    sub: 'ปิดแล้ว',
                    count: animClosed,
                    raw: stats.closed,
                    filterKey: 'Closed',
                    dot: 'bg-emerald-500',
                    ping: false,
                    blinkBeacon: false,
                    ring: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50',
                    numColor: 'text-emerald-600',
                  },
                ].map((tile) => {
                  const pct = stats.total > 0 ? Math.round((tile.raw / stats.total) * 100) : 0;
                  return (
                    <button
                      key={tile.label}
                      type="button"
                      onClick={() => onFilterByStatus(tile.filterKey)}
                      className={`text-left p-2.5 rounded-xl bg-slate-50/75 border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group ${tile.ring} ${
                        tile.blinkBeacon ? 'need-info-beacon' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-800 whitespace-nowrap">
                          <span className="relative flex h-2 w-2 shrink-0">
                            {tile.ping && (
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tile.dot} opacity-90`} />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${tile.dot}`} />
                          </span>
                          {tile.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between gap-1">
                        <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${tile.numColor}`}>
                          {tile.count}
                        </span>
                        {tile.blinkBeacon && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-orange-500 text-white animate-pulse">
                            รอตอบ
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span className="whitespace-nowrap">{tile.sub}</span>
                        <span className="text-slate-700 tabular-nums">{pct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi-Segment Live Proportion Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full bg-slate-100 p-0.5 border border-slate-200/90 overflow-hidden flex gap-0.5">
                {stats.total > 0 && (
                  <>
                    {stats.closed > 0 && (
                      <div
                        onClick={() => onFilterByStatus('Closed')}
                        style={{ width: `${(stats.closed / stats.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full cursor-pointer transition-all duration-700 hover:brightness-110"
                        title={`Closed: ${stats.closed} เรื่อง`}
                      />
                    )}
                    {stats.test > 0 && (
                      <div
                        onClick={() => onFilterByStatus('Test')}
                        style={{ width: `${(stats.test / stats.total) * 100}%` }}
                        className="h-full bg-sky-400 cursor-pointer transition-all duration-700 hover:brightness-110"
                        title={`Test: ${stats.test} เรื่อง`}
                      />
                    )}
                    {stats.inProgress > 0 && (
                      <div
                        onClick={() => onFilterByStatus('In Progress')}
                        style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                        className="h-full bg-violet-400 cursor-pointer transition-all duration-700 hover:brightness-110"
                        title={`In Progress: ${stats.inProgress} เรื่อง`}
                      />
                    )}
                    {stats.needInfo > 0 && (
                      <div
                        onClick={() => onFilterByStatus('Need Info')}
                        style={{ width: `${(stats.needInfo / stats.total) * 100}%` }}
                        className="h-full bg-orange-500 cursor-pointer transition-all duration-700 hover:brightness-110"
                        title={`Need Info (รอข้อมูลเพิ่ม): ${stats.needInfo} เรื่อง`}
                      />
                    )}
                    {stats.open > 0 && (
                      <div
                        onClick={() => onFilterByStatus('Open')}
                        style={{ width: `${(stats.open / stats.total) * 100}%` }}
                        className={`h-full bg-gradient-to-r from-amber-400 to-yellow-400 cursor-pointer transition-all duration-700 hover:brightness-110 ${
                          stats.closed === 0 && stats.test === 0 && stats.inProgress === 0 && stats.needInfo === 0
                            ? 'rounded-full'
                            : 'rounded-r-full'
                        }`}
                        title={`Open: ${stats.open} เรื่อง`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Resolution Ring & Priority Severity Counters */}
          <div className="lg:col-span-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-[#DCEBFF] shadow-2xs flex items-center justify-between gap-4">
            {/* Resolution Donut Ring */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <defs>
                    <linearGradient id="heroEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="48"
                    cy="48"
                    r="39"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-slate-200"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="39"
                    stroke="url(#heroEmerald)"
                    strokeWidth="9"
                    className="transition-all duration-1000 ease-out"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 39}
                    strokeDashoffset={
                      2 * Math.PI * 39 - (stats.resolutionRate / 100) * (2 * Math.PI * 39)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center leading-tight">
                  <span className="text-xl font-black text-[#0C2553] tabular-nums">{animRate}%</span>
                  <span className="text-[10px] text-emerald-700 font-bold">ปิดแล้ว</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-600 mt-1 tabular-nums">
                {animClosed} / {animTotal}
              </span>
            </div>

            {/* Priority Severity Counters Stack */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                แยกตามความสำคัญ
              </div>
              <button
                type="button"
                onClick={() => onFilterByPriority('1.High')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-50/90 hover:bg-red-100/80 border border-red-200 transition-colors text-xs"
              >
                <span className="flex items-center gap-1.5 font-bold text-[#CF1818]">
                  <Flame className="w-3.5 h-3.5 text-[#EB1C24]" />
                  1.High
                </span>
                <span className="font-black text-[#CF1818] tabular-nums">{animHigh}</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterByPriority('2.Medium')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-amber-100/80 border border-amber-200 transition-colors text-xs"
              >
                <span className="flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-[#FFCB06]" />
                  2.Medium
                </span>
                <span className="font-black text-amber-900 tabular-nums">{animMedium}</span>
              </button>
              <button
                type="button"
                onClick={() => onFilterByPriority('3.Low')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#EFF7FF] hover:bg-sky-100/80 border border-[#B8DCFF] transition-colors text-xs"
              >
                <span className="flex items-center gap-1.5 font-bold text-[#044492]">
                  <span className="w-2 h-2 rounded-full bg-[#0086FF]" />
                  3.Low
                </span>
                <span className="font-black text-[#0C2553] tabular-nums">{animLow}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom 5 Core Functions Live Counter Strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {coreBreakdown.map((item) => (
            <button
              key={item.core}
              type="button"
              onClick={() =>
                onSelectCoreFunction
                  ? onSelectCoreFunction(item.core)
                  : onGoToTable()
              }
              className={`px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                item.total > 0
                  ? 'bg-[#EFF7FF] hover:bg-[#DCEEFF] border-[#99CFFF] text-[#0C2553]'
                  : 'bg-white/85 hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-[10px] font-bold ${item.total > 0 ? 'text-[#0086FF]' : 'text-slate-400'}`}>
                  Core #{item.meta.order}
                </div>
                <div className="text-xs font-bold truncate">{item.meta.shortName}</div>
              </div>
              <span
                className={`text-sm font-black tabular-nums px-2 py-0.5 rounded-lg ${
                  item.total > 0
                    ? 'bg-[#0086FF] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Urgent / High Priority Section - COMPACT LIST VIEW BELOW HERO BANNER */}
      {urgentIssues.length > 0 && (
        <div className="bg-gradient-to-br from-red-50/90 via-rose-50/70 to-orange-50/50 rounded-2xl p-3.5 sm:p-4 border border-red-200/90 shadow-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-red-950 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-600 animate-pulse shrink-0" />
                High Priority Issues ที่ยังเปิดอยู่ (แสดงทั้งหมด เรียงตาม Issue No)
              </h3>
              <span className="hidden lg:inline text-[11px] text-red-700/80">
                • คลิกที่รายการเพื่อดูรายละเอียดหรืออัปเดต
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-red-700 bg-white border border-red-300 px-2.5 py-0.5 rounded-full">
                {urgentIssues.length} รายการ
              </span>
              <button
                type="button"
                onClick={() => setUrgentCollapsed((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 bg-white/80 hover:bg-white border border-red-200 px-2 py-0.5 rounded-full transition-colors"
              >
                {urgentCollapsed ? (
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

          {!urgentCollapsed && (
            <div className="bg-white rounded-xl border border-red-200/90 overflow-hidden">
              {/* Compact List Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-1.5 bg-red-100/60 border-b border-red-200/80 text-[10px] font-bold text-red-900 uppercase tracking-wider">
                <div className="col-span-2">Issue No</div>
                <div className="col-span-3">กลุ่มหลัก / กลุ่มย่อย</div>
                <div className="col-span-5">รายละเอียดปัญหา</div>
                <div className="col-span-1">ผู้แจ้ง</div>
                <div className="col-span-1 text-right">สถานะ</div>
              </div>

              <div className="divide-y divide-red-100/80">
                {urgentIssues.map((issue) => {
                  const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
                  const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
                  const statusColor =
                    issue.status === 'Need Info'
                      ? 'text-orange-800 bg-orange-50 border-orange-300'
                      : issue.status === 'In Progress'
                        ? 'text-purple-700 bg-purple-50 border-purple-200'
                        : issue.status === 'Test'
                          ? 'text-blue-700 bg-blue-50 border-blue-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200';

                  return (
                    <div
                      key={issue.id}
                      onClick={() => onSelectIssue(issue)}
                      className="px-3 py-1.5 hover:bg-red-50/70 transition-colors cursor-pointer group grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 items-center text-xs"
                    >
                      {/* Issue No + Mobile Status */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-1.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-[11px] font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
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
                          className="text-[13px] leading-snug text-slate-800 font-medium truncate group-hover:text-red-950"
                          title={issue.details}
                        >
                          {issue.details}
                        </p>
                      </div>

                      {/* Reporter */}
                      <div
                        className="md:col-span-1 flex items-center gap-1 text-[11px] text-slate-600 truncate"
                        title={issue.raise_date ? `แจ้งเมื่อ ${new Date(issue.raise_date).toLocaleDateString('th-TH')}` : ''}
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Action CTAs right below High Priority table: Latest Issue (Z-A) + View All Issues */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            {/* 1. ปุ่มดู Issue ที่เพิ่งเพิ่มล่าสุด (เรียง Z-A) */}
            {latestIssue && (
              <button
                type="button"
                onClick={() => setShowRecentModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-[#78350F] bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 hover:border-amber-400 shadow-xs transition-all group hover:scale-[1.02] active:scale-[0.98]"
                title={`คลิกเปิดดูรายการ Issue เรียงจากล่าสุด (${latestIssue.log_id}) ไล่ลงไป แบบ Z-A`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ดู Issue ที่เพิ่งเพิ่มล่าสุด (เรียง Z-A)</span>
                <span className="font-mono text-[11px] font-black text-amber-900 bg-white/90 px-1.5 py-0.5 rounded border border-amber-300/80 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  {latestIssue.log_id} ➔
                </span>
              </button>
            )}

            {/* 2. ปุ่มดู Issue ทั้งหมด */}
            <button
              type="button"
              onClick={onGoToPriorityList || onGoToTable}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold text-[#0C2553] bg-white hover:bg-[#EFF7FF] border border-blue-200 hover:border-[#0086FF] hover:text-[#044492] shadow-xs transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <ListOrdered className="w-4 h-4 text-[#0086FF]" />
              <span>ดู Issue ทั้งหมด ({stats.total} รายการ)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0086FF] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* 2B. Need Info Alert Section — Waiting for Case Opener Response */}
      {needInfoIssues.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50/95 via-amber-50/80 to-yellow-50/50 rounded-2xl p-3.5 sm:p-4 border border-orange-300/90 shadow-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-orange-950 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-orange-600 shrink-0" />
                เคสที่ Dev ขอข้อมูลเพิ่ม — รอผู้เปิด Case ตอบกลับ (Need Info)
              </h3>
              <span className="hidden lg:inline text-[11px] text-orange-800/85 font-medium">
                • ผู้รับผิดชอบยังคงเป็นคนเปิด Case เพื่อตรวจสอบ/ตอบกลับ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-orange-800 bg-white px-2.5 py-0.5 rounded-full border border-orange-300">
                รอ Action {needInfoIssues.length} รายการ
              </span>
              <button
                type="button"
                onClick={() => onFilterByStatus('Need Info')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-white hover:bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full transition-colors"
              >
                กรองดูทั้งหมด <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-orange-200/90 overflow-hidden divide-y divide-orange-100">
            {needInfoIssues.map((issue) => {
              const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
              const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
              const latestInfo = getLatestTimelineInfo(issue);

              return (
                <div
                  key={issue.id}
                  onClick={() => onSelectIssue(issue)}
                  className="px-3.5 py-2.5 hover:bg-orange-50/70 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs border-l-4 border-l-orange-500"
                >
                  <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 group-hover:bg-orange-600 group-hover:text-white transition-colors shrink-0">
                      {issue.log_id}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}>
                      {coreMeta.shortName}
                    </span>
                    <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {issue.module}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {latestInfo.latestMessage || issue.details}
                      </p>
                      {latestInfo.latestAuthor && (
                        <p className="text-[11px] text-orange-700 truncate">
                          ถามโดย <b>{latestInfo.latestAuthor}</b>
                          {latestInfo.latestTimestamp ? ` • ${latestInfo.latestTimestamp}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pl-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      <User className="w-3 h-3 text-indigo-600" />
                      รอ {issue.raise_by} ตอบกลับ
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-orange-500 group-hover:bg-orange-600 px-2.5 py-1 rounded-lg shadow-2xs transition-colors">
                      <Send className="w-3 h-3" />
                      ตอบข้อมูลเพิ่ม
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Issues */}
        <div
          onClick={() => onFilterByStatus('Open')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-yellow-300 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-700">Open Issues</span>
            <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.open}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">ปัญหาที่รอเข้าคิวแก้ไข</p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.open / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* In Progress & Test */}
        <div
          onClick={() => onFilterByStatus('Test')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">In Test / Progress</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.inProgress + stats.test}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">กำลังแก้ไขหรือพร้อมให้ QA ทดสอบ</p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? ((stats.inProgress + stats.test) / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Closed Issues */}
        <div
          onClick={() => onFilterByStatus('Closed')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Closed / Resolved</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.closed}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">ทดสอบผ่านและปิดงานสำเร็จ</p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.resolutionRate}%` }}
            />
          </div>
        </div>

        {/* High Priority Alerts */}
        <div
          onClick={() => onFilterByPriority('1.High')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">High Priority</span>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600">{stats.high}</span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">ความสำคัญระดับสูง ต้องเร่งแก้</p>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.high / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Team Collaboration - HORIZONTAL ROW */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#DCEBFF] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0C2553] flex items-center gap-2">
              <User className="w-4 h-4 text-[#0086FF]" />
              ทีมงาน & ผู้รับผิดชอบ (Team)
            </h3>
            <p className="text-xs text-slate-500">
              จำนวน Issue ที่แจ้งและปิดงานโดยสมาชิกทีมแต่ละท่าน (คลิกที่การ์ดเพื่อกรองดูงานของสมาชิก)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">{teamBreakdown.length} คน</span>
            <button
              onClick={onGoToTable}
              className="text-xs text-[#044492] hover:text-[#0086FF] font-semibold inline-flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {teamBreakdown.map((tm) => (
            <div
              key={tm.name}
              onClick={() => onFilterByReporter(tm.name)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 hover:shadow-sm ${
                tm.name === 'Aoy'
                  ? 'bg-gradient-to-br from-[#EFF7FF] to-[#FFFBEB]/80 border-[#B8DCFF] hover:border-[#0086FF]'
                  : tm.name === 'Kampon'
                  ? 'bg-gradient-to-br from-[#EFF7FF] to-[#F0F7FF] border-[#B8DCFF] hover:border-[#0086FF]'
                  : 'bg-slate-50/60 hover:bg-[#F4F9FF] border-slate-200/80 hover:border-[#B8DCFF]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    tm.name === 'Aoy'
                      ? 'bg-[#0C2553] text-[#FFCB06] shadow-sm shadow-[#0C2553]/25'
                      : tm.name === 'Kampon'
                      ? 'bg-[#0086FF] text-white shadow-sm shadow-[#0086FF]/25'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tm.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 flex flex-wrap items-center gap-1">
                    <span className="truncate">{tm.name}</span>
                    {tm.name === 'Aoy' && (
                      <span className="text-[9px] bg-[#FFCB06]/25 text-[#0C2553] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        Project Lead
                      </span>
                    )}
                    {tm.name === 'Kampon' && (
                      <span className="text-[9px] bg-[#E0F2FE] text-[#044492] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        QA Lead
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {teamMembers.find((m) => m.name === tm.name)?.role || 'Team Member'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-200/60 text-xs">
                <span className="font-bold text-[#044492] bg-white px-2 py-0.5 rounded-md border border-[#DCEBFF]">
                  {tm.raised} แจ้ง
                </span>
                {tm.needInfoPending > 0 && (
                  <span
                    className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200"
                    title={`มี ${tm.needInfoPending} เคสที่ Dev ขอข้อมูลเพิ่ม`}
                  >
                    รอตอบ {tm.needInfoPending}
                  </span>
                )}
                <span className="font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-100">
                  {tm.closed} ปิด
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-Width Core Function & Sub-Module Breakdown (Supports Bar or Pie Chart, 4 per row) */}
      <div className="bg-white rounded-2xl p-6 border border-[#DCEBFF] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0C2553] flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#0086FF]" />
              การกระจายของปัญหาตามกลุ่มหลัก (5 Core Functions → กลุ่มย่อย)
            </h3>
            <p className="text-xs text-slate-500">
              เลือกกลุ่มหลักด้านล่างเพื่อดูกลุ่มย่อย และคลิกที่กลุ่มย่อยเพื่อเจาะลึกดูรายการปัญหา
            </p>
          </div>
          <span className="text-xs font-semibold text-[#044492] bg-[#EFF7FF] border border-[#CFE4FF] px-2.5 py-1 rounded-lg self-start sm:self-auto">
            5 Core Functions
          </span>
        </div>

        {/* 5 Core Function Selector Cards (Horizontal 5 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {coreBreakdown.map((item) => {
            const isSelected = item.core === activeCore;
            return (
              <button
                key={item.core}
                type="button"
                onClick={() => setManualCore(item.core)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#EFF7FF] border-[#0086FF] ring-2 ring-[#0086FF]/20 shadow-sm'
                    : 'bg-slate-50/60 hover:bg-[#F4F9FF] border-slate-200 hover:border-[#B8DCFF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500">
                    #{item.meta.order}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.highOpen > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        {item.highOpen} High
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                        item.total > 0
                          ? `${item.meta.badgeBg} ${item.meta.badgeText} ${item.meta.badgeBorder}`
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {item.total} เรื่อง
                    </span>
                  </div>
                </div>
                <p className={`text-xs font-extrabold truncate ${isSelected ? 'text-[#0C2553]' : 'text-slate-800'}`}>
                  {item.core}
                </p>
                <div className="mt-2 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden flex">
                  {item.total > 0 ? (
                    <>
                      {item.closed > 0 && (
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${item.percentClosed}%` }}
                        />
                      )}
                      {item.open > 0 && (
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${100 - item.percentClosed}%` }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Core Function Header & Sub-modules (Bar or Pie Toggle, 4 per row) */}
        {activeCoreData && (
          <div className="pt-2 border-t border-slate-100 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F9FF] px-3.5 py-2.5 rounded-xl border border-[#DCEBFF]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#0086FF] shrink-0" />
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    กลุ่มย่อยใน {activeCoreData.core} ({activeCoreData.subModules.length} โมดูล)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activeCoreData.meta.description} • ปิดแล้ว {activeCoreData.closed} / ค้าง {activeCoreData.open}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bar / Pie Chart View Toggle */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#E5F1FF]/80 border border-[#CFE4FF]">
                  <button
                    type="button"
                    onClick={() => setModuleChartMode('bar')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      moduleChartMode === 'bar'
                        ? 'bg-white text-[#044492] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setModuleChartMode('pie')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      moduleChartMode === 'pie'
                        ? 'bg-white text-[#044492] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    กราฟวงกลม
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onSelectCoreFunction
                      ? onSelectCoreFunction(activeCoreData.core)
                      : onGoToTable()
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#044492] hover:text-[#0C2553] bg-white hover:bg-[#EFF7FF] px-3 py-1.5 rounded-lg border border-[#B8DCFF] shadow-2xs transition-colors"
                >
                  เปิดดูกลุ่มนี้ทั้งหมด
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Sub-modules with issues — 4 per row grid */}
            {activeCoreData.subModules.filter((m) => m.total > 0).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {activeCoreData.subModules
                  .filter((m) => m.total > 0)
                  .map((item) => {
                    const closedPercent = item.percentClosed;
                    const openPercent = 100 - closedPercent;
                    const radius = 34;
                    const circumference = 2 * Math.PI * radius;
                    const closedStrokeDash = (closedPercent / 100) * circumference;

                    if (moduleChartMode === 'pie') {
                      return (
                        <div
                          key={item.name}
                          onClick={() => onFilterByModule(item.name, activeCoreData.core)}
                          className="group p-4 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 transition-all cursor-pointer shadow-xs hover:shadow flex flex-col justify-between items-center gap-3"
                        >
                          <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm text-slate-900 font-extrabold group-hover:text-indigo-600 transition-colors truncate">
                              {item.name}
                            </span>
                            {closedPercent === 100 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                ✓ 100%
                              </span>
                            ) : closedPercent > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
                                {closedPercent}%
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                รอ {item.open}
                              </span>
                            )}
                          </div>

                          {/* SVG Donut / Pie Chart */}
                          <div className="relative inline-flex items-center justify-center my-0.5">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 88 88">
                              {/* Open segment track (Amber/Orange) */}
                              <circle
                                cx="44"
                                cy="44"
                                r={radius}
                                fill="transparent"
                                stroke={item.open > 0 ? '#f59e0b' : '#10b981'}
                                strokeWidth="11"
                                className="opacity-85"
                              />
                              {/* Closed slice (Emerald) */}
                              {closedPercent > 0 && (
                                <circle
                                  cx="44"
                                  cy="44"
                                  r={radius}
                                  fill="transparent"
                                  stroke="#10b981"
                                  strokeWidth="11"
                                  strokeDasharray={`${closedStrokeDash} ${circumference}`}
                                  strokeLinecap={closedPercent === 100 ? 'round' : 'butt'}
                                  className="transition-all duration-700 ease-out"
                                />
                              )}
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center leading-tight">
                              <span className="text-base font-black text-slate-900">{closedPercent}%</span>
                              <span className="text-[10px] font-bold text-slate-500">{item.total} เรื่อง</span>
                            </div>
                          </div>

                          <div className="w-full flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/70">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              ปิด {item.closed}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              ค้าง {item.open}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Bar Mode Card (4 per row)
                    return (
                      <div
                        key={item.name}
                        onClick={() => onFilterByModule(item.name, activeCoreData.core)}
                        className="group p-3.5 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 transition-all cursor-pointer shadow-xs hover:shadow flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                              <span className="text-xs sm:text-sm text-slate-900 font-extrabold group-hover:text-indigo-600 transition-colors truncate">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                              {item.total}
                            </span>
                          </div>

                          <div>
                            {closedPercent === 100 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ ปิดครบ 100%
                              </span>
                            ) : closedPercent > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                สำเร็จ {closedPercent}%
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                รอแก้ไข {item.open}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="relative w-full bg-slate-200/80 rounded-full h-3 p-0.5 overflow-hidden flex shadow-inner">
                            {item.closed > 0 && (
                              <div
                                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-l-full transition-all duration-700 shadow-sm group-hover:brightness-105"
                                style={{ width: `${closedPercent}%` }}
                                title={`ปิดแล้ว: ${item.closed} (${closedPercent}%)`}
                              />
                            )}
                            {item.open > 0 && (
                              <div
                                className={`bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 h-full transition-all duration-700 shadow-sm group-hover:brightness-105 ${
                                  item.closed === 0 ? 'rounded-full' : 'rounded-r-full'
                                }`}
                                style={{ width: `${openPercent}%` }}
                                title={`ค้าง: ${item.open} (${openPercent}%)`}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>
                              <b className="text-emerald-600">{item.closed}</b> ปิด
                            </span>
                            <span>
                              <b className="text-amber-600">{item.open}</b> ค้าง
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  ยังไม่มีรายการปัญหาในกลุ่ม {activeCoreData.core}
                </p>
                <p className="text-[11px] text-slate-400">
                  คลิกเลือกกลุ่มย่อยด้านล่างเพื่อเข้าดูหรือเพิ่มรายการใหม่ได้ทันที
                </p>
              </div>
            )}

            {/* Empty / Available sub-modules chips */}
            {activeCoreData.subModules.filter((m) => m.total === 0).length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  กลุ่มย่อยที่ยังไม่มีปัญหา ({activeCoreData.subModules.filter((m) => m.total === 0).length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCoreData.subModules
                    .filter((m) => m.total === 0)
                    .map((m) => (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => onFilterByModule(m.name, activeCoreData.core)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-slate-400" />
                        {m.name}
                        <span className="text-[10px] text-slate-400">(0)</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Modal: รายการ Issue เรียงจากเลขล่าสุดลงไป (Z-A) */}
      <RecentIssuesModal
        isOpen={showRecentModal}
        onClose={() => setShowRecentModal(false)}
        issues={issues}
        onSelectIssue={onSelectIssue}
        onGoToPriorityList={onGoToPriorityList}
        onGoToTable={onGoToTable}
      />
    </div>
  );
}
