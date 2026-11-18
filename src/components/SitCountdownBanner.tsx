'use client';

import React, { useMemo } from 'react';
import type { Requirement } from '@/types';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface SitCountdownBannerProps {
  requirements: Requirement[];
}

// Project window. Override per deployment with NEXT_PUBLIC_PROJECT_START / NEXT_PUBLIC_SIT_DATE (YYYY-MM-DD).
const START_DATE_STR = process.env.NEXT_PUBLIC_PROJECT_START || '2026-10-19';
const SIT_DATE_STR = process.env.NEXT_PUBLIC_SIT_DATE || '2027-01-04';

function parseUtcDayMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function diffDays(fromYmd: string, toYmd: string): number {
  return Math.round((parseUtcDayMs(toYmd) - parseUtcDayMs(fromYmd)) / 86_400_000);
}

function getBangkokTodayYmd(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

type RiskLevel = 'green' | 'yellow' | 'red';

export default function SitCountdownBanner({ requirements }: SitCountdownBannerProps) {
  const dataList = requirements;

  const timeline = useMemo(() => {
    const totalDays = Math.max(1, diffDays(START_DATE_STR, SIT_DATE_STR)); // 77 days
    const todayYmd = getBangkokTodayYmd();
    const rawElapsed = diffDays(START_DATE_STR, todayYmd);
    const elapsedDays = Math.max(0, Math.min(totalDays, rawElapsed));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const timePct = Math.round((elapsedDays / totalDays) * 100);

    const totalReqs = dataList.length;
    const doneReqs = dataList.filter((i) => i.status === 'Done').length;
    const pendingReqs = totalReqs - doneReqs;
    const highPending = dataList.filter(
      (i) => i.priority === '1.High' && i.status !== 'Done'
    ).length;
    const completionPct =
      totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0;

    // 3-Zone breakdown across 77-day pre-SIT timeline
    const greenZonePct = (42 / totalDays) * 100;
    const yellowZonePct = (20 / totalDays) * 100;
    const redZonePct = Math.max(0, 100 - greenZonePct - yellowZonePct);

    let overallRisk: RiskLevel = 'green';
    if (
      remainingDays <= 15 ||
      (remainingDays <= 35 && (highPending >= 5 || timePct - completionPct >= 30))
    ) {
      overallRisk = 'red';
    } else if (
      remainingDays <= 35 ||
      highPending >= 4 ||
      (timePct - completionPct >= 20 && pendingReqs > 0)
    ) {
      overallRisk = 'yellow';
    }

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      timePct,
      greenZonePct,
      yellowZonePct,
      redZonePct,
      overallRisk,
      totalReqs,
      doneReqs,
      pendingReqs,
      highPending,
      completionPct,
    };
  }, [dataList]);

  const riskBadge = useMemo(() => {
    switch (timeline.overallRisk) {
      case 'red':
        return {
          title: 'วิกฤต • ต้องเร่งด่วน',
          desc: 'เหลือเวลาไม่มาก หรือมี High Priority คงค้างสูง',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/40',
          bgBadge: 'bg-rose-500/10',
          icon: AlertTriangle,
          ledActive: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]',
        };
      case 'yellow':
        return {
          title: 'เฝ้าระวัง • ต้องเร่งสปีด',
          desc: 'อัตราการเสร็จช้ากว่าเวลาที่ผ่าน หรือ High Priority ค้างปานกลาง',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/40',
          bgBadge: 'bg-amber-500/10',
          icon: Clock,
          ledActive: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]',
        };
      case 'green':
      default:
        return {
          title: 'ปกติ • ระยะปลอดภัย',
          desc: 'เวลาและงานคงค้างอยู่ในเกณฑ์ควบคุมได้',
          textColor: 'text-emerald-300',
          borderColor: 'border-emerald-500/40',
          bgBadge: 'bg-emerald-500/10',
          icon: ShieldCheck,
          ledActive: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]',
        };
    }
  }, [timeline.overallRisk]);

  const RiskIcon = riskBadge.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#06142e] via-[#081a3d] to-[#041126] border border-[#1e3a6a] text-white shadow-lg">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />

      <div className="relative p-4 sm:p-5">
        {/* Top Header Row */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-3 border-b border-white/10">
          <div className="min-w-0 xl:flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                SIT Countdown Readiness
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300/90 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                <Calendar className="w-3 h-3" />
                19 ต.ค. 69 ➔ 4 ม.ค. 70 (รวม {timeline.totalDays} วัน)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ระยะเวลาก่อนเข้าทดสอบระบบ SIT (วันที่ 4 มกราคม 2570)</span>
            </h2>
            <p className="text-xs text-blue-200/70 mt-0.5">
              • เปรียบเทียบเวลาที่เดินไป ({timeline.timePct}%) กับอัตราความคืบหน้า Requirement เสร็จสมบูรณ์ ({timeline.completionPct}%)
            </p>
          </div>

          {/* Right Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1.6fr] gap-2 xl:w-[680px] shrink-0">
            {/* Elapsed */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <div className="text-[11px] text-blue-200/70 leading-none">ผ่านมาแล้ว</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {timeline.elapsedDays} <span className="text-xs font-normal text-blue-200/70">วัน ({timeline.timePct}%)</span>
                </div>
              </div>
            </div>

            {/* Remaining */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <div className="text-[11px] text-cyan-200/70 leading-none">เหลือก่อนเข้า SIT</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {timeline.remainingDays} <span className="text-xs font-normal text-cyan-200/70">วัน</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className={`col-span-2 sm:col-span-1 rounded-xl px-3 py-2 border flex items-center gap-2.5 ${riskBadge.bgBadge} ${riskBadge.borderColor}`}>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <RiskIcon className={`w-4 h-4 ${riskBadge.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-bold truncate ${riskBadge.textColor}`}>
                    {riskBadge.title}
                  </span>
                  {/* Visual LED status light */}
                  <span className="flex items-center gap-0.5">
                    <span className={`w-2 h-2 rounded-full ${timeline.overallRisk === 'green' ? riskBadge.ledActive : 'bg-white/10'}`} />
                    <span className={`w-2 h-2 rounded-full ${timeline.overallRisk === 'yellow' ? riskBadge.ledActive : 'bg-white/10'}`} />
                    <span className={`w-2 h-2 rounded-full ${timeline.overallRisk === 'red' ? riskBadge.ledActive : 'bg-white/10'}`} />
                  </span>
                </div>
                <div className="text-[11px] text-white/60 leading-snug line-clamp-2 mt-0.5">
                  {riskBadge.desc}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Zone Timeline Progress Bar */}
        <div className="mt-3.5 pt-1">
          {/* Zone header labels */}
          <div className="flex justify-between items-center text-[11px] font-medium text-blue-200/70 mb-1.5 px-0.5">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              โซนเขียว: ปลอดภัย (วันที่ 1–42)
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              โซนเหลือง: เร่งพัฒนา
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              โซนแดง: 15 วันท้าย
            </span>
          </div>

          {/* Bar track with 3 zones */}
          <div className="relative w-full h-7 rounded-xl bg-slate-900/80 border border-white/15 overflow-hidden p-0.5 flex">
            {/* Zone 1: Green */}
            <div
              style={{ width: `${timeline.greenZonePct}%` }}
              className="h-full bg-emerald-950/40 border-r border-emerald-500/20 relative"
            />
            {/* Zone 2: Yellow */}
            <div
              style={{ width: `${timeline.yellowZonePct}%` }}
              className="h-full bg-amber-950/40 border-r border-amber-500/20 relative"
            />
            {/* Zone 3: Red */}
            <div
              style={{ width: `${timeline.redZonePct}%` }}
              className="h-full bg-rose-950/40 relative flex items-center justify-end pr-2 text-[11px] font-semibold text-rose-300/80"
            >
              <span className="truncate">เป้าหมาย SIT: 4 ม.ค. 70 (คงเหลือ {timeline.remainingDays} วัน)</span>
            </div>

            {/* Actual Elapsed Progress Fill */}
            <div
              style={{ width: `${Math.min(100, Math.max(2, timeline.timePct))}%` }}
              className="absolute top-0.5 bottom-0.5 left-0.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-md flex items-center justify-end pr-2 transition-all duration-500"
            >
              <span className="text-[11px] font-bold text-slate-950 px-1.5 py-0.5 bg-white/90 rounded shadow-xs truncate">
                Day {timeline.elapsedDays} / {timeline.totalDays} ({timeline.timePct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Completion rate */}
            <div className="flex items-center gap-1.5 text-blue-100 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>ความคืบหน้า Requirement:</span>
              <span className="font-bold text-white">
                {timeline.doneReqs}/{timeline.totalReqs} เรื่อง ({timeline.completionPct}%)
              </span>
            </div>

            {/* High priority pending */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-200">
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>High Priority ค้าง:</span>
              <span className="font-bold text-rose-300">{timeline.highPending} เรื่อง</span>
            </div>

            {/* Total pending */}
            <div className="flex items-center gap-1.5 text-blue-200/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
              <span>คงค้างทั้งหมด:</span>
              <span className="font-semibold text-white">{timeline.pendingReqs} เรื่อง</span>
            </div>
          </div>

          {/* Color legend guide */}
          <div className="flex items-center gap-3 text-[11px] text-blue-200/60">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              เขียว &gt;35 วัน
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              เหลือง 15–35 วัน
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              แดง ≤15 วัน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
