'use client';

import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  User,
  ArrowRight,
  Flame,
  AlertTriangle,
  Code2,
  Tag,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  Requirement,
  TeamMember,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
} from '@/types';
import { getStatusBadgeClass } from '@/lib/status';

interface DashboardViewProps {
  requirements: Requirement[];
  teamMembers: TeamMember[];
  onSelectRequirement: (requirement: Requirement) => void;
  onFilterByStatus: (status: string) => void;
  onFilterByPriority: (priority: string) => void;
  onFilterByCore: (core: string) => void;
  onGoToKanban: () => void;
  onGoToTable: () => void;
}

export default function DashboardView({
  requirements,
  teamMembers,
  onSelectRequirement,
  onFilterByStatus,
  onFilterByPriority,
  onFilterByCore,
  onGoToKanban,
  onGoToTable,
}: DashboardViewProps) {
  // Stats
  const total = requirements.length;
  const draftCount = requirements.filter((r) => r.status === 'Draft').length;
  const reviewCount = requirements.filter((r) => r.status === 'In Review').length;
  const inDevCount = requirements.filter((r) => r.status === 'In Development').length;
  const testingCount = requirements.filter((r) => r.status === 'Testing').length;
  const doneCount = requirements.filter((r) => r.status === 'Done').length;

  const highCount = requirements.filter((r) => r.priority.includes('High')).length;
  const mediumCount = requirements.filter((r) => r.priority.includes('Medium')).length;
  const lowCount = requirements.filter((r) => r.priority.includes('Low')).length;

  // Completion rate
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Dev workload
  const devWorkload = useMemo(() => {
    const map: Record<string, { total: number; inDev: number; done: number }> = {};
    requirements.forEach((r) => {
      const dev = r.dev_assigned || 'ยังไม่กำหนด Dev';
      if (!map[dev]) map[dev] = { total: 0, inDev: 0, done: 0 };
      map[dev].total += 1;
      if (r.status === 'In Development') map[dev].inDev += 1;
      if (r.status === 'Done') map[dev].done += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [requirements]);

  // Recent 5 requirements
  const recentRequirements = useMemo(() => {
    return [...requirements]
      .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())
      .slice(0, 5);
  }, [requirements]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total */}
        <div
          onClick={onGoToTable}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">ทั้งหมด</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">
            {total}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">รายการทั้งหมด</span>
        </div>

        {/* Draft */}
        <div
          onClick={() => onFilterByStatus('Draft')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Draft</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{draftCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">ร่างข้อกำหนด</span>
        </div>

        {/* In Review */}
        <div
          onClick={() => onFilterByStatus('In Review')}
          className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">{reviewCount}</div>
          <span className="text-[11px] text-amber-700/80 mt-1 block">รอตรวจทาน</span>
        </div>

        {/* In Development */}
        <div
          onClick={() => onFilterByStatus('In Development')}
          className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Dev</span>
            <Code2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900">{inDevCount}</div>
          <span className="text-[11px] text-indigo-700/80 mt-1 block">Dev กำลังทำ</span>
        </div>

        {/* Testing */}
        <div
          onClick={() => onFilterByStatus('Testing')}
          className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/30 shadow-sm hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-sky-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Testing</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-900">{testingCount}</div>
          <span className="text-[11px] text-sky-700/80 mt-1 block">กำลังทดสอบ</span>
        </div>

        {/* Done */}
        <div
          onClick={() => onFilterByStatus('Done')}
          className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{doneCount}</div>
          <span className="text-[11px] text-emerald-700/80 mt-1 block">{completionRate}% สำเร็จ</span>
        </div>
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Core Functions Breakdown & Dev Workload (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Functions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                ความต้องการแยกตาม Core Function (ระบบหลัก)
              </h3>
              <button
                type="button"
                onClick={onGoToKanban}
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                ดู Kanban Board <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CORE_FUNCTIONS.map((cf) => {
                const meta = CORE_FUNCTION_META[cf];
                const count = requirements.filter(
                  (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === cf
                ).length;
                const done = requirements.filter(
                  (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === cf && r.status === 'Done'
                ).length;
                const pct = count > 0 ? Math.round((done / count) * 100) : 0;

                return (
                  <div
                    key={cf}
                    onClick={() => onFilterByCore(cf)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-slate-50/60 transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                        {cf}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {count} รายการ
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: meta.accentHex }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>เสร็จแล้ว {done} รายการ</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dev Workload */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              การมอบหมายงาน Dev (Dev Workload)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {devWorkload.map(([devName, data]) => (
                <div
                  key={devName}
                  className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {devName}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {data.total}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="text-indigo-600 font-medium">กำลังทำ: {data.inDev}</span>
                    <span className="text-emerald-600 font-medium">เสร็จ: {data.done}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Priority Distribution & Recent Requirements (1 Col) */}
        <div className="space-y-6">
          {/* Priority */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              สัดส่วนความเร่งด่วน (Priority)
            </h3>

            <div className="space-y-2.5">
              <div
                onClick={() => onFilterByPriority('1.High')}
                className="p-3 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-950">1.High (สำคัญมาก)</span>
                </div>
                <span className="text-xs font-bold text-red-700 bg-white px-2.5 py-0.5 rounded-full border border-red-200">
                  {highCount}
                </span>
              </div>

              <div
                onClick={() => onFilterByPriority('2.Medium')}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">2.Medium (ปานกลาง)</span>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-200">
                  {mediumCount}
                </span>
              </div>

              <div
                onClick={() => onFilterByPriority('3.Low')}
                className="p-3 rounded-xl border border-sky-200 bg-sky-50/40 hover:bg-sky-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-sky-950">3.Low (ต่ำ/ทั่วไป)</span>
                </div>
                <span className="text-xs font-bold text-sky-700 bg-white px-2.5 py-0.5 rounded-full border border-sky-200">
                  {lowCount}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Requirements */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Requirement ล่าสุด
            </h3>

            <div className="divide-y divide-slate-100">
              {recentRequirements.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRequirement(r)}
                  className="py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-sky-700">
                      {r.req_id}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-medium text-slate-800 group-hover:text-sky-600 transition-colors line-clamp-1">
                    {r.title}
                  </h5>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{r.module}</span>
                    <span>{r.requested_by}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
