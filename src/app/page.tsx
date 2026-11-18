'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Download,
  RefreshCw,
  LayoutDashboard,
  FolderTree,
  FileSpreadsheet,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Globe,
  X,
  ListOrdered,
} from 'lucide-react';
import {
  Issue,
  IssueImage,
  PriorityType,
  StatusType,
  TeamMember,
  SystemModule,
  IssueFilter,
  CORE_FUNCTIONS,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
} from '@/types';
import dynamic from 'next/dynamic';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { collectSuggestedUpdaters } from '@/lib/timeline';
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
  loading: () => <TabLoadingFallback label="กำลังโหลดตารางแยกกลุ่ม..." />,
});
const PriorityListView = dynamic(() => import('@/components/PriorityListView'), {
  loading: () => <TabLoadingFallback label="กำลังโหลดรายการแยกตาม Priority..." />,
});
const IssueModal = dynamic(() => import('@/components/IssueModal'));
const IssueDetailModal = dynamic(() => import('@/components/IssueDetailModal'));
const DeleteGuardOverlay = dynamic(() => import('@/components/DeleteGuardOverlay'));

const SNAPSHOT_CACHE_KEY = 'jiffy_issue_snapshot_v1';

interface CachedSnapshot {
  issues: Issue[];
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
    if (!Array.isArray(parsed?.issues) || parsed.issues.length === 0) return null;
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
    // Ignore storage quota errors
  }
}

async function loadFallbackIssues(): Promise<Issue[]> {
  const { default: raw } = await import('@/data/initialIssues.json');
  return (raw as Issue[]).map((item) => ({
    ...item,
    core_function: (item.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType,
  }));
}

const DEFAULT_MODULES: SystemModule[] = CORE_FUNCTIONS.flatMap((core, coreIdx) =>
  DEFAULT_MODULES_BY_CORE[core].map((name, modIdx) => ({
    id: (coreIdx + 1) * 100 + modIdx + 1,
    core_function: core,
    name,
  }))
);

const DEFAULT_TEAM: TeamMember[] = [
  { id: 5, name: 'Aoy', role: 'Project Lead' },
  { id: 3, name: 'Kampon', role: 'QA / Lead' },
  { id: 4, name: 'Kraijate', role: 'QA / Tester' },
  { id: 2, name: 'Tukta', role: 'QA / Tester' },
  { id: 1, name: 'Nat', role: 'QA / Tester' },
];

const LOCAL_CORE_OVERRIDES_KEY = 'jiffy_issue_core_overrides_v1';
const SUPABASE_SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/cnzthrnkyumhgsomszwu/sql/new';

const MIGRATION_SQL_SNIPPET = `ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS core_function VARCHAR(100) NOT NULL DEFAULT 'VTec Cloud HQ';
CREATE INDEX IF NOT EXISTS idx_issues_core_function ON public.issues(core_function);
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS core_function VARCHAR(100) NOT NULL DEFAULT 'VTec Cloud HQ';
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_name_key;
ALTER TABLE public.modules ADD CONSTRAINT modules_core_function_name_key UNIQUE (core_function, name);`;

function isMissingCoreColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string };
  const msg = `${e.message || ''} ${e.details || ''}`.toLowerCase();
  return e.code === 'PGRST204' || e.code === '42703' || msg.includes('core_function');
}

function readLocalCoreOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_CORE_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLocalCoreOverride(logId: string, coreFunction: string) {
  if (typeof window === 'undefined' || !logId) return;
  try {
    const current = readLocalCoreOverrides();
    current[logId] = coreFunction;
    localStorage.setItem(LOCAL_CORE_OVERRIDES_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

type ActiveTab = 'dashboard' | 'explorer' | 'priority';

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [modules, setModules] = useState<SystemModule[]>(DEFAULT_MODULES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Schema migration banner status (if Supabase issues table doesn't have core_function column yet)
  const [needsSchemaMigration, setNeedsSchemaMigration] = useState(false);
  const [dismissedMigrationBanner, setDismissedMigrationBanner] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Explorer drill-down state
  const [explorerCore, setExplorerCore] = useState<CoreFunctionType | null>(null);
  const [explorerModule, setExplorerModule] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [modalPresetCore, setModalPresetCore] = useState<CoreFunctionType | undefined>(undefined);
  const [modalPresetModule, setModalPresetModule] = useState<string | undefined>(undefined);
  const [modalPresetPriority, setModalPresetPriority] = useState<PriorityType | undefined>(undefined);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Protected 5-click Admin delete guard state
  const [deleteWarningVisible, setDeleteWarningVisible] = useState(false);
  const [pendingDeleteIssue, setPendingDeleteIssue] = useState<Issue | null>(null);
  const [isDeletingIssue, setIsDeletingIssue] = useState(false);
  const deleteClickTrackerRef = useRef<{ issueId: string; count: number; lastClickAt: number }>({
    issueId: '',
    count: 0,
    lastClickAt: 0,
  });
  const deleteWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteWarningTimerRef.current) {
        clearTimeout(deleteWarningTimerRef.current);
      }
    };
  }, []);

  // Excel export progress state
  const [exportProgress, setExportProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Filters state
  const [filter, setFilter] = useState<IssueFilter>({
    search: '',
    core_function: '',
    status: '',
    priority: '',
    module: '',
    raise_by: '',
  });

  // Normalize DB modules (fallback to DEFAULT_MODULES only when DB table is empty)
  const mergeModulesWithDefaults = useCallback((dbModules: SystemModule[]): SystemModule[] => {
    if (!dbModules || dbModules.length === 0) {
      return DEFAULT_MODULES;
    }
    return dbModules.map((m) => ({
      ...m,
      core_function: (m.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType,
    }));
  }, []);

  const metadataLoadedRef = useRef(false);

  const normalizeIssueRows = useCallback(
    (rows: Issue[], dbHasCoreCol: boolean): Issue[] => {
      const localOverrides = dbHasCoreCol ? {} : readLocalCoreOverrides();
      return rows.map((row) => ({
        ...row,
        core_function: (row.core_function ||
          localOverrides[row.log_id] ||
          DEFAULT_CORE_FUNCTION) as CoreFunctionType,
      }));
    },
    []
  );

  // Fast issue-only refresh (used after mutations or fallback resync)
  const fetchIssuesOnly = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('issues')
      .select('*, images:issue_images(id, issue_id, file_url, file_name, file_size)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      const dbHasCoreCol = 'core_function' in data[0];
      setNeedsSchemaMigration(!dbHasCoreCol);
      const normalizedIssues = normalizeIssueRows(data as Issue[], dbHasCoreCol);
      setIssues(normalizedIssues);
      writeSnapshotCache({ issues: normalizedIssues });
    }
  }, [normalizeIssueRows]);

  // Load data (initial load or manual refresh)
  const fetchData = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      const fallback = await loadFallbackIssues();
      setIssues(fallback);
      setLoading(false);
      return;
    }

    try {
      const includeMetadata = !metadataLoadedRef.current;
      const issuesPromise = supabase
        .from('issues')
        .select('*, images:issue_images(id, issue_id, file_url, file_name, file_size)')
        .order('created_at', { ascending: false });

      const [modulesRes, teamRes, issuesRes] = await Promise.all([
        includeMetadata
          ? supabase.from('modules').select('id, core_function, name').order('name')
          : Promise.resolve({ data: null }),
        includeMetadata
          ? supabase.from('team_members').select('id, name, role').order('name')
          : Promise.resolve({ data: null }),
        issuesPromise,
      ]);

      const dbHasCoreCol =
        Boolean(issuesRes.data && issuesRes.data.length > 0 && 'core_function' in issuesRes.data[0]);
      setNeedsSchemaMigration(Boolean(issuesRes.data && issuesRes.data.length > 0 && !dbHasCoreCol));

      let nextModules: SystemModule[] | undefined;
      if (includeMetadata) {
        if (modulesRes.data && modulesRes.data.length > 0) {
          nextModules = mergeModulesWithDefaults(modulesRes.data as SystemModule[]);
          setModules(nextModules);
        } else {
          nextModules = DEFAULT_MODULES;
          setModules(DEFAULT_MODULES);
        }
      }

      let nextTeam: TeamMember[] | undefined;
      if (includeMetadata && teamRes.data && teamRes.data.length > 0) {
        const priorityOrder: Record<string, number> = {
          'Aoy': 1,
          'Kampon': 2,
          'Kraijate': 3,
          'Tukta': 4,
          'Nat': 5,
        };
        nextTeam = [...teamRes.data].sort((a, b) => {
          const ordA = priorityOrder[a.name] || 99;
          const ordB = priorityOrder[b.name] || 99;
          return ordA - ordB;
        });
        setTeamMembers(nextTeam);
      }

      if (includeMetadata) {
        metadataLoadedRef.current = true;
      }

      if (issuesRes.data && issuesRes.data.length > 0) {
        const normalizedIssues = normalizeIssueRows(issuesRes.data as Issue[], dbHasCoreCol);
        setIssues(normalizedIssues);
        writeSnapshotCache({
          issues: normalizedIssues,
          modules: nextModules,
          teamMembers: nextTeam,
        });
      } else {
        setIssues(await loadFallbackIssues());
      }
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
      setIssues((prev) => (prev.length > 0 ? prev : []));
      if (!readSnapshotCache()) {
        setIssues(await loadFallbackIssues());
      }
    } finally {
      setLoading(false);
    }
  }, [mergeModulesWithDefaults, normalizeIssueRows]);

  useEffect(() => {
    // Hydrate cached snapshot immediately for instant repeat-visit paint while Supabase revalidates
    const cached = readSnapshotCache();
    if (cached) {
      setIssues(cached.issues);
      if (cached.modules?.length) setModules(cached.modules);
      if (cached.teamMembers?.length) setTeamMembers(cached.teamMembers);
    }
    fetchData();
  }, [fetchData]);

  // Quietly warm lazy-loaded tabs/modals during browser idle time after initial dashboard renders
  useEffect(() => {
    if (loading) return;
    const warmChunks = () => {
      void import('@/components/IssueDetailModal');
      void import('@/components/PriorityListView');
      void import('@/components/IssueExplorerView');
      void import('@/components/IssueModal');
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(warmChunks, { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(warmChunks, 1200);
    return () => clearTimeout(timer);
  }, [loading]);

  // Calculate Next Log ID
  const nextLogId = useMemo(() => {
    let maxNum = 0;
    issues.forEach((item) => {
      const match = item.log_id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ISSUE_${maxNum + 1}`;
  }, [issues]);

  // Handle Save
  const handleSaveIssue = async (issueData: Partial<Issue>, newImages: IssueImage[]) => {
    const chosenCore = (issueData.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;

    if (isSupabaseConfigured) {
      const basePayload = {
        log_id: issueData.log_id,
        priority: issueData.priority,
        type: issueData.type,
        module: issueData.module,
        details: issueData.details,
        raise_by: issueData.raise_by,
        status: issueData.status || 'Open',
        resolution: issueData.resolution,
        closed_by: issueData.closed_by,
        closed_version: issueData.closed_version,
        remark: issueData.remark,
      };

      let savedIssueId = issueData.id;

      if (issueData.id && !issueData.id.startsWith('legacy-') && !issueData.id.startsWith('local-')) {
        let { error: updateErr } = await supabase
          .from('issues')
          .update({ ...basePayload, core_function: chosenCore })
          .eq('id', issueData.id);

        if (updateErr && isMissingCoreColumnError(updateErr)) {
          setNeedsSchemaMigration(true);
          if (issueData.log_id) writeLocalCoreOverride(issueData.log_id, chosenCore);
          const fallbackRes = await supabase
            .from('issues')
            .update(basePayload)
            .eq('id', issueData.id);
          updateErr = fallbackRes.error;
        }

        if (updateErr) throw updateErr;

        await supabase.from('issue_images').delete().eq('issue_id', issueData.id);
        if (newImages.length > 0) {
          const imagesToInsert = newImages.map((img) => ({
            issue_id: issueData.id,
            file_url: img.file_url,
            file_name: img.file_name,
            file_size: img.file_size || 0,
          }));
          await supabase.from('issue_images').insert(imagesToInsert);
        }
      } else {
        let { data: newRow, error: insertErr } = await supabase
          .from('issues')
          .insert({ ...basePayload, core_function: chosenCore })
          .select('id')
          .single();

        if (insertErr && isMissingCoreColumnError(insertErr)) {
          setNeedsSchemaMigration(true);
          if (issueData.log_id) writeLocalCoreOverride(issueData.log_id, chosenCore);
          const fallbackRes = await supabase
            .from('issues')
            .insert(basePayload)
            .select('id')
            .single();
          newRow = fallbackRes.data;
          insertErr = fallbackRes.error;
        }

        if (insertErr) throw insertErr;
        savedIssueId = newRow?.id;

        if (newImages.length > 0 && savedIssueId) {
          const imagesToInsert = newImages.map((img) => ({
            issue_id: savedIssueId,
            file_url: img.file_url,
            file_name: img.file_name,
            file_size: img.file_size || 0,
          }));
          await supabase.from('issue_images').insert(imagesToInsert);
        }
      }

      if (savedIssueId && !savedIssueId.startsWith('legacy-') && !savedIssueId.startsWith('local-')) {
        const { data: freshRow } = await supabase
          .from('issues')
          .select('*, images:issue_images(id, issue_id, file_url, file_name, file_size)')
          .eq('id', savedIssueId)
          .single();

        if (freshRow) {
          const normalizedRow: Issue = {
            ...(freshRow as Issue),
            core_function: ((freshRow as Issue).core_function || chosenCore) as CoreFunctionType,
          };
          setIssues((prev) => {
            const exists = prev.some((i) => i.id === normalizedRow.id);
            const next = exists
              ? prev.map((i) => (i.id === normalizedRow.id ? normalizedRow : i))
              : [normalizedRow, ...prev];
            writeSnapshotCache({ issues: next });
            return next;
          });
          return;
        }
      }
      await fetchIssuesOnly();
    } else {
      if (issueData.id) {
        setIssues((prev) =>
          prev.map((item) =>
            item.id === issueData.id
              ? ({ ...item, ...issueData, core_function: chosenCore, images: newImages } as Issue)
              : item
          )
        );
      } else {
        const newRecord: Issue = {
          id: `local-${Date.now()}`,
          log_id: issueData.log_id || nextLogId,
          core_function: chosenCore,
          priority: issueData.priority || '2.Medium',
          type: issueData.type || 'Issue',
          module: issueData.module || 'General',
          details: issueData.details || '',
          raise_by: issueData.raise_by || 'Kraijate',
          raise_date: new Date().toISOString(),
          status: issueData.status || 'Open',
          resolution: issueData.resolution,
          closed_by: issueData.closed_by,
          closed_version: issueData.closed_version,
          remark: issueData.remark,
          created_at: new Date().toISOString(),
          images: newImages,
        };
        setIssues((prev) => [newRecord, ...prev]);
      }
    }
  };

  // Quick Status Change (optimistic update for instant UI feedback)
  const handleStatusChange = async (issueId: string, newStatus: StatusType) => {
    const closedDate = newStatus === 'Closed' ? new Date().toISOString() : undefined;

    setIssues((prev) => {
      const next = prev.map((i) =>
        i.id === issueId
          ? {
              ...i,
              status: newStatus,
              closed_date: closedDate ?? i.closed_date,
            }
          : i
      );
      writeSnapshotCache({ issues: next });
      return next;
    });

    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue((prev) =>
        prev ? { ...prev, status: newStatus, closed_date: closedDate ?? prev.closed_date } : null
      );
    }

    if (isSupabaseConfigured && !issueId.startsWith('legacy-') && !issueId.startsWith('local-')) {
      const updates: Record<string, unknown> = { status: newStatus };
      if (closedDate) updates.closed_date = closedDate;
      const { error } = await supabase.from('issues').update(updates).eq('id', issueId);
      if (error) {
        await fetchIssuesOnly();
      }
    }
  };

  // Collect unique updater names from existing timelines & team members
  const knownUpdaters = useMemo(
    () => collectSuggestedUpdaters(issues, teamMembers),
    [issues, teamMembers]
  );

  // Inline Update from Detail Modal (syncs single issue without full reload)
  const handleInlineUpdateIssue = async (
    issueId: string,
    updates: Partial<Issue>,
    newImages: IssueImage[]
  ) => {
    const nowIso = new Date().toISOString();
    const safeUpdates: Record<string, unknown> = {};
    if (updates.resolution !== undefined) safeUpdates.resolution = updates.resolution;
    if (updates.closed_by !== undefined) safeUpdates.closed_by = updates.closed_by;
    if (updates.closed_version !== undefined) safeUpdates.closed_version = updates.closed_version;
    if (updates.remark !== undefined) safeUpdates.remark = updates.remark;
    if (updates.status !== undefined) {
      safeUpdates.status = updates.status;
      if (updates.status === 'Closed' && !updates.closed_date) {
        safeUpdates.closed_date = nowIso;
      }
    }
    if (updates.closed_date !== undefined) safeUpdates.closed_date = updates.closed_date;

    let syncedImages = newImages;

    if (isSupabaseConfigured && !issueId.startsWith('legacy-') && !issueId.startsWith('local-')) {
      const { error: updateErr } = await supabase
        .from('issues')
        .update(safeUpdates)
        .eq('id', issueId);

      if (updateErr) throw updateErr;

      await supabase.from('issue_images').delete().eq('issue_id', issueId);
      if (newImages.length > 0) {
        const imagesToInsert = newImages.map((img) => ({
          issue_id: issueId,
          file_url: img.file_url,
          file_name: img.file_name,
          file_size: img.file_size || 0,
        }));
        const { data: insertedImages } = await supabase
          .from('issue_images')
          .insert(imagesToInsert)
          .select('id, issue_id, file_url, file_name, file_size');
        if (insertedImages) {
          syncedImages = insertedImages as IssueImage[];
        }
      }
    }

    setIssues((prev) => {
      const next = prev.map((item) =>
        item.id === issueId
          ? ({ ...item, ...safeUpdates, updated_at: nowIso, images: syncedImages } as Issue)
          : item
      );
      writeSnapshotCache({ issues: next });
      return next;
    });

    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue((prev) =>
        prev ? ({ ...prev, ...safeUpdates, updated_at: nowIso, images: syncedImages } as Issue) : null
      );
    }
  };

  // Execute actual DB deletion (only after 5-click Admin Confirm)
  const executeDeleteIssue = async (issueId: string) => {
    setIssues((prev) => {
      const next = prev.filter((i) => i.id !== issueId);
      writeSnapshotCache({ issues: next });
      return next;
    });

    if (isSupabaseConfigured && !issueId.startsWith('legacy-') && !issueId.startsWith('local-')) {
      const { error } = await supabase.from('issues').delete().eq('id', issueId);
      if (error) {
        await fetchIssuesOnly();
      }
    }
  };

  // Protected delete click handler: warns regular users (clicks 1–4), opens Admin Confirm modal on 5th click
  const handleProtectedDeleteRequest = async (issueId: string) => {
    const target = issues.find((i) => i.id === issueId);
    if (!target) return;

    const now = Date.now();
    const prev = deleteClickTrackerRef.current;
    const withinWindow = prev.issueId === issueId && now - prev.lastClickAt <= 5000;
    const nextCount = withinWindow ? prev.count + 1 : 1;

    deleteClickTrackerRef.current = {
      issueId,
      count: nextCount,
      lastClickAt: now,
    };

    if (deleteWarningTimerRef.current) {
      clearTimeout(deleteWarningTimerRef.current);
      deleteWarningTimerRef.current = null;
    }

    if (nextCount >= 5) {
      deleteClickTrackerRef.current = { issueId: '', count: 0, lastClickAt: 0 };
      setDeleteWarningVisible(false);
      setPendingDeleteIssue(target);
      return;
    }

    setDeleteWarningVisible(true);
    deleteWarningTimerRef.current = setTimeout(() => {
      setDeleteWarningVisible(false);
      deleteWarningTimerRef.current = null;
    }, 4500);
  };

  const handleConfirmDeleteIssue = async () => {
    if (!pendingDeleteIssue || isDeletingIssue) return;
    setIsDeletingIssue(true);
    try {
      const targetId = pendingDeleteIssue.id;
      await executeDeleteIssue(targetId);
      if (selectedIssue?.id === targetId) {
        setDetailModalOpen(false);
        setSelectedIssue(null);
      }
      setPendingDeleteIssue(null);
    } finally {
      setIsDeletingIssue(false);
    }
  };

  // Add Module
  const handleAddModule = async (name: string, coreFunction: CoreFunctionType | string = DEFAULT_CORE_FUNCTION) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('modules').insert({ name, core_function: coreFunction });
      if (error && isMissingCoreColumnError(error)) {
        await supabase.from('modules').insert({ name });
      }
      const { data } = await supabase.from('modules').select('*').order('name');
      if (data) {
        setModules((prev) => {
          const merged = mergeModulesWithDefaults(data as SystemModule[]);
          const hasEntry = merged.some(
            (m) =>
              (m.core_function || DEFAULT_CORE_FUNCTION) === coreFunction &&
              m.name.toLowerCase() === name.toLowerCase()
          );
          return hasEntry
            ? merged
            : [...merged, { id: Date.now(), core_function: coreFunction, name }];
        });
      }
    } else {
      setModules((prev) => [...prev, { id: Date.now(), core_function: coreFunction, name }]);
    }
  };

  // Update Sub-module (Rename)
  const handleUpdateModule = async (
    oldName: string,
    newName: string,
    coreFunction: CoreFunctionType | string = DEFAULT_CORE_FUNCTION
  ) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return;

    // Check duplicate in the same core
    const duplicate = modules.some(
      (m) =>
        (m.core_function || DEFAULT_CORE_FUNCTION) === coreFunction &&
        m.name.toLowerCase() === trimmedNew.toLowerCase()
    );
    if (duplicate) {
      alert(`มีกลุ่มย่อยชื่อ "${trimmedNew}" ในกลุ่ม ${coreFunction} อยู่แล้ว`);
      return;
    }

    if (isSupabaseConfigured) {
      // 1. Update in modules table
      const { error: modErr } = await supabase
        .from('modules')
        .update({ name: trimmedNew })
        .eq('core_function', coreFunction)
        .eq('name', oldName);

      if (modErr) {
        console.error('Update module error:', modErr);
        alert('เกิดข้อผิดพลาดในการแก้ไขชื่อกลุ่มย่อย: ' + modErr.message);
        return;
      }

      // 2. Cascade update in issues table for all issues referencing this module in this core
      const { error: issueErr } = await supabase
        .from('issues')
        .update({ module: trimmedNew })
        .eq('core_function', coreFunction)
        .eq('module', oldName);

      if (issueErr) {
        console.error('Cascade update issues module error:', issueErr);
      }
    }

    // Optimistic state updates
    setModules((prev) =>
      prev.map((m) =>
        (m.core_function || DEFAULT_CORE_FUNCTION) === coreFunction && m.name === oldName
          ? { ...m, name: trimmedNew }
          : m
      )
    );

    setIssues((prev) =>
      prev.map((i) =>
        (i.core_function || DEFAULT_CORE_FUNCTION) === coreFunction && i.module === oldName
          ? { ...i, module: trimmedNew }
          : i
      )
    );

    if (explorerModule === oldName) {
      setExplorerModule(trimmedNew);
    }
  };

  // Delete Sub-module (with strict check: cannot delete if issues exist)
  const handleDeleteModule = async (
    name: string,
    coreFunction: CoreFunctionType | string = DEFAULT_CORE_FUNCTION
  ): Promise<{ success: boolean; message?: string }> => {
    // 1. Check if ANY issue is using this module
    const usedIssues = issues.filter(
      (i) => (i.core_function || DEFAULT_CORE_FUNCTION) === coreFunction && i.module === name
    );

    if (usedIssues.length > 0) {
      return {
        success: false,
        message: `ไม่สามารถลบกลุ่มย่อย "${name}" ได้ เนื่องจากมีปัญหา (Issue) ใช้งานกลุ่มย่อยนี้อยู่ ${usedIssues.length} รายการ\nกรุณาย้ายหรือเปลี่ยนกลุ่มย่อยของ Issue ดังกล่าวให้เรียบร้อยก่อนทำการลบ`,
      };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('core_function', coreFunction)
        .eq('name', name);

      if (error) {
        console.error('Delete module error:', error);
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการลบกลุ่มย่อย: ' + error.message,
        };
      }
    }

    // Optimistic state update
    setModules((prev) =>
      prev.filter(
        (m) => !((m.core_function || DEFAULT_CORE_FUNCTION) === coreFunction && m.name === name)
      )
    );

    if (explorerModule === name) {
      setExplorerModule(null);
    }

    return { success: true };
  };

  // Add Team Member
  const handleAddTeamMember = async (name: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('team_members').insert({ name, role: 'Member' });
      const { data } = await supabase.from('team_members').select('*').order('name');
      if (data) setTeamMembers(data);
    } else {
      setTeamMembers((prev) => [...prev, { id: Date.now(), name, role: 'Member' }]);
    }
  };

  // Export Excel with progress overlay
  const handleExportExcel = async (targetIssues: Issue[], scopeTitle?: string) => {
    if (!targetIssues || targetIssues.length === 0) {
      alert('ไม่มีรายการปัญหาสำหรับ Export');
      return;
    }

    setExportProgress({
      active: true,
      current: 0,
      total: targetIssues.length,
      message: 'กำลังเตรียมโครงสร้างรายงาน Excel (Index + แยกราย Sheet)...',
    });

    try {
      const { exportIssuesToExcel } = await import('@/lib/excel');
      await exportIssuesToExcel(targetIssues, {
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
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel: ' + ((err as Error)?.message || 'Unknown error'));
    } finally {
      setExportProgress(null);
    }
  };

  const openCreateModal = (
    presetCore?: CoreFunctionType,
    presetModule?: string,
    presetPriority?: PriorityType
  ) => {
    setEditingIssue(null);
    setModalPresetCore(presetCore ?? (activeTab === 'explorer' && explorerCore ? explorerCore : DEFAULT_CORE_FUNCTION));
    setModalPresetModule(presetModule ?? (activeTab === 'explorer' && explorerModule ? explorerModule : undefined));
    setModalPresetPriority(presetPriority);
    setIsModalOpen(true);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL_SNIPPET);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] text-slate-900 pb-20">
      {/* Top Navigation Bar - Jiffy & PTT RM CI */}
      <nav className="sticky top-0 z-30 shadow-md">
        {/* Top Clean White Brand Header (Transparent Logos blend seamlessly) */}
        <div className="bg-white/95 backdrop-blur-md border-b border-[#D8E9FF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-3">
              {/* Transparent Brand Logos + Title */}
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
                  <h1 className="text-sm sm:text-lg font-extrabold text-[#0C2553] leading-none truncate">
                    Jiffy Requirement Tracker ( New Pos Jiify)
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0086FF] shrink-0" />
                    VTec Pos Retail • Jiffy Project
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
                  title="เข้าระบบ Back Office / Cloud HQ (Dev) — https://ras-dev.pttrm.com/backoffice/"
                >
                  <Globe className="w-4 h-4 text-[#0086FF] shrink-0" />
                  <span className="hidden sm:inline">เข้าระบบ Cloud HQ (Dev)</span>
                  <span className="sm:hidden">Cloud HQ (Dev)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0086FF]/80 shrink-0" />
                </a>

                <button
                  onClick={() => openCreateModal()}
                  className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 bg-[#FFCB06] hover:bg-[#F5C000] text-[#0C2553] rounded-xl text-xs sm:text-sm font-extrabold shadow-sm border border-[#E5B300] transition-all hover:scale-[1.03] active:scale-95 ring-2 ring-[#FFCB06]/35"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>+ บันทึก Requirement ใหม่</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs Bar - Jiffy Royal Blue CI */}
        <div className="bg-gradient-to-r from-[#0C2553] via-[#044492] to-[#0074E0] text-white border-b border-[#03326C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#FFCB06] text-[#0C2553] font-bold shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard สรุป
              </button>

              <button
                onClick={() => setActiveTab('explorer')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all ${
                  activeTab === 'explorer'
                    ? 'bg-[#FFCB06] text-[#0C2553] font-bold shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <FolderTree className="w-4 h-4 shrink-0" />
                ดูข้อมูลปัญหาแยกกลุ่ม ({issues.length})
              </button>

              <button
                onClick={() => setActiveTab('priority')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all ${
                  activeTab === 'priority'
                    ? 'bg-[#FFCB06] text-[#0C2553] font-bold shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <ListOrdered className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">แยกตาม Priority (List View)</span>
                <span className="sm:hidden">แยก Priority</span>
                <span className="text-[11px] opacity-85">({issues.length})</span>
              </button>
            </div>

            {/* Quick Export & Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => handleExportExcel(issues, 'All Core Functions')}
                disabled={issues.length === 0 || Boolean(exportProgress?.active)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-white bg-white/95 border border-white/40 rounded-lg shadow-2xs transition-all disabled:opacity-50"
                title="ดาวน์โหลดไฟล์สรุปปัญหา Excel (.xlsx) พร้อมหน้า Index และรูปภาพประกอบแยก Sheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel (Index + รูป)</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Optional DB Migration Notice (only shown if Supabase table doesn't have core_function column yet) */}
      {needsSchemaMigration && !dismissedMigrationBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-extrabold">
                  รอเพิ่มคอลัมน์ <code className="bg-amber-100 px-1.5 py-0.5 rounded">core_function</code> ในฐานข้อมูล Supabase
                </p>
                <p className="text-amber-800">
                  รายการเดิมถูกจัดเข้า <b>VTec Cloud HQ</b> อัตโนมัติแล้ว หากต้องการจัดเก็บกลุ่ม <b>5 Core Functions</b> ร่วมกันทั้งทีม กรุณารัน SQL Migration ใน Supabase SQL Editor
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'คัดลอก SQL แล้ว' : 'คัดลอก SQL'}
              </button>
              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิด Supabase SQL
              </a>
              <button
                type="button"
                onClick={() => setDismissedMigrationBanner(true)}
                className="p-1.5 text-amber-700 hover:bg-amber-200/70 rounded-lg"
                title="ซ่อนแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 space-y-5">
        {/* SIT Readiness Countdown & 3-Zone Risk Infographic */}
        <SitCountdownBanner issues={issues} />

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <DashboardView
            issues={issues}
            teamMembers={teamMembers}
            modules={modules}
            onSelectIssue={(issue) => {
              setSelectedIssue(issue);
              setDetailModalOpen(true);
            }}
            onSelectCoreFunction={(core) => {
              setFilter({
                search: '',
                core_function: '',
                status: '',
                priority: '',
                module: '',
                raise_by: '',
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
                raise_by: '',
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
                raise_by: '',
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
                raise_by: '',
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
                raise_by: rep,
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
                raise_by: '',
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

        {/* TAB 2: HIERARCHICAL GROUPED EXPLORER VIEW (Core Function -> Sub-module) */}
        {activeTab === 'explorer' && (
          <IssueExplorerView
            issues={issues}
            modules={modules}
            teamMembers={teamMembers}
            filter={filter}
            onFilterChange={setFilter}
            selectedCore={explorerCore}
            selectedModule={explorerModule}
            onSelectCore={setExplorerCore}
            onSelectModule={setExplorerModule}
            onSelectIssue={(issue) => {
              setSelectedIssue(issue);
              setDetailModalOpen(true);
            }}
            onEditIssue={(issue) => {
              setEditingIssue(issue);
              setModalPresetCore((issue.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION);
              setModalPresetModule(issue.module);
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

        {/* TAB 3: PRIORITY LIST VIEW (1.High -> 2.Medium -> 3.Low) */}
        {activeTab === 'priority' && (
          <PriorityListView
            issues={issues}
            modules={modules}
            onSelectIssue={(issue) => {
              setSelectedIssue(issue);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  กำลังสร้างไฟล์สรุปปัญหา Excel (.xlsx)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{exportProgress.message}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>ความคืบหน้า</span>
                <span>
                  {exportProgress.total > 0
                    ? `${Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100))}%`
                    : '...'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{
                    width: `${
                      exportProgress.total > 0
                        ? Math.max(8, Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100)))
                        : 25
                    }%`,
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              ระบบกำลังจัดเตรียมหน้า Index และฝังรูปภาพประกอบลงในแต่ละ Sheet กรุณารอสักครู่...
            </p>
          </div>
        </div>
      )}

      {/* Lazy-Loaded Modals */}
      {isModalOpen && (
        <IssueModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIssue(null);
            setModalPresetCore(undefined);
            setModalPresetModule(undefined);
            setModalPresetPriority(undefined);
          }}
          onSave={handleSaveIssue}
          initialData={editingIssue}
          suggestedLogId={nextLogId}
          defaultCoreFunction={modalPresetCore}
          defaultModule={modalPresetModule}
          defaultPriority={modalPresetPriority}
          modules={modules}
          teamMembers={teamMembers}
          onAddModule={handleAddModule}
          onAddTeamMember={handleAddTeamMember}
        />
      )}

      {detailModalOpen && selectedIssue && (
        <IssueDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedIssue(null);
          }}
          issue={selectedIssue}
          onEdit={(issueToEdit) => {
            setDetailModalOpen(false);
            setEditingIssue(issueToEdit);
            setModalPresetCore((issueToEdit.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION);
            setModalPresetModule(issueToEdit.module);
            setIsModalOpen(true);
          }}
          onDelete={handleProtectedDeleteRequest}
          onStatusChange={handleStatusChange}
          onUpdateIssue={handleInlineUpdateIssue}
          teamMembers={teamMembers}
          suggestedUpdaters={knownUpdaters}
        />
      )}

      {(deleteWarningVisible || Boolean(pendingDeleteIssue)) && (
        <DeleteGuardOverlay
          warningVisible={deleteWarningVisible}
          onDismissWarning={() => {
            if (deleteWarningTimerRef.current) {
              clearTimeout(deleteWarningTimerRef.current);
              deleteWarningTimerRef.current = null;
            }
            setDeleteWarningVisible(false);
          }}
          confirmIssue={pendingDeleteIssue}
          isDeleting={isDeletingIssue}
          onCancelConfirm={() => {
            deleteClickTrackerRef.current = { issueId: '', count: 0, lastClickAt: 0 };
            setPendingDeleteIssue(null);
          }}
          onConfirmDelete={handleConfirmDeleteIssue}
        />
      )}
    </div>
  );
}
