'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Plus,
  Download,
  RefreshCw,
  LayoutDashboard,
  Kanban,
  Table as TableIcon,
  Flame,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Search,
  X,
  Code2,
  Tag,
  User,
  Layers,
  ChevronRight,
  Database,
} from 'lucide-react';
import {
  Requirement,
  RequirementImage,
  RequirementStatusType,
  PriorityType,
  RequirementType,
  TeamMember,
  SystemModule,
  CORE_FUNCTIONS,
  CoreFunctionType,
  CORE_FUNCTION_META,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
  REQUIREMENT_STATUSES,
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStatusBadgeClass } from '@/lib/status';
import { exportRequirementsToExcel } from '@/lib/excel';

import DashboardView from '@/components/DashboardView';
import KanbanView from '@/components/KanbanView';
import PriorityListView from '@/components/PriorityListView';
import RequirementModal from '@/components/RequirementModal';
import RequirementDetailModal from '@/components/RequirementDetailModal';

const SUPABASE_SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/cnzthrnkyumhgsomszwu/sql/new';
const REQ_STORAGE_KEY = 'jiffy_requirements_local_v1';

const DEFAULT_TEAM: TeamMember[] = [
  { id: 1, name: 'Nat', role: 'QA / Tester' },
  { id: 2, name: 'Tukta', role: 'QA / Tester' },
  { id: 3, name: 'Kampon', role: 'Lead Developer' },
  { id: 4, name: 'Kraijate', role: 'Developer' },
  { id: 5, name: 'Aoy', role: 'Project Lead' },
];

const DEFAULT_MODULES: SystemModule[] = CORE_FUNCTIONS.flatMap((core, coreIdx) =>
  DEFAULT_MODULES_BY_CORE[core].map((name, modIdx) => ({
    id: (coreIdx + 1) * 100 + modIdx + 1,
    core_function: core,
    name,
  }))
);

type ActiveTab = 'dashboard' | 'kanban' | 'table' | 'priority';

export default function HomePage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [modules, setModules] = useState<SystemModule[]>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');

  // Supabase missing table notification
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);
  const [dismissedSqlBanner, setDismissedSqlBanner] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Filters for Table View
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCore, setFilterCore] = useState<string>('');
  const [filterDev, setFilterDev] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);

  // Presets for new modal
  const [presetCore, setPresetCore] = useState<CoreFunctionType | undefined>(undefined);
  const [presetModule, setPresetModule] = useState<string | undefined>(undefined);
  const [presetPriority, setPresetPriority] = useState<PriorityType | undefined>(undefined);

  // Generate next Running Req ID: JFY-REQ-01, JFY-REQ-02...
  const suggestedReqId = useMemo(() => {
    let maxNum = 0;
    requirements.forEach((r) => {
      const num = parseInt(r.req_id.replace(/\D/g, '') || '0', 10);
      if (num > maxNum) maxNum = num;
    });
    const nextNum = maxNum + 1;
    return `JFY-REQ-${String(nextNum).padStart(2, '0')}`;
  }, [requirements]);

  // Load Requirements
  const fetchRequirements = useCallback(async () => {
    setLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('requirements')
          .select('*, requirement_images(*)')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch returned error (table might need creation):', error.message);
          setNeedsSqlSetup(true);
          fallbackToLocal();
        } else if (data) {
          const mapped: Requirement[] = data.map((item: any) => ({
            ...item,
            images: (item.requirement_images || []).map((img: any) => ({
              id: img.id,
              requirement_id: img.requirement_id,
              file_url: img.file_url,
              file_name: img.file_name,
              file_size: img.file_size,
            })),
          }));
          setRequirements(mapped);
          setNeedsSqlSetup(false);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
        setNeedsSqlSetup(true);
        fallbackToLocal();
      }
    } else {
      fallbackToLocal();
    }

    setLoading(false);
  }, []);

  const fallbackToLocal = async () => {
    try {
      const stored = localStorage.getItem(REQ_STORAGE_KEY);
      if (stored) {
        setRequirements(JSON.parse(stored));
        return;
      }
    } catch {
      // Ignore
    }

    // Fallback to initialRequirements.json
    try {
      const { default: raw } = await import('@/data/initialRequirements.json');
      setRequirements(raw as Requirement[]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  // Save to local storage cache whenever requirements change
  useEffect(() => {
    if (requirements.length > 0 && typeof window !== 'undefined') {
      try {
        localStorage.setItem(REQ_STORAGE_KEY, JSON.stringify(requirements));
      } catch {
        // Ignore
      }
    }
  }, [requirements]);

  // Create or Update Requirement
  const handleSaveRequirement = async (
    reqData: Partial<Requirement>,
    images: RequirementImage[]
  ) => {
    if (editingRequirement) {
      // Update
      const updatedReq: Requirement = {
        ...editingRequirement,
        ...reqData,
        updated_at: new Date().toISOString(),
        images,
      } as Requirement;

      if (isSupabaseConfigured && !needsSqlSetup) {
        try {
          const { error } = await supabase
            .from('requirements')
            .update({
              title: updatedReq.title,
              priority: updatedReq.priority,
              type: updatedReq.type,
              core_function: updatedReq.core_function,
              module: updatedReq.module,
              details: updatedReq.details,
              requested_by: updatedReq.requested_by,
              status: updatedReq.status,
              dev_assigned: updatedReq.dev_assigned,
              target_version: updatedReq.target_version,
              remark: updatedReq.remark,
              updated_at: new Date().toISOString(),
            })
            .eq('id', updatedReq.id);

          if (error) console.error('Supabase update failed:', error);

          // Update images in requirement_images
          await supabase.from('requirement_images').delete().eq('requirement_id', updatedReq.id);
          if (images.length > 0) {
            await supabase.from('requirement_images').insert(
              images.map((img) => ({
                requirement_id: updatedReq.id,
                file_url: img.file_url,
                file_name: img.file_name,
                file_size: img.file_size || 0,
              }))
            );
          }
        } catch (err) {
          console.error(err);
        }
      }

      setRequirements((prev) =>
        prev.map((item) => (item.id === updatedReq.id ? updatedReq : item))
      );
      if (selectedRequirement?.id === updatedReq.id) {
        setSelectedRequirement(updatedReq);
      }
    } else {
      // Create new
      const newId = crypto.randomUUID();
      const newReq: Requirement = {
        id: newId,
        req_id: reqData.req_id || suggestedReqId,
        title: reqData.title || '',
        priority: reqData.priority || '2.Medium',
        type: reqData.type || 'New Feature',
        core_function: reqData.core_function || DEFAULT_CORE_FUNCTION,
        module: reqData.module || 'General',
        details: reqData.details || '',
        requested_by: reqData.requested_by || 'Team',
        request_date: new Date().toISOString(),
        status: reqData.status || 'Draft',
        dev_assigned: reqData.dev_assigned || null,
        target_version: reqData.target_version || null,
        remark: reqData.remark || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        images,
      };

      if (isSupabaseConfigured && !needsSqlSetup) {
        try {
          const { error } = await supabase.from('requirements').insert([
            {
              id: newId,
              req_id: newReq.req_id,
              title: newReq.title,
              priority: newReq.priority,
              type: newReq.type,
              core_function: newReq.core_function,
              module: newReq.module,
              details: newReq.details,
              requested_by: newReq.requested_by,
              status: newReq.status,
              dev_assigned: newReq.dev_assigned,
              target_version: newReq.target_version,
              remark: newReq.remark,
            },
          ]);

          if (error) console.error('Supabase insert failed:', error);

          if (images.length > 0) {
            await supabase.from('requirement_images').insert(
              images.map((img) => ({
                requirement_id: newId,
                file_url: img.file_url,
                file_name: img.file_name,
                file_size: img.file_size || 0,
              }))
            );
          }
        } catch (err) {
          console.error(err);
        }
      }

      setRequirements((prev) => [newReq, ...prev]);
    }
  };

  // Quick Status Change (from Kanban or Detail Modal)
  const handleStatusChange = async (reqId: string, newStatus: RequirementStatusType) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );

    if (selectedRequirement?.id === reqId) {
      setSelectedRequirement((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    if (isSupabaseConfigured && !needsSqlSetup) {
      try {
        await supabase
          .from('requirements')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', reqId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Delete Requirement
  const handleDeleteRequirement = async (reqId: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== reqId));
    if (selectedRequirement?.id === reqId) {
      setSelectedRequirement(null);
      setDetailModalOpen(false);
    }

    if (isSupabaseConfigured && !needsSqlSetup) {
      try {
        await supabase.from('requirements').delete().eq('id', reqId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Add custom module
  const handleAddModule = async (name: string, coreFunction: CoreFunctionType | string) => {
    const newMod: SystemModule = {
      id: Date.now(),
      name,
      core_function: coreFunction,
    };
    setModules((prev) => [...prev, newMod]);
  };

  // Add custom team member
  const handleAddTeamMember = async (name: string) => {
    const newMember: TeamMember = {
      id: Date.now(),
      name,
      role: 'Member',
    };
    setTeamMembers((prev) => [...prev, newMember]);
  };

  // Filtered requirements for Table View
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterCore && (r.core_function || DEFAULT_CORE_FUNCTION) !== filterCore) return false;
      if (filterDev && r.dev_assigned !== filterDev) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.req_id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.requested_by.toLowerCase().includes(q) ||
          (r.dev_assigned && r.dev_assigned.toLowerCase().includes(q)) ||
          r.module.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [requirements, filterStatus, filterPriority, filterCore, filterDev, searchQuery]);

  // Open Create Modal
  const openCreateModal = (
    presetC?: CoreFunctionType,
    presetM?: string,
    presetP?: PriorityType
  ) => {
    setEditingRequirement(null);
    setPresetCore(presetC);
    setPresetModule(presetM);
    setPresetPriority(presetP);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (req: Requirement) => {
    setEditingRequirement(req);
    setIsModalOpen(true);
  };

  // Open Detail Modal
  const openDetailModal = (req: Requirement) => {
    setSelectedRequirement(req);
    setDetailModalOpen(true);
  };

  const handleCopySql = () => {
    const sqlText = `-- ดูสคริปต์เต็มได้ที่ supabase/requirement_schema.sql ในโปรเจกต์
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT '2.Medium',
    type VARCHAR(50) NOT NULL DEFAULT 'New Feature',
    core_function VARCHAR(100) NOT NULL DEFAULT 'VTec POS',
    module VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    requested_by VARCHAR(100) NOT NULL,
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    dev_assigned VARCHAR(100),
    target_version VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.requirement_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all requirements" ON public.requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all req_images" ON public.requirement_images FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Logos & Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-slate-100 shadow-xs bg-white flex items-center justify-center p-1">
                  <Image
                    src="/logos/jiffy-logo.png"
                    alt="Jiffy"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-slate-100 shadow-xs bg-white flex items-center justify-center p-1 hidden sm:flex">
                  <Image
                    src="/logos/pttrm-logo.png"
                    alt="PTT RM"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Jiffy Requirement Tracker
                  </h1>
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200">
                    New Pos Jiify
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  ระบบบันทึก ติดตาม และส่งมอบข้อกำหนดความต้องการระบบแจ้ง Dev
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchRequirements}
                disabled={loading}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </button>

              <button
                type="button"
                onClick={() => exportRequirementsToExcel(requirements)}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
                title="ส่งออก Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => openCreateModal()}
                className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>สร้าง Requirement</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto pt-1">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'kanban'
                  ? 'border-sky-600 text-sky-700 bg-sky-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban Board
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'table'
                  ? 'border-sky-600 text-sky-700 bg-sky-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View ({filteredRequirements.length})
            </button>

            <button
              onClick={() => setActiveTab('priority')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'priority'
                  ? 'border-sky-600 text-sky-700 bg-sky-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" />
              Priority View
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-sky-600 text-sky-700 bg-sky-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard สรุปภาพรวม
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Supabase Missing Table Setup Banner */}
        {needsSqlSetup && !dismissedSqlBanner && (
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-amber-50 border border-sky-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  เตรียมตารางฐานข้อมูลสำหรับ Jiffy Requirement Tracker บน Supabase
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ขณะนี้ระบบรันด้วย Local Guidelines เพื่อให้ใช้งานได้จริงทันที
                  กรุณากดคัดลอก SQL แล้วไป Run ใน Supabase SQL Editor เพื่อเปิดใช้งาน Cloud Database เต็มรูปแบบ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 text-sky-700 border border-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'คัดลอกแล้ว!' : 'คัดลอก SQL'}
              </button>

              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-sky-600/20"
              >
                เปิด SQL Editor <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setDismissedSqlBanner(true)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            requirements={requirements}
            teamMembers={teamMembers}
            onSelectRequirement={openDetailModal}
            onFilterByStatus={(st) => {
              setFilterStatus(st);
              setActiveTab('table');
            }}
            onFilterByPriority={(pr) => {
              setFilterPriority(pr);
              setActiveTab('table');
            }}
            onFilterByCore={(cr) => {
              setFilterCore(cr);
              setActiveTab('table');
            }}
            onGoToKanban={() => setActiveTab('kanban')}
            onGoToTable={() => setActiveTab('table')}
          />
        )}

        {/* Tab 2: Kanban Board View */}
        {activeTab === 'kanban' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kanban Board</h3>
                <p className="text-xs text-slate-500">
                  ติดตามขั้นตอนการทำงาน 5 สถานะ (Draft ➔ In Review ➔ In Development ➔ Testing ➔ Done)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                ทั้งหมด {requirements.length} รายการ
              </span>
            </div>

            <KanbanView
              requirements={requirements}
              onSelectRequirement={openDetailModal}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}

        {/* Tab 3: Table / Grid View */}
        {activeTab === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้นหา Req ID, หัวข้อ, รายละเอียด, ผู้ขอ, หรือ Dev..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">ทุกสถานะ</option>
                  {REQUIREMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">ทุก Priority</option>
                  <option value="1.High">1.High</option>
                  <option value="2.Medium">2.Medium</option>
                  <option value="3.Low">3.Low</option>
                </select>

                <select
                  value={filterCore}
                  onChange={(e) => setFilterCore(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="">ทุก Core Function</option>
                  {CORE_FUNCTIONS.map((cf) => (
                    <option key={cf} value={cf}>
                      {cf}
                    </option>
                  ))}
                </select>

                {(searchQuery || filterStatus || filterPriority || filterCore || filterDev) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('');
                      setFilterPriority('');
                      setFilterCore('');
                      setFilterDev('');
                    }}
                    className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Req ID</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Priority</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Core / Module</th>
                    <th className="py-3 px-3">Dev Assigned</th>
                    <th className="py-3 px-3">Requested By</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRequirements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        ไม่พบรายการ Requirement ที่ตรงกับเงื่อนไขค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredRequirements.map((req) => {
                      const coreMeta =
                        CORE_FUNCTION_META[
                          (req.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION
                        ] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];

                      return (
                        <tr
                          key={req.id}
                          onClick={() => openDetailModal(req)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-sky-700 whitespace-nowrap">
                            {req.req_id}
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <h4 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                              {req.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {req.details}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                req.status
                              )}`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                req.priority.includes('High')
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : req.priority.includes('Medium')
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {req.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border w-fit ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}
                              >
                                {req.core_function || DEFAULT_CORE_FUNCTION}
                              </span>
                              <span className="text-[11px] text-slate-600 font-medium mt-0.5">
                                {req.module}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {req.dev_assigned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                <Code2 className="w-3 h-3" /> {req.dev_assigned}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600 text-[11px]">
                            {req.requested_by}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(req);
                              }}
                              className="px-2.5 py-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg border border-slate-200 text-[11px] font-semibold"
                            >
                              แก้ไข
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Priority View */}
        {activeTab === 'priority' && (
          <PriorityListView
            requirements={requirements}
            onSelectRequirement={openDetailModal}
            onCreateRequirement={openCreateModal}
            onExportExcel={(items, title) =>
              exportRequirementsToExcel(items, { scopeTitle: title })
            }
          />
        )}
      </main>

      {/* Create / Edit Modal */}
      <RequirementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRequirement}
        initialData={editingRequirement}
        suggestedReqId={suggestedReqId}
        defaultCoreFunction={presetCore}
        defaultModule={presetModule}
        defaultPriority={presetPriority}
        modules={modules}
        teamMembers={teamMembers}
        onAddModule={handleAddModule}
        onAddTeamMember={handleAddTeamMember}
      />

      {/* Detail Modal */}
      <RequirementDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        requirement={selectedRequirement}
        onEdit={(req) => {
          setDetailModalOpen(false);
          openEditModal(req);
        }}
        onDelete={handleDeleteRequirement}
        onStatusChange={handleStatusChange}
        onUpdateRequirement={async (id, updates, images) => {
          await handleSaveRequirement({ id, ...updates }, images);
        }}
        teamMembers={teamMembers}
      />
    </div>
  );
}
