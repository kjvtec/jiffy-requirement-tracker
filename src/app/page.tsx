'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import {
  DEFAULT_CORE_FUNCTION,
  EMPTY_FILTER,
  type CoreFunctionType,
  type Requirement,
  type RequirementFilter,
  type RequirementInput,
  type RequirementImage,
  type RequirementStatusType,
} from '@/types';
import { useTracker } from '@/hooks/useTracker';
import AppHeader, { type ActiveTab } from '@/components/AppHeader';
import DashboardView from '@/components/DashboardView';
import SitCountdownBanner from '@/components/SitCountdownBanner';
import ToastHost from '@/components/ToastHost';
import type { FormPresets } from '@/components/RequirementFormModal';

const TabLoading = ({ label }: { label: string }) => (
  <div className="bg-white rounded-2xl border border-[#DCEBFF] p-8 text-center shadow-xs">
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#044492]">
      <RefreshCw className="w-4 h-4 animate-spin text-[#0086FF]" />
      <span>{label}</span>
    </div>
  </div>
);

const KanbanView = dynamic(() => import('@/components/KanbanView'), {
  loading: () => <TabLoading label="กำลังโหลด Kanban Board..." />,
});
const RequirementExplorerView = dynamic(() => import('@/components/RequirementExplorerView'), {
  loading: () => <TabLoading label="กำลังโหลดตาราง Requirement..." />,
});
const PriorityListView = dynamic(() => import('@/components/PriorityListView'), {
  loading: () => <TabLoading label="กำลังโหลดรายการแยกตาม Priority..." />,
});
const RequirementFormModal = dynamic(() => import('@/components/RequirementFormModal'));
const RequirementDetailModal = dynamic(() => import('@/components/RequirementDetailModal'));
const DeleteConfirmModal = dynamic(() => import('@/components/DeleteConfirmModal'));

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function HomePage() {
  const t = useTracker();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Explorer drill-down + filters
  const [filter, setFilter] = useState<RequirementFilter>(EMPTY_FILTER);
  const [explorerCore, setExplorerCore] = useState<CoreFunctionType | null>(null);
  const [explorerModule, setExplorerModule] = useState<string | null>(null);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [presets, setPresets] = useState<FormPresets>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Excel export
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Always derive the open records from live state so they never go stale.
  const detailRequirement = useMemo(
    () => t.requirements.find((r) => r.id === detailId) || null,
    [t.requirements, detailId]
  );
  const deleteTarget = useMemo(
    () => t.requirements.find((r) => r.id === deleteId) || null,
    [t.requirements, deleteId]
  );

  /* ---------- navigation helpers used by the dashboard ---------- */
  const goExplorer = (next: Partial<RequirementFilter>, core: CoreFunctionType | null = null, mod: string | null = null) => {
    setFilter({ ...EMPTY_FILTER, ...next });
    setExplorerCore(core);
    setExplorerModule(mod);
    setActiveTab('explorer');
  };

  /* ---------- create / edit ---------- */
  const openCreate = (next: FormPresets = {}) => {
    setEditing(null);
    setPresets({
      core: next.core ?? (activeTab === 'explorer' && explorerCore ? explorerCore : DEFAULT_CORE_FUNCTION),
      module: next.module ?? (activeTab === 'explorer' && explorerModule ? explorerModule : undefined),
      priority: next.priority,
      status: next.status,
    });
    setFormOpen(true);
  };

  const openEdit = (req: Requirement) => {
    setDetailId(null);
    setEditing(req);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = async (input: RequirementInput, images: RequirementImage[]) => {
    await t.saveRequirement(editing?.id ?? null, input, images);
    t.pushToast('success', editing ? `บันทึก ${editing.req_id} เรียบร้อย` : 'สร้าง Requirement ใหม่เรียบร้อย');
  };

  /* ---------- detail modal actions ---------- */
  const handleQuickUpdate = async (
    id: string,
    patch: Pick<Requirement, 'dev_assigned' | 'target_version' | 'remark'>
  ) => {
    const current = t.requirements.find((r) => r.id === id);
    if (!current) return;
    await t.saveRequirement(
      id,
      {
        title: current.title,
        priority: current.priority,
        type: current.type,
        core_function: current.core_function,
        module: current.module,
        details: current.details,
        requested_by: current.requested_by,
        request_date: current.request_date,
        status: current.status,
        ...patch,
      },
      undefined
    );
  };

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await t.deleteRequirement(deleteTarget.id);
      if (detailId === deleteTarget.id) setDetailId(null);
      t.pushToast('success', `ลบ ${deleteTarget.req_id} เรียบร้อย`);
      setDeleteId(null);
    } catch (e) {
      t.pushToast('error', errText(e));
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---------- Excel export ---------- */
  const handleExportExcel = async (targets: Requirement[], scopeTitle?: string) => {
    if (targets.length === 0) {
      t.pushToast('error', 'ไม่มีรายการ Requirement สำหรับ Export');
      return;
    }
    setExportProgress({ current: 0, total: targets.length, message: 'กำลังเตรียมโครงสร้างรายงาน Excel...' });
    try {
      const { exportRequirementsToExcel } = await import('@/lib/excel');
      await exportRequirementsToExcel(targets, {
        scopeTitle,
        onProgress: (p) => setExportProgress({ current: p.current, total: p.total, message: p.message }),
      });
    } catch (e) {
      t.pushToast('error', 'เกิดข้อผิดพลาดในการสร้าง Excel: ' + errText(e));
    } finally {
      setExportProgress(null);
    }
  };

  const exportPct =
    exportProgress && exportProgress.total > 0
      ? Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100))
      : 100;

  return (
    <div className="min-h-screen bg-[#F4F8FD] text-slate-900 pb-20">
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        total={t.requirements.length}
        loading={t.loading}
        exporting={exportProgress !== null}
        team={t.team}
        currentUser={t.currentUser}
        onCurrentUserChange={t.setCurrentUser}
        onCreate={() => openCreate()}
        onRefresh={() => void t.reload()}
        onExport={() => void handleExportExcel(t.requirements, 'All Requirements')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 space-y-5">
        {t.mode === 'local' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <b>Demo mode:</b> ยังไม่ได้เชื่อมต่อ Supabase — ข้อมูลถูกเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น
              ตั้งค่า <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> เพื่อใช้งานร่วมกันทั้งทีม
            </span>
          </div>
        )}
        {t.warning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t.warning}</span>
          </div>
        )}
        {t.loadError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs text-red-800">
            <span className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {t.loadError}
            </span>
            <button
              type="button"
              onClick={() => void t.reload()}
              className="shrink-0 px-3 py-1 rounded-lg bg-white border border-red-200 font-bold hover:bg-red-100"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <SitCountdownBanner requirements={t.requirements} />

        {t.loading && t.requirements.length === 0 && !t.loadError ? (
          <TabLoading label="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                requirements={t.requirements}
                teamMembers={t.team}
                modules={t.modules}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onSelectCoreFunction={(core) => goExplorer({}, core)}
                onFilterByModule={(mod, core) =>
                  goExplorer({}, (core as CoreFunctionType) || DEFAULT_CORE_FUNCTION, mod)
                }
                onFilterByStatus={(status) => goExplorer({ status })}
                onFilterByPriority={(priority) => goExplorer({ priority })}
                onFilterByReporter={(requested_by) => goExplorer({ requested_by })}
                onFilterByDev={(dev_assigned) => goExplorer({ dev_assigned })}
                onGoToTable={() => goExplorer({})}
                onGoToPriorityList={() => {
                  setActiveTab('priority');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeTab === 'kanban' && (
              <KanbanView
                requirements={t.requirements}
                team={t.team}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onChangeStatus={t.changeStatus}
                onCreateRequirement={(status: RequirementStatusType) => openCreate({ status })}
              />
            )}

            {activeTab === 'explorer' && (
              <RequirementExplorerView
                requirements={t.requirements}
                modules={t.modules}
                teamMembers={t.team}
                filter={filter}
                onFilterChange={setFilter}
                selectedCore={explorerCore}
                selectedModule={explorerModule}
                onSelectCore={setExplorerCore}
                onSelectModule={setExplorerModule}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onEditRequirement={openEdit}
                onDeleteRequirement={setDeleteId}
                onCreateRequirement={(core, module) => openCreate({ core, module })}
                onExportExcel={handleExportExcel}
                onAddModule={t.addModule}
                onUpdateModule={t.renameModule}
                onDeleteModule={t.deleteModule}
              />
            )}

            {activeTab === 'priority' && (
              <PriorityListView
                requirements={t.requirements}
                modules={t.modules}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onCreateRequirement={(core, module, priority) => openCreate({ core, module, priority })}
                onExportExcel={handleExportExcel}
              />
            )}
          </>
        )}
      </main>

      {exportProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">กำลังสร้างไฟล์สรุป Requirement Excel (.xlsx)</h3>
                <p className="text-xs text-slate-500 mt-0.5">{exportProgress.message}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>ความคืบหน้า</span>
                <span>{exportPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${exportPct}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      <RequirementFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={handleSave}
        initialData={editing}
        presets={presets}
        nextReqIdPreview={t.nextReqIdPreview}
        currentUser={t.currentUser}
        modules={t.modules}
        team={t.team}
        onAddModule={t.addModule}
        onAddTeamMember={(name) => t.addTeamMember(name)}
      />

      <RequirementDetailModal
        isOpen={detailRequirement !== null}
        onClose={() => setDetailId(null)}
        requirement={detailRequirement}
        team={t.team}
        onEdit={openEdit}
        onDelete={setDeleteId}
        onStatusChange={t.changeStatus}
        onQuickUpdate={handleQuickUpdate}
        loadActivity={t.loadActivity}
        onAddComment={t.addComment}
      />

      <DeleteConfirmModal
        requirement={deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />

      <ToastHost toasts={t.toasts} onDismiss={t.dismissToast} />
    </div>
  );
}
