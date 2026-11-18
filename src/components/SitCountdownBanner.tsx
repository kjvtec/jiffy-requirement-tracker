'use client';

import React, { useMemo } from 'react';
import type { Requirement } from '@/types';
import { AlertTriangle, Clock, Flag, ShieldCheck, type LucideIcon } from 'lucide-react';

interface SitCountdownBannerProps {
  requirements: Requirement[];
}

// Project window. Override per deployment with NEXT_PUBLIC_PROJECT_START / NEXT_PUBLIC_SIT_DATE (YYYY-MM-DD).
const START_DATE_STR = process.env.NEXT_PUBLIC_PROJECT_START || '2026-10-19';
const SIT_DATE_STR = process.env.NEXT_PUBLIC_SIT_DATE || '2027-01-04';

// Zone lengths (days) inside the pre-SIT window: green first, then yellow, the rest is red.
const GREEN_DAYS = 42;
const YELLOW_DAYS = 20;

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

function formatThaiDate(ymd: string, withYear = true): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

type RiskLevel = 'green' | 'yellow' | 'red';

const RISK: Record<
  RiskLevel,
  { title: string; hint: string; icon: LucideIcon; badge: string; accent: string }
> = {
  green: {
    title: 'ตามแผน',
    hint: 'เวลาและงานคงค้างอยู่ในเกณฑ์ควบคุมได้',
    icon: ShieldCheck,
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accent: 'border-l-emerald-500',
  },
  yellow: {
    title: 'ต้องเร่ง',
    hint: 'งานเสร็จช้ากว่าเวลาที่ผ่านไป หรือมี High Priority ค้างอยู่',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-900 border-amber-300',
    accent: 'border-l-amber-500',
  },
  red: {
    title: 'เสี่ยงสูง',
    hint: 'เหลือเวลาน้อย หรือมี High Priority ค้างจำนวนมาก',
    icon: AlertTriangle,
    badge: 'bg-rose-50 text-rose-800 border-rose-300',
    accent: 'border-l-rose-500',
  },
};

export default function SitCountdownBanner({ requirements }: SitCountdownBannerProps) {
  const t = useMemo(() => {
    const totalDays = Math.max(1, diffDays(START_DATE_STR, SIT_DATE_STR));
    const rawElapsed = diffDays(START_DATE_STR, getBangkokTodayYmd());
    const elapsedDays = Math.max(0, Math.min(totalDays, rawElapsed));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const timePct = Math.round((elapsedDays / totalDays) * 100);

    const totalReqs = requirements.length;
    const doneReqs = requirements.filter((r) => r.status === 'Done').length;
    const pendingReqs = totalReqs - doneReqs;
    const highPending = requirements.filter((r) => r.priority === '1.High' && r.status !== 'Done').length;
    const completionPct = totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0;

    const greenPct = (GREEN_DAYS / totalDays) * 100;
    const yellowPct = (YELLOW_DAYS / totalDays) * 100;
    const redPct = Math.max(0, 100 - greenPct - yellowPct);

    let risk: RiskLevel = 'green';
    if (remainingDays <= 15 || (remainingDays <= 35 && (highPending >= 5 || timePct - completionPct >= 30))) {
      risk = 'red';
    } else if (
      remainingDays <= 35 ||
      highPending >= 4 ||
      (timePct - completionPct >= 20 && pendingReqs > 0)
    ) {
      risk = 'yellow';
    }

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      timePct,
      greenPct,
      yellowPct,
      redPct,
      risk,
      totalReqs,
      doneReqs,
      pendingReqs,
      highPending,
      completionPct,
    };
  }, [requirements]);

  const risk = RISK[t.risk];
  const RiskIcon = risk.icon;
  const gap = t.timePct - t.completionPct;

  return (
    <section
      aria-label="สถานะความพร้อมก่อน SIT"
      className={`card border-l-4 ${risk.accent} p-4 sm:p-5`}
    >
      {/* Headline + key numbers */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        <div className="flex items-start gap-3 lg:w-[300px] shrink-0">
          <span className="h-10 w-10 rounded-lg bg-jiffy-sky text-jiffy-navy flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-jiffy-ink leading-snug">นับถอยหลังสู่ SIT</h2>
            <p className="text-sm text-slate-600 leading-snug">เป้าหมาย {formatThaiDate(SIT_DATE_STR)}</p>
            <p className="text-xs text-slate-500">
              เริ่ม {formatThaiDate(START_DATE_STR)} · รวม {t.totalDays} วัน
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 flex-1">
          <div>
            <dt className="text-xs text-slate-500">เหลือเวลา</dt>
            <dd className="text-2xl font-bold text-jiffy-navy leading-tight tabular-nums">
              {t.remainingDays}
              <span className="text-sm font-medium text-slate-500 ml-1">วัน</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">เวลาที่ผ่านไป</dt>
            <dd className="text-2xl font-bold text-slate-800 leading-tight tabular-nums">
              {t.timePct}
              <span className="text-sm font-medium text-slate-500 ml-0.5">%</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">งานเสร็จสมบูรณ์</dt>
            <dd className="text-2xl font-bold text-slate-800 leading-tight tabular-nums">
              {t.completionPct}
              <span className="text-sm font-medium text-slate-500 ml-0.5">%</span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                ({t.doneReqs}/{t.totalReqs})
              </span>
            </dd>
          </div>
        </dl>

        <div
          className={`inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 lg:max-w-[260px] ${risk.badge}`}
        >
          <RiskIcon className="w-5 h-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight">{risk.title}</div>
            <div className="text-xs leading-snug opacity-90">{risk.hint}</div>
          </div>
        </div>
      </div>

      {/* Timeline track with risk zones and a "today" marker */}
      <div className="mt-5">
        <div className="relative h-3 rounded-full overflow-hidden flex bg-slate-100" role="img"
          aria-label={`ผ่านไป ${t.elapsedDays} จาก ${t.totalDays} วัน`}>
          <div style={{ width: `${t.greenPct}%` }} className="h-full bg-emerald-200" />
          <div style={{ width: `${t.yellowPct}%` }} className="h-full bg-amber-200" />
          <div style={{ width: `${t.redPct}%` }} className="h-full bg-rose-200" />
          <div
            style={{ width: `${t.timePct}%` }}
            className="absolute inset-y-0 left-0 bg-jiffy-navy rounded-full transition-[width] duration-500"
          />
        </div>
        <div className="relative h-6" aria-hidden>
          <div
            style={{ left: `${Math.min(97, Math.max(3, t.timePct))}%` }}
            className="absolute top-1 -translate-x-1/2 text-xs font-semibold text-jiffy-navy whitespace-nowrap"
          >
            วันที่ {t.elapsedDays}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-xs text-slate-600 -mt-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300" />
              ปลอดภัย (เหลือ &gt;35 วัน)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />
              เร่งพัฒนา (15–35 วัน)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-300" />
              วิกฤต (≤15 วัน)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium text-slate-700">
            <span>คงค้าง {t.pendingReqs} เรื่อง</span>
            <span className={t.highPending > 0 ? 'text-rose-700 font-semibold' : ''}>
              High Priority ค้าง {t.highPending} เรื่อง
            </span>
            {t.totalReqs > 0 && gap > 0 && <span className="text-amber-800">ความคืบหน้าตามหลังเวลา {gap}%</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
