'use client';

import React, { useMemo } from 'react';
import type { Issue } from '@/types';
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
  issues: Issue[];
}

const START_DATE_STR = '2026-10-19'; // 19 ต.ค. 2569
const SIT_DATE_STR = '2027-01-04'; // 4 ม.ค. 2570

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

export default function SitCountdownBanner({ issues }: SitCountdownBannerProps) {
  const timeline = useMemo(() => {
    const totalDays = Math.max(1, diffDays(START_DATE_STR, SIT_DATE_STR)); // 77 days
    const todayYmd = getBangkokTodayYmd();
    const rawElapsed = diffDays(START_DATE_STR, todayYmd);
    const elapsedDays = Math.max(0, Math.min(totalDays, rawElapsed));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const timePct = Math.round((elapsedDays / totalDays) * 100);

    const totalIssues = issues.length;
    const closedIssues = issues.filter((i) => i.status === 'Closed').length;
    const openIssues = totalIssues - closedIssues;
    const highOpen = issues.filter(
      (i) => i.priority === '1.High' && i.status !== 'Closed'
    ).length;
    const resolutionPct =
      totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0;

    // 3-Zone breakdown across 77-day pre-SIT timeline
    const greenZonePct = (42 / totalDays) * 100;
    const yellowZonePct = (20 / totalDays) * 100;
    const redZonePct = Math.max(0, 100 - greenZonePct - yellowZonePct);

    let overallRisk: RiskLevel = 'green';
    if (
      remainingDays <= 15 ||
      (remainingDays <= 35 && (highOpen >= 5 || timePct - resolutionPct >= 30))
    ) {
      overallRisk = 'red';
    } else if (
      remainingDays <= 35 ||
      highOpen >= 4 ||
      (timePct - resolutionPct >= 20 && openIssues > 0)
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
      totalIssues,
      closedIssues,
      openIssues,
      highOpen,
      resolutionPct,
    };
  }, [issues]);

  const riskConfig = {
    green: {
      glowClass: 'sit-glow-green',
      borderClass: 'border-[#164E9E]/60 border-l-emerald-400',
      pillClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35',
      countdownBox: 'bg-emerald-500/15 border-emerald-400/35',
      countdownNum: 'text-emerald-300',
      iconTone: 'text-emerald-300',
      fillGradient: 'from-emerald-400 to-teal-400',
      dotBorder: 'border-emerald-600',
      label: 'ปกติ • ระยะปลอดภัย',
      subLabel: 'เวลาและงานคงค้างอยู่ในเกณฑ์ควบคุมได้',
      Icon: ShieldCheck,
    },
    yellow: {
      glowClass: 'sit-glow-yellow',
      borderClass: 'border-[#164E9E]/60 border-l-[#FFCB06]',
      pillClass: 'bg-[#FFCB06]/15 text-amber-100 border-[#FFCB06]/45',
      countdownBox: 'bg-[#FFCB06]/15 border-[#FFCB06]/45',
      countdownNum: 'text-[#FFCB06]',
      iconTone: 'text-[#FFCB06]',
      fillGradient: 'from-emerald-400 via-[#FFCB06] to-amber-300',
      dotBorder: 'border-amber-500',
      label: 'เฝ้าระวัง • เร่งปิดงาน',
      subLabel: `มี High Priority ค้าง ${timeline.highOpen} เรื่อง — ควรเร่งแก้ไขก่อนเข้าช่วงท้าย`,
      Icon: AlertTriangle,
    },
    red: {
      glowClass: 'sit-glow-red',
      borderClass: 'border-[#164E9E]/60 border-l-[#EB1C24]',
      pillClass: 'bg-[#EB1C24]/20 text-rose-100 border-[#EB1C24]/50',
      countdownBox: 'bg-[#EB1C24]/20 border-[#EB1C24]/50',
      countdownNum: 'text-rose-300',
      iconTone: 'text-rose-300',
      fillGradient: 'from-emerald-400 via-[#FFCB06] to-[#EB1C24]',
      dotBorder: 'border-rose-600',
      label: 'เร่งด่วน • เข้าช่วงวิกฤต SIT',
      subLabel: `เหลือเวลาจำกัด ${timeline.remainingDays} วัน ต้องเคลียร์เคสสำคัญทันที`,
      Icon: Flame,
    },
  }[timeline.overallRisk];

  const RiskIcon = riskConfig.Icon;

  return (
    <section
      aria-label="SIT Readiness Countdown"
      className={`relative overflow-hidden rounded-2xl border border-l-4 ${riskConfig.borderClass} ${riskConfig.glowClass} bg-gradient-to-br from-[#081A3A] via-[#0C2553] to-[#044492] text-white px-4 py-3.5 sm:px-5 sm:py-4 transition-all`}
    >
      {/* Subtle Jiffy Blue & Yellow Ambient Accent (radial gradient without blur filter overhead) */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(0,134,255,0.22)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/4 -bottom-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,203,6,0.14)_0%,transparent_70%)]" />

      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Top Row: Title + Compact KPI Pills + Soft Alert & 3-Light Indicator */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Left: SIT Title & Period */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0086FF]/20 text-sky-200 border border-[#0086FF]/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFCB06] opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFCB06]" />
                </span>
                SIT Countdown Readiness
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-100 bg-white/[0.08] border border-white/15 px-2.5 py-0.5 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-[#FFCB06] shrink-0" />
                19 ต.ค. 69 ➔ <strong className="text-white">4 ม.ค. 70</strong> (รวม {timeline.totalDays} วัน)
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-[#FFCB06] shrink-0" />
                ระยะเวลาก่อนเข้าทดสอบระบบ SIT (วันที่ 4 มกราคม 2570)
              </h2>
              <span className="text-xs text-slate-300/90">
                • เปรียบเทียบเวลาที่เดินไปกับอัตราการปิดปัญหา ({timeline.resolutionPct}%)
              </span>
            </div>
          </div>

          {/* Right: Crisp KPI Cards + Risk Alert Box */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2 shrink-0">
            {/* Elapsed Days Pill */}
            <div className="bg-white/[0.07] border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/35 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-sky-300" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-300 leading-tight">ผ่านมาแล้ว</p>
                <p className="text-base sm:text-lg font-bold tabular-nums leading-tight text-white">
                  {timeline.elapsedDays}{' '}
                  <span className="text-xs font-medium text-sky-300">วัน ({timeline.timePct}%)</span>
                </p>
              </div>
            </div>

            {/* Remaining Days Highlight Pill */}
            <div
              className={`${riskConfig.countdownBox} border rounded-xl px-3 py-1.5 flex items-center gap-2`}
            >
              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <Activity className={`w-3.5 h-3.5 ${riskConfig.iconTone}`} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-200 leading-tight">เหลือก่อนเข้า SIT</p>
                <p className={`text-lg sm:text-xl font-extrabold tabular-nums leading-tight ${riskConfig.countdownNum}`}>
                  {timeline.remainingDays}{' '}
                  <span className="text-xs font-semibold text-white/90">วัน</span>
                </p>
              </div>
            </div>

            {/* Risk Status Alert + Traffic Light */}
            <div
              className={`col-span-2 sm:col-span-1 rounded-xl border px-3 py-1.5 flex items-center justify-between gap-2.5 ${riskConfig.pillClass}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <RiskIcon className={`w-4 h-4 shrink-0 ${riskConfig.iconTone}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">{riskConfig.label}</p>
                  <p className="text-[11px] opacity-90 truncate">{riskConfig.subLabel}</p>
                </div>
              </div>

              {/* Clean Traffic Light */}
              <div
                className="flex items-center gap-1.5 bg-slate-950/75 border border-white/15 px-2 py-1 rounded-full shrink-0"
                title="สถานะความเสี่ยง: เขียว (ปกติ) / เหลือง (เฝ้าระวัง) / แดง (เร่งด่วน)"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    timeline.overallRisk === 'green'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-emerald-950 opacity-50'
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    timeline.overallRisk === 'yellow'
                      ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse'
                      : 'bg-amber-950 opacity-50'
                  }`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    timeline.overallRisk === 'red'
                      ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse'
                      : 'bg-rose-950 opacity-50'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: 3-Zone Progress Bar Infographic */}
        <div className="bg-slate-950/55 border border-white/10 rounded-xl px-3 py-2">
          {/* Risk Zone Guide Labels */}
          <div className="flex items-center text-[10px] sm:text-[11px] font-medium mb-1.5 gap-1">
            <div
              style={{ width: `${timeline.greenZonePct}%` }}
              className="flex items-center gap-1 text-emerald-300 truncate"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">โซนเขียว: ปลอดภัย (วันที่ 1–42)</span>
            </div>
            <div
              style={{ width: `${timeline.yellowZonePct}%` }}
              className="flex items-center gap-1 text-amber-300 truncate"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">โซนเหลือง: เร่งปิด</span>
            </div>
            <div
              style={{ width: `${timeline.redZonePct}%` }}
              className="flex items-center justify-end gap-1 text-rose-300 truncate"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span className="truncate">โซนแดง: 15 วันท้าย</span>
            </div>
          </div>

          {/* 3-Zone Track + Progress Fill */}
          <div className="relative h-5 sm:h-5.5 rounded-full bg-slate-900 border border-white/15 overflow-hidden shadow-inner">
            {/* Risk Zones Backdrop */}
            <div className="absolute inset-0 flex">
              <div
                style={{ width: `${timeline.greenZonePct}%` }}
                className="h-full bg-emerald-500/15 border-r border-white/15"
              />
              <div
                style={{ width: `${timeline.yellowZonePct}%` }}
                className="h-full bg-amber-500/20 border-r border-white/15"
              />
              <div
                style={{ width: `${timeline.redZonePct}%` }}
                className="h-full bg-rose-500/25"
              />
            </div>

            {/* Elapsed Smooth Progress Fill + Subtle Shimmer */}
            <div
              style={{ width: `${Math.max(4, timeline.timePct)}%` }}
              className={`relative h-full rounded-full bg-gradient-to-r ${riskConfig.fillGradient} transition-all duration-700 overflow-hidden`}
            >
              <div className="sit-shimmer-sweep" />
              <span
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 ${riskConfig.dotBorder} shadow-2xs`}
              />
            </div>

            {/* Crisp Readable Labels inside Bar */}
            <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-bold pointer-events-none">
              <span className="text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]">
                Day {timeline.elapsedDays} / {timeline.totalDays} ({timeline.timePct}%)
              </span>
              <span className="text-slate-200 drop-shadow">
                เป้าหมาย SIT: 4 ม.ค. 70 (คงเหลือ {timeline.remainingDays} วัน)
              </span>
            </div>
          </div>

          {/* Compact Readiness Metrics Footer */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                ความคืบหน้าปิดปัญหา:{' '}
                <strong className="text-white">
                  {timeline.closedIssues}/{timeline.totalIssues} เรื่อง ({timeline.resolutionPct}%)
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 text-rose-200 bg-rose-500/20 border border-rose-400/35 px-2 py-0.5 rounded-full font-semibold">
                <Flame className="w-3 h-3 shrink-0 text-rose-300" />
                High Priority ค้าง {timeline.highOpen} เรื่อง
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                คงค้างทั้งหมด {timeline.openIssues} เรื่อง
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> เขียว &gt;35 วัน
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> เหลือง 15–35 วัน
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> แดง ≤15 วัน
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
