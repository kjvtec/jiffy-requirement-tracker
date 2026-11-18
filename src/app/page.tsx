'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Download,
  RefreshCw,
  LayoutDashboard,
  FolderTree,
  FileSpreadsheet,
  Globe,
  ExternalLink,
  ListOrdered,
} from 'lucide-react';
import {
  Requirement,
  RequirementImage,
  PriorityType,
  RequirementStatusType,
  TeamMember,
  SystemModule,
  RequirementFilter,
  CORE_FUNCTIONS,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
} from '@/types';
import dynamic from 'next/dynamic';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import DashboardView from '@/components/DashboardView';
import SitCountdownBanner from '@/components/SitCountdownBanner';

const TabLoadingFallback = ({ label }: { label: string }) => (
  <div className="bg-white rounded-2xl border border-[#DCEBFF] p-8 text-center shadow-xs">
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#044492]">
      <RefreshCw className="w-4 h-4 animate-spin text-[#0086FF]" />
      <span>{label}</span>
    </div>
  </div>
);

const IssueExplorerView = dynamic(() => import('@/components/IssueExplorerView'), {
  loading: () => <TabLoadingFallback label="กำลังโหลดตาราง Requirement..." />,
});
const PriorityListView = dynamic(() => import('@/components/PriorityListView'), {
  loading: () => <TabLoadingFallback label="กำลังโหลดรายการแยกตาม Priority..." />,
});
const IssueModal = dynamic(() => import('@/components/IssueModal'));
const IssueDetailModal = dynamic(() => import('@/components/IssueDetailModal'));
const DeleteGuardOverlay = dynamic(() => import('@/components/DeleteGuardOverlay'));

const SNAPSHOT_CACHE_KEY = 'jiffy_requirement_snapshot_v4';

interface CachedSnapshot {
  requirements: Requirement[];
  modules?: SystemModule[];
  teamMembers?: TeamMember[];
  savedAt: number;
}

function readSnapshotCache(): CachedSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSnapshot;
    if (!Array.isArray(parsed?.requirements) || parsed.requirements.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshotCache(snapshot: Omit<CachedSnapshot, 'savedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      SNAPSHOT_CACHE_KEY,
      JSON.stringify({ ...snapshot, savedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota
  }
}

async function loadFallbackRequirements(): Promise<Requirement[]> {
  try {
    const { default: raw } = await import('@/data/initialRequirements.json');
    return (raw as any[]).map((r) => ({
      ...r,
      req_id: r.req_id || r.log_id || 'JFY-REQ-01',
      title: r.title || r.details || '',
      core_function: (r.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType,
      requested_by: r.requested_by || r.raise_by || 'Nat',
      request_date: r.request_date || r.raise_date || new Date().toISOString(),
      dev_assigned: r.dev_assigned || r.closed_by || null,
      target_version: r.target_version || r.closed_version || null,
      remark: r.remark || r.resolution || null,
      images: r.images || [],
      // compatibility
      log_id: r.req_id || r.log_id || 'JFY-REQ-01',
      raise_by: r.requested_by || r.raise_by || 'Nat',
      raise_date: r.request_date || r.raise_date || new Date().toISOString(),
      resolution: r.remark || r.resolution || '',
      closed_by: r.dev_assigned || r.closed_by || null,
      closed_version: r.target_version || r.closed_version || null,
    }));
  } catch {
    return [];
  }
}

const DEFAULT_MODULES: SystemModule[] = CORE_FUNCTIONS.flatMap((core, coreIdx) =>
  DEFAULT_MODULES_BY_CORE[core].map((name, modIdx) => ({
    id: (coreIdx + 1) * 100 + modIdx + 1,
    core_function: core,
    name,
  }))
);

const DEFAULT_TEAM: TeamMember[] = [
  { id: 1, name: 'Aoy', role: 'Project Lead' },
  { id: 2, name: 'Kampon', role: 'Dev / Lead' },
  { id: 3, name: 'Kraijate', role: 'QA / Tester' },
  { id: 4, name: 'Tukta', role: 'Dev / Member' },
  { id: 5, name: 'Nat', role: 'Dev / Member' },
];

type ActiveTab = 'dashboard' | 'explorer' | 'priority';

export default function HomePage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [modules, setModules] = useState<SystemModule[]>(DEFAULT_MODULES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Explorer drill-down
  const [explorerCore, setExplorerCore] = useState<CoreFunctionType | null>(null);
  const [explorerModule, setExplorerModule] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [modalPresetCore, setModalPresetCore] = useState<CoreFunctionType | undefined>(undefined);
  const [modalPresetModule, setModalPresetModule] = useState<string | undefined>(undefined);
  const [modalPresetPriority, setModalPresetPriority] = useState<PriorityType | undefined>(undefined);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);

  // Protected 5-click delete guard
  const [deleteWarningVisible, setDeleteWarningVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteClickTrackerRef = useRef<{ id: string; count: number; lastClickAt: number }>({
    id: '',
    count: 0,
    lastClickAt: 0,
  });

  // Excel export progress
  const [exportProgress, setExportProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Filters state
  const [filter, setFilter] = useState<RequirementFilter>({
    search: '',
    core_function: '',
    status: '',
    priority: '',
    module: '',
    requested_by: '',
    dev_assigned: '',
  });

  const metadataLoadedRef = useRef(false);

  // Map DB row from 'requirements' table directly to Requirement interface
  const mapRequirementRow = useCallback((r: any): Requirement => {
    const rawReqId = r.req_id || r.log_id || 'JFY-REQ-01';
    const rawTitle = r.title || r.details || '';
    const rawCore = (r.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
    const rawModule = r.module || 'General';
    const rawReqBy = r.requested_by || r.raise_by || 'Nat';
    const rawReqDate = r.request_date || r.raise_date || r.created_at || new Date().toISOString();
    const rawStatus = (r.status || 'Draft') as RequirementStatusType;
    const rawDev = r.dev_assigned || r.closed_by || null;
    const rawVer = r.target_version || r.closed_version || null;
    const rawRemark = r.remark || r.resolution || null;

    const rawImages = (r.images || r.requirement_images || []).map((img: any) => ({
      id: img.id,
      requirement_id: img.requirement_id || img.issue_id,
      file_url: img.file_url,
      file_name: img.file_name,
      file_size: img.file_size,
    }));

    return {
      id: r.id,
      req_id: rawReqId,
      title: rawTitle,
      priority: r.priority || '2.Medium',
      type: r.type || 'New Feature',
      core_function: rawCore,
      module: rawModule,
      details: r.details || rawTitle,
      requested_by: rawReqBy,
      request_date: rawReqDate,
      status: rawStatus,
      dev_assigned: rawDev,
      target_version: rawVer,
      remark: rawRemark,
      created_at: r.created_at,
      updated_at: r.updated_at,
      images: rawImages,
      // Backward-compat helpers
      log_id: rawReqId,
      raise_by: rawReqBy,
      raise_date: rawReqDate,
      resolution: rawRemark || '',
      closed_by: rawDev,
      closed_version: rawVer,
    };
  }, []);

  // Quick refresh requirements only
  const fetchRequirementsOnly = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('requirements')
      .select('*, images:requirement_images(id, requirement_id, file_url, file_name, file_size)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Requirements fetch error:', error);
      return;
    }
    if (data) {
      const mapped = data.map(mapRequirementRow);
      setRequirements(mapped);
      writeSnapshotCache({ requirements: mapped });
    }
  }, [mapRequirementRow]);

  // Full data fetch
  const fetchData = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      const fallback = await loadFallbackRequirements();
      setRequirements(fallback);
      setLoading(false);
      return;
    }

    try {
      const includeMetadata = !metadataLoadedRef.current;
      const reqPromise = supabase
        .from('requirements')
        .select('*, images:requirement_images(id, requirement_id, file_url, file_name, file_size)')
        .order('created_at', { ascending: false });

      const [modulesRes, teamRes, reqRes] = await Promise.all([
        includeMetadata
          ? supabase.from('modules').select('id, core_function, name').order('name')
          : Promise.resolve({ data: null }),
        includeMetadata
          ? supabase.from('team_members').select('id, name, role').order('name')
          : Promise.resolve({ data: null }),
        reqPromise,
      ]);

      let nextModules: SystemModule[] = DEFAULT_MODULES;
      if (includeMetadata && modulesRes.data && modulesRes.data.length > 0) {
        nextModules = modulesRes.data.map((m: any) => ({
          ...m,
          core_function: (m.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType,
        }));
        setModules(nextModules);
      }

      let nextTeam: TeamMember[] = DEFAULT_TEAM;
      if (includeMetadata && teamRes.data && teamRes.data.length > 0) {
        nextTeam = teamRes.data;
        setTeamMembers(nextTeam);
      }

      if (includeMetadata) {
        metadataLoadedRef.current = true;
      }

      if (reqRes.data && reqRes.data.length > 0) {
        const mapped = reqRes.data.map(mapRequirementRow);
        setRequirements(mapped);
        writeSnapshotCache({
          requirements: mapped,
          modules: nextModules,
          teamMembers: nextTeam,
        });
      } else {
        const fallback = await loadFallbackRequirements();
        setRequirements(fallback);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const fallback = await loadFallbackRequirements();
      setRequirements(fallback);
    } finally {
      setLoading(false);
    }
  }, [mapRequirementRow]);

  useEffect(() => {
    const cached = readSnapshotCache();
    if (cached) {
      setRequirements(cached.requirements);
      if (cached.modules?.length) setModules(cached.modules);
      if (cached.teamMembers?.length) setTeamMembers(cached.teamMembers);
    }
    fetchData();
  }, [fetchData]);

  // Next running Req ID
  const nextReqId = useMemo(() => {
    let maxNum = 0;
    requirements.forEach((item) => {
      const match = (item.req_id || (item as any).log_id || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `JFY-REQ-${String(maxNum + 1).padStart(2, '0')}`;
  }, [requirements]);

  // Save (Create or Update)
  const handleSaveRequirement = async (
    reqData: Partial<Requirement>,
    newImages: RequirementImage[]
  ) => {
    const chosenCore = (reqData.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;

    const basePayload = {
      req_id: reqData.req_id || nextReqId,
      title: reqData.title || reqData.details?.slice(0, 80) || 'Requirement',
      priority: reqData.priority || '2.Medium',
      type: reqData.type || 'New Feature',
      module: reqData.module || 'General',
      details: reqData.details || '',
      requested_by: reqData.requested_by || 'Nat',
      request_date: reqData.request_date || new Date().toISOString(),
      status: reqData.status || 'Draft',
      dev_assigned: reqData.dev_assigned || null,
      target_version: reqData.target_version || null,
      remark: reqData.remark || null,
      core_function: chosenCore,
    };

    if (isSupabaseConfigured) {
      let savedId = reqData.id;

      if (reqData.id && !reqData.id.startsWith('legacy-') && !reqData.id.startsWith('local-')) {
        const { error: updateErr } = await supabase
          .from('requirements')
          .update({ ...basePayload, updated_at: new Date().toISOString() })
          .eq('id', reqData.id);

        if (updateErr) throw updateErr;

        await supabase.from('requirement_images').delete().eq('requirement_id', reqData.id);
        if (newImages.length > 0) {
          const imagesToInsert = newImages.map((img) => ({
            requirement_id: reqData.id,
            file_url: img.file_url,
            file_name: img.file_name,
            file_size: img.file_size || 0,
          }));
          await supabase.from('requirement_images').insert(imagesToInsert);
        }
      } else {
        const newUuid = crypto.randomUUID();
        const { data: newRow, error: insertErr } = await supabase
          .from('requirements')
          .insert({ id: newUuid, ...basePayload })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        savedId = newRow?.id || newUuid;

        if (newImages.length > 0 && savedId) {
          const imagesToInsert = newImages.map((img) => ({
            requirement_id: savedId,
            file_url: img.file_url,
            file_name: img.file_name,
            file_size: img.file_size || 0,
          }));
          await supabase.from('requirement_images').insert(imagesToInsert);
        }
      }

      await fetchRequirementsOnly();
    } else {
      // Local fallback
      if (reqData.id) {
        setRequirements((prev) =>
          prev.map((r) =>
            r.id === reqData.id
              ? ({ ...r, ...basePayload, images: newImages, updated_at: new Date().toISOString() } as Requirement)
              : r
          )
        );
      } else {
        const localNew: Requirement = {
          id: `local-${Date.now()}`,
          ...basePayload,
          images: newImages,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRequirements((prev) => [localNew, ...prev]);
      }
    }
  };

  // Status Change
  const handleStatusChange = async (reqId: string, newStatus: RequirementStatusType) => {
    setRequirements((prev) => {
      const next = prev.map((r) =>
        r.id === reqId ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
      );
      writeSnapshotCache({ requirements: next });
      return next;
    });

    if (selectedRequirement && selectedRequirement.id === reqId) {
      setSelectedRequirement((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    if (isSupabaseConfigured && !reqId.startsWith('legacy-') && !reqId.startsWith('local-')) {
      const { error } = await supabase
        .from('requirements')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reqId);
      if (error) {
        await fetchRequirementsOnly();
      }
    }
  };

  // Inline Update from Detail Modal
  const handleInlineUpdateRequirement = async (
    reqId: string,
    updates: Partial<Requirement>,
    newImages: RequirementImage[]
  ) => {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.dev_assigned !== undefined) payload.dev_assigned = updates.dev_assigned;
    if (updates.target_version !== undefined) payload.target_version = updates.target_version;
    if (updates.remark !== undefined) payload.remark = updates.remark;
    if (updates.status !== undefined) payload.status = updates.status;

    if (isSupabaseConfigured && !reqId.startsWith('legacy-') && !reqId.startsWith('local-')) {
      const { error: updateErr } = await supabase
        .from('requirements')
        .update(payload)
        .eq('id', reqId);
      if (updateErr) throw updateErr;

      await supabase.from('requirement_images').delete().eq('requirement_id', reqId);
      if (newImages.length > 0) {
        const imagesToInsert = newImages.map((img) => ({
          requirement_id: reqId,
          file_url: img.file_url,
          file_name: img.file_name,
          file_size: img.file_size || 0,
        }));
        await supabase.from('requirement_images').insert(imagesToInsert);
      }

      await fetchRequirementsOnly();
    } else {
      setRequirements((prev) =>
        prev.map((r) => (r.id === reqId ? ({ ...r, ...payload, images: newImages } as Requirement) : r))
      );
    }

    if (selectedRequirement && selectedRequirement.id === reqId) {
      setSelectedRequirement((prev) =>
        prev ? ({ ...prev, ...payload, images: newImages } as Requirement) : null
      );
    }
  };

  // Protected Delete
  const handleProtectedDeleteRequest = async (reqId: string) => {
    const now = Date.now();
    const tracker = deleteClickTrackerRef.current;

    if (tracker.id !== reqId || now - tracker.lastClickAt > 3500) {
      deleteClickTrackerRef.current = { id: reqId, count: 1, lastClickAt: now };
    } else {
      tracker.count++;
      tracker.lastClickAt = now;
    }

    if (deleteClickTrackerRef.current.count >= 5) {
      deleteClickTrackerRef.current = { id: '', count: 0, lastClickAt: 0 };
      setPendingDeleteId(reqId);
      setDeleteWarningVisible(true);
      return;
    }

    const target = requirements.find((r) => r.id === reqId);
    const confirmed = window.confirm(
      `ยืนยันการลบ Requirement "${target?.req_id || reqId}: ${target?.title || ''}" หรือไม่?`
    );
    if (!confirmed) return;

    await executeDelete(reqId);
  };

  const executeDelete = async (reqId: string) => {
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured && !reqId.startsWith('legacy-') && !reqId.startsWith('local-')) {
        await supabase.from('requirement_images').delete().eq('requirement_id', reqId);
        await supabase.from('requirements').delete().eq('id', reqId);
      }
      setRequirements((prev) => {
        const next = prev.filter((r) => r.id !== reqId);
        writeSnapshotCache({ requirements: next });
        return next;
      });
      if (selectedRequirement?.id === reqId) {
        setDetailModalOpen(false);
        setSelectedRequirement(null);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + (err?.message || err));
    } finally {
      setIsDeleting(false);
      setDeleteWarningVisible(false);
      setPendingDeleteId(null);
    }
  };

  // Module management
  const handleAddModule = async (name: string, coreFunction: CoreFunctionType | string) => {
    if (isSupabaseConfigured) {
      await supabase.from('modules').insert({ name, core_function: coreFunction });
      const { data } = await supabase.from('modules').select('*').order('name');
      if (data) setModules(data);
    } else {
      setModules((prev) => [...prev, { id: Date.now(), name, core_function: coreFunction as string }]);
    }
  };

  const handleUpdateModule = async (oldName: string, newName: string, coreFunction: CoreFunctionType | string) => {
    if (isSupabaseConfigured) {
      await supabase
        .from('modules')
        .update({ name: newName })
        .eq('core_function', coreFunction)
        .eq('name', oldName);

      await supabase
        .from('requirements')
        .update({ module: newName })
        .eq('core_function', coreFunction)
        .eq('module', oldName);
    }

    setModules((prev) =>
      prev.map((m) =>
        m.core_function === coreFunction && m.name === oldName ? { ...m, name: newName } : m
      )
    );
    setRequirements((prev) =>
      prev.map((r) =>
        r.core_function === coreFunction && r.module === oldName ? { ...r, module: newName } : r
      )
    );
  };

  const handleDeleteModule = async (name: string, coreFunction: CoreFunctionType | string) => {
    const used = requirements.filter(
      (r) => (r.core_function || DEFAULT_CORE_FUNCTION) === coreFunction && r.module === name
    );
    if (used.length > 0) {
      return {
        success: false,
        message: `ไม่สามารถลบโมดูล "${name}" ได้ เนื่องจากมี Requirement ใช้งานอยู่ ${used.length} รายการ`,
      };
    }

    if (isSupabaseConfigured) {
      await supabase.from('modules').delete().eq('core_function', coreFunction).eq('name', name);
    }

    setModules((prev) =>
      prev.filter((m) => !(m.core_function === coreFunction && m.name === name))
    );
    return { success: true };
  };

  // Export Excel
  const handleExportExcel = async (targetReqs: Requirement[], scopeTitle?: string) => {
    if (!targetReqs || targetReqs.length === 0) {
      alert('ไม่มีรายการ Requirement สำหรับ Export');
      return;
    }

    setExportProgress({
      active: true,
      current: 0,
      total: targetReqs.length,
      message: 'กำลังเตรียมโครงสร้างรายงาน Excel...',
    });

    try {
      const { exportRequirementsToExcel } = await import('@/lib/excel');
      await exportRequirementsToExcel(targetReqs, {
        scopeTitle,
        onProgress: (p) => {
          setExportProgress({
            active: true,
            current: p.current,
            total: p.total,
            message: p.message,
          });
        },
      });
    } catch (err: any) {
      console.error('Export error:', err);
      alert('เกิดข้อผิดพลาดในการสร้าง Excel: ' + (err?.message || err));
    } finally {
      setExportProgress(null);
    }
  };

  const openCreateModal = (
    presetCore?: CoreFunctionType,
    presetModule?: string,
    presetPriority?: PriorityType
  ) => {
    setEditingRequirement(null);
    setModalPresetCore(presetCore ?? (activeTab === 'explorer' && explorerCore ? explorerCore : DEFAULT_CORE_FUNCTION));
    setModalPresetModule(presetModule ?? (activeTab === 'explorer' && explorerModule ? explorerModule : undefined));
    setModalPresetPriority(presetPriority);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] text-slate-900 pb-20">
      {/* Top Navigation Bar - Jiffy & PTT RM CI */}
      <nav className="sticky top-0 z-30 shadow-md">
        {/* Brand Header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-[#D8E9FF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-3">
              {/* Brand Logos + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/jiffy-logo.png"
                    alt="Jiffy Logo"
                    className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0"
                  />
                  <span className="h-6 w-px bg-slate-200 shrink-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/pttrm-logo.png"
                    alt="PTT RM Logo"
                    className="h-8 sm:h-9 w-auto object-contain shrink-0"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-black text-[#044492] leading-none truncate">
                    Jiffy Requirement Tracker ( New Pos Jiffy)
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0086FF] shrink-0" />
                    VTec Pos Retail • New POS Jiffy Requirement Management
                  </p>
                </div>
              </div>

              {/* Action Buttons: Cloud HQ (Dev) + Jiffy Yellow CTA */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <a
                  href="https://ras-dev.pttrm.com/backoffice/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#EFF7FF] hover:bg-[#DCEEFF] text-[#044492] rounded-xl text-xs sm:text-sm font-bold border border-[#B8DCFF] shadow-2xs transition-all hover:scale-[1.02] active:scale-95"
                  title="เข้าระบบ Back Office / Cloud HQ (Dev)"
                >
                  <Globe className="w-4 h-4 text-[#0086FF] shrink-0" />
                  <span className="hidden sm:inline">เข้าระบบ Cloud HQ (Dev)</span>
                  <span className="sm:hidden">Cloud HQ</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0086FF]/80 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 bg-[#FFCB06] hover:bg-[#E5B600] text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-md border border-[#E5B300] transition-all hover:scale-[1.03] active:scale-95"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>+ เพิ่ม Requirement</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs Bar - Jiffy Royal Blue CI */}
        <div className="bg-gradient-to-r from-[#06142e] via-[#044492] to-[#0086FF] text-white border-b border-[#03326C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all font-bold ${
                  activeTab === 'dashboard'
                    ? 'bg-[#FFCB06] text-slate-950 shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard สรุปภาพรวม
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('explorer')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all font-bold ${
                  activeTab === 'explorer'
                    ? 'bg-[#FFCB06] text-slate-950 shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <FolderTree className="w-4 h-4 shrink-0" />
                ตาราง Requirement ทั้งหมด ({requirements.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('priority')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-all font-bold ${
                  activeTab === 'priority'
                    ? 'bg-[#FFCB06] text-slate-950 shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <ListOrdered className="w-4 h-4 shrink-0" />
                แยกตาม Priority ({requirements.length})
              </button>
            </div>

            {/* Quick Export & Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleExportExcel(requirements, 'All Requirements')}
                disabled={requirements.length === 0 || Boolean(exportProgress?.active)}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 space-y-5">
        {/* SIT Countdown Readiness Banner at top of main view */}
        <SitCountdownBanner requirements={requirements} />

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <DashboardView
            issues={requirements}
            teamMembers={teamMembers}
            modules={modules}
            onSelectIssue={(req) => {
              setSelectedRequirement(req);
              setDetailModalOpen(true);
            }}
            onSelectCoreFunction={(core) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                requested_by: '',
                dev_assigned: '',
              });
              setExplorerCore(core);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onFilterByModule={(mod, core) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                requested_by: '',
                dev_assigned: '',
              });
              setExplorerCore((core as CoreFunctionType) || DEFAULT_CORE_FUNCTION);
              setExplorerModule(mod);
              setActiveTab('explorer');
            }}
            onFilterByStatus={(st) => {
              setFilter({
                search: '',
                core_function: '',
                status: st,
                priority: '',
                module: '',
                requested_by: '',
                dev_assigned: '',
              });
              setExplorerCore(null);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onFilterByPriority={(pr) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: pr,
                module: '',
                requested_by: '',
                dev_assigned: '',
              });
              setExplorerCore(null);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onFilterByReporter={(rep) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                requested_by: rep,
                dev_assigned: '',
              });
              setExplorerCore(null);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onFilterByDev={(dev) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                requested_by: '',
                dev_assigned: dev,
              });
              setExplorerCore(null);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onGoToTable={() => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                requested_by: '',
                dev_assigned: '',
              });
              setExplorerCore(null);
              setExplorerModule(null);
              setActiveTab('explorer');
            }}
            onGoToPriorityList={() => {
              setActiveTab('priority');
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        )}

        {/* TAB 2: EXPLORER VIEW (Table Grid with Filter Tree) */}
        {activeTab === 'explorer' && (
          <IssueExplorerView
            issues={requirements}
            modules={modules}
            teamMembers={teamMembers}
            filter={filter}
            onFilterChange={setFilter}
            selectedCore={explorerCore}
            selectedModule={explorerModule}
            onSelectCore={setExplorerCore}
            onSelectModule={setExplorerModule}
            onSelectIssue={(req) => {
              setSelectedRequirement(req);
              setDetailModalOpen(true);
            }}
            onEditIssue={(req) => {
              setEditingRequirement(req);
              setModalPresetCore((req.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION);
              setModalPresetModule(req.module);
              setIsModalOpen(true);
            }}
            onDeleteIssue={handleProtectedDeleteRequest}
            onCreateIssue={(presetCore, presetModule) => openCreateModal(presetCore, presetModule)}
            onExportExcel={handleExportExcel}
            onAddModule={handleAddModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
          />
        )}

        {/* TAB 3: PRIORITY LIST VIEW (High -> Medium -> Low) */}
        {activeTab === 'priority' && (
          <PriorityListView
            issues={requirements}
            modules={modules}
            onSelectIssue={(req) => {
              setSelectedRequirement(req);
              setDetailModalOpen(true);
            }}
            onCreateIssue={(presetCore, presetModule, presetPriority) =>
              openCreateModal(presetCore, presetModule, presetPriority)
            }
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* Excel Export Progress Overlay */}
      {exportProgress?.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  กำลังสร้างไฟล์สรุป Requirement Excel (.xlsx)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{exportProgress.message}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>ความคืบหน้า</span>
                <span>
                  {exportProgress.total > 0
                    ? `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`
                    : '100%'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{
                    width: `${
                      exportProgress.total > 0
                        ? Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100))
                        : 100
                    }%`,
                  }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requirement Create / Edit Modal */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequirement(null);
        }}
        onSave={handleSaveRequirement}
        initialData={editingRequirement}
        suggestedLogId={nextReqId}
        defaultCoreFunction={modalPresetCore}
        defaultModule={modalPresetModule}
        defaultPriority={modalPresetPriority}
        modules={modules}
        teamMembers={teamMembers}
        onAddModule={handleAddModule}
      />

      {/* Requirement Detail Modal */}
      <IssueDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRequirement(null);
        }}
        issue={selectedRequirement}
        onEdit={(req) => {
          setDetailModalOpen(false);
          setEditingRequirement(req);
          setIsModalOpen(true);
        }}
        onDelete={handleProtectedDeleteRequest}
        onStatusChange={handleStatusChange}
        onUpdateIssue={handleInlineUpdateRequirement}
        teamMembers={teamMembers}
      />

      {/* Protected 5-Click Admin Delete Guard */}
      <DeleteGuardOverlay
        warningVisible={deleteWarningVisible}
        onDismissWarning={() => {
          setDeleteWarningVisible(false);
          setPendingDeleteId(null);
        }}
        confirmIssue={requirements.find((r) => r.id === pendingDeleteId) || null}
        isDeleting={isDeleting}
        onCancelConfirm={() => {
          setDeleteWarningVisible(false);
          setPendingDeleteId(null);
        }}
        onConfirmDelete={async () => {
          if (pendingDeleteId) {
            await executeDelete(pendingDeleteId);
          }
        }}
      />
    </div>
  );
}
