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
  Globe,
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
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard สรุปภาพรวม', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'kanban', label: `Kanban Board (${total})`, icon: <Columns3 className="w-4 h-4 shrink-0" /> },
    { id: 'explorer', label: `ตาราง Requirement (${total})`, icon: <FolderTree className="w-4 h-4 shrink-0" /> },
    { id: 'priority', label: 'แยกตาม Priority', icon: <ListOrdered className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <nav className="sticky top-0 z-30 shadow-md">
      <div className="bg-white/95 backdrop-blur-md border-b border-[#D8E9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/jiffy-logo.png" alt="Jiffy Logo" className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0" />
                <span className="h-6 w-px bg-slate-200 shrink-0" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/pttrm-logo.png" alt="PTT RM Logo" className="h-8 sm:h-9 w-auto object-contain shrink-0" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-black text-[#044492] leading-none truncate">
                  Jiffy Requirement Tracker (New POS Jiffy)
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0086FF] shrink-0" />
                  VTec POS Retail • New POS Jiffy Requirement Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <label className="hidden md:flex items-center gap-1.5 text-xs font-bold text-[#044492] bg-[#EFF7FF] border border-[#B8DCFF] rounded-xl pl-2.5 pr-1 py-1">
                <UserCircle2 className="w-4 h-4 text-[#0086FF]" />
                <span className="text-slate-500 font-semibold">ฉันคือ</span>
                <select
                  value={currentUser}
                  onChange={(e) => onCurrentUserChange(e.target.value)}
                  className="bg-transparent font-bold outline-none cursor-pointer max-w-[110px]"
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
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#EFF7FF] hover:bg-[#DCEEFF] text-[#044492] rounded-xl text-sm font-bold border border-[#B8DCFF] transition-all"
                title="เข้าระบบ Back Office / Cloud HQ (Dev)"
              >
                <Globe className="w-4 h-4 text-[#0086FF] shrink-0" />
                Cloud HQ (Dev)
                <ExternalLink className="w-3.5 h-3.5 text-[#0086FF]/80 shrink-0" />
              </a>

              <button
                type="button"
                onClick={onCreate}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 bg-[#FFCB06] hover:bg-[#E5B600] text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-md border border-[#E5B300] transition-all hover:scale-[1.03] active:scale-95"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                <span>เพิ่ม Requirement</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#06142e] via-[#044492] to-[#0086FF] text-white border-b border-[#03326C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all font-bold ${
                  activeTab === t.id
                    ? 'bg-[#FFCB06] text-slate-950 shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={total === 0 || exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white/95 hover:bg-white rounded-xl shadow-xs transition-all disabled:opacity-50"
              title="ดาวน์โหลดสรุป Requirement เป็น Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
