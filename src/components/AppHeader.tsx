'use client';

import React from 'react';
import {
  Plus,
  Download,
  RefreshCw,
  LayoutDashboard,
  FolderTree,
  Columns3,
  ListOrdered,
  ExternalLink,
  UserCircle2,
} from 'lucide-react';
import type { TeamMember } from '@/types';

export type ActiveTab = 'dashboard' | 'kanban' | 'explorer' | 'priority';

interface AppHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  total: number;
  loading: boolean;
  exporting: boolean;
  team: TeamMember[];
  currentUser: string;
  onCurrentUserChange: (name: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

const HQ_URL = process.env.NEXT_PUBLIC_CLOUD_HQ_URL || 'https://ras-dev.pttrm.com/backoffice/';

export default function AppHeader({
  activeTab,
  onTabChange,
  total,
  loading,
  exporting,
  team,
  currentUser,
  onCurrentUserChange,
  onCreate,
  onRefresh,
  onExport,
}: AppHeaderProps) {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'dashboard', label: 'ภาพรวม', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'kanban', label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, count: total },
    { id: 'explorer', label: 'ตาราง Requirement', icon: <FolderTree className="w-4 h-4" />, count: total },
    { id: 'priority', label: 'แยกตาม Priority', icon: <ListOrdered className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30">
      {/* Brand bar */}
      <div className="bg-white border-b border-line">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/jiffy-logo.png" alt="Jiffy" className="h-9 w-9 object-contain shrink-0" />
              <span className="hidden sm:block h-7 w-px bg-line shrink-0" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/pttrm-logo.png" alt="PTT RM" className="hidden sm:block h-8 w-auto object-contain shrink-0" />
              <div className="min-w-0 ml-1">
                <h1 className="text-base sm:text-lg font-bold text-jiffy-navy leading-tight truncate">
                  Jiffy Requirement Tracker
                </h1>
                <p className="text-xs text-slate-500 leading-tight truncate">New POS Jiffy · VTec POS Retail</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="hidden md:flex items-center gap-2 h-9 pl-2.5 pr-1.5 rounded-lg border border-line bg-white text-sm hover:border-slate-300">
                <UserCircle2 className="w-4 h-4 text-jiffy-blue" aria-hidden />
                <span className="text-slate-500">ผู้ใช้งาน</span>
                <select
                  value={currentUser}
                  onChange={(e) => onCurrentUserChange(e.target.value)}
                  className="bg-transparent font-semibold text-jiffy-navy outline-none cursor-pointer max-w-[120px]"
                  aria-label="ผู้ใช้งานปัจจุบัน"
                >
                  {team.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <a
                href={HQ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary hidden sm:inline-flex h-9"
                title="เปิด Back Office / Cloud HQ (Dev)"
              >
                Cloud HQ
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>

              <button type="button" onClick={onCreate} className="btn-primary h-9">
                <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />
                <span className="hidden sm:inline">เพิ่ม Requirement</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="bg-jiffy-navy">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-stretch justify-between gap-3">
          <nav className="flex items-stretch overflow-x-auto -mb-px" aria-label="มุมมอง">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-[3px] transition-colors ${
                    active
                      ? 'text-white border-jiffy-yellow'
                      : 'text-blue-100/80 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.count !== undefined && (
                    <span
                      className={`min-w-[22px] px-1.5 rounded-full text-xs font-semibold text-center ${
                        active ? 'bg-jiffy-yellow text-jiffy-ink' : 'bg-white/15 text-blue-100'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={total === 0 || exporting}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              title="ดาวน์โหลดเป็น Excel (.xlsx)"
            >
              <Download className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
