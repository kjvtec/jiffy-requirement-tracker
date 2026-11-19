'use client';

import React, { useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import {
  DEFAULT_CORE_FUNCTION,
  EMPTY_FILTER,
  type CoreFunctionType,
  type Requirement,
  type RequirementFilter,
  type RequirementImage,
  type RequirementInput,
} from '@/types';
import { useTracker } from '@/hooks/useTracker';
import AppHeader, { type ActiveTab } from '@/components/AppHeader';
import DashboardView from '@/components/DashboardView';
import SitCountdownBanner from '@/components/SitCountdownBanner';
import ToastHost from '@/components/ToastHost';
import type { FormPresets } from '@/components/RequirementFormModal';

const TabLoading = ({ label }: { label: string }) => (
  <div className="card p-8 text-center">
    <div className="inline-flex items-center gap-2 text-sm font-semibold text-jiffy-navy">
      <RefreshCw className="w-4 h-4 animate-spin text-jiffy-blue" />
      <span>{label}</span>
    </div>
  </div>
);

const RequirementExplorerView = dynamic(() => import('@/components/RequirementExplorerView'), {
  loading: () => <TabLoading label="กำลังโหลดตาราง Requirement..." />,
});
const PriorityListView = dynamic(() => import('@/components/PriorityListView'), {
  loading: () => <TabLoading label="กำลังโหลดรายการแยกตาม Priority..." />,
});
const RequirementFormModal = dynamic(() => import('@/components/RequirementFormModal'));
const RequirementDetailModal = dynamic(() => import('@/components/RequirementDetailModal'));
const DeleteConfirmModal = dynamic(() => import('@/components/DeleteConfirmModal'));

const TAB_HEADINGS: Record<ActiveTab, { title: string; description: string }> = {
  dashboard: { title: 'ภาพรวมโครงการ', description: 'ความคืบหน้าของ Requirement แยกตามระบบหลัก โมดูล และผู้รับผิดชอบ' },
  explorer: { title: 'ตาราง Requirement', description: 'ค้นหา กรอง เรียงลำดับ และจัดการ Requirement ทั้งหมด คลิกหัวคอลัมน์เพื่อเรียง A-Z / Z-A' },
  priority: { title: 'แยกตาม Priority', description: 'มุมมองแบบกะทัดรัด จัดลำดับงานจาก High ไป Low เพื่อวางแผนให้ทันกำหนด SIT' },
};

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

  /**
   * Deleting is protected: a normal click only shows a "no permission" warning.
   * Clicking delete 5 times in a row on the same requirement (each within 4 seconds
   * of the previous click) opens the confirmation dialog.
   */
  const deleteClicks = useRef<{ id: string; count: number; at: number }>({ id: '', count: 0, at: 0 });
  const requestDelete = (id: string) => {
    const now = Date.now();
    const c = deleteClicks.current;
    deleteClicks.current =
      c.id === id && now - c.at <= 4000 ? { id, count: c.count + 1, at: now } : { id, count: 1, at: now };
    if (deleteClicks.current.count >= 5) {
      deleteClicks.current = { id: '', count: 0, at: 0 };
      setDeleteId(id);
      return;
    }
    t.pushToast('error', 'ไม่มีสิทธิ์ลบ Requirement กรุณาติดต่อผู้ดูแลระบบ');
  };

  // Excel export
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string } | null>(null);

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
  const goExplorer = (
    next: Partial<RequirementFilter>,
    core: CoreFunctionType | null = null,
    mod: string | null = null
  ) => {
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
  const handleAssignDev = async (id: string, dev: string | null) => {
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
        dev_assigned: dev,
      },
      undefined
    );
    t.pushToast('success', dev ? `มอบหมายให้ ${dev} แล้ว` : 'ยกเลิกการมอบหมาย Dev แล้ว');
  };

  const handleRequestInfo = async (id: string, note: string, askedBy: string) => {
    await t.requestInfo(id, note, askedBy);
    t.pushToast('success', 'ส่งคำขอข้อมูลเพิ่มแล้ว');
  };

  const handleReplyInfo = async (id: string, message: string, repliedBy: string) => {
    await t.replyInfo(id, message, repliedBy);
    t.pushToast('success', 'บันทึกการให้ข้อมูลแล้ว ปิดคำขอเรียบร้อย');
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
    <div className="min-h-screen bg-canvas text-slate-900 pb-16">
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        total={t.requirements.length}
        needsInfoCount={t.needsInfoCount}
        loading={t.loading}
        exporting={exportProgress !== null}
        onCreate={() => openCreate()}
        onRefresh={() => void t.reload()}
        onExport={() => void handleExportExcel(t.requirements, 'All Requirements')}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {t.mode === 'local' && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <b>Demo mode:</b> ยังไม่ได้เชื่อมต่อ Supabase — ข้อมูลถูกเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น ตั้งค่า{' '}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> เพื่อใช้งานร่วมกันทั้งทีม
            </span>
          </div>
        )}
        {t.warning && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t.warning}</span>
          </div>
        )}
        {t.loadError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {t.loadError}
            </span>
            <button
              type="button"
              onClick={() => void t.reload()}
              className="shrink-0 px-3 py-1 rounded-lg bg-white border border-red-200 font-semibold hover:bg-red-100"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-jiffy-ink leading-tight">{TAB_HEADINGS[activeTab].title}</h2>
          <p className="text-sm text-slate-600 mt-0.5">{TAB_HEADINGS[activeTab].description}</p>
        </div>

        {activeTab === 'dashboard' && <SitCountdownBanner requirements={t.requirements} />}

        {t.loading && t.requirements.length === 0 && !t.loadError ? (
          <TabLoading label="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                requirements={t.requirements}
                developers={t.developers}
                modules={t.modules}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onSelectCoreFunction={(core) => goExplorer({}, core)}
                onFilterByModule={(mod, core) => goExplorer({}, (core as CoreFunctionType) || DEFAULT_CORE_FUNCTION, mod)}
                onFilterByStatus={(status) => goExplorer({ status })}
                onFilterByPriority={(priority) => goExplorer({ priority })}
                onFilterByType={(type) => goExplorer({ type })}
                onFilterByDev={(dev_assigned) => goExplorer({ dev_assigned })}
                onFilterNeedsInfo={() => goExplorer({ needs_info: true })}
                onGoToTable={() => goExplorer({})}
                onGoToPriorityList={() => {
                  setActiveTab('priority');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onRenameDeveloper={t.renameDeveloper}
                onAddDeveloper={t.addDeveloper}
                onDeleteDeveloper={t.deleteDeveloper}
              />
            )}

            {activeTab === 'explorer' && (
              <RequirementExplorerView
                requirements={t.requirements}
                modules={t.modules}
                developers={t.developers}
                team={t.team}
                filter={filter}
                onFilterChange={setFilter}
                selectedCore={explorerCore}
                selectedModule={explorerModule}
                onSelectCore={setExplorerCore}
                onSelectModule={setExplorerModule}
                onSelectRequirement={(r) => setDetailId(r.id)}
                onEditRequirement={openEdit}
                onDeleteRequirement={requestDelete}
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
          <div className="bg-white rounded-2xl shadow-pop max-w-md w-full p-6 border border-line space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">กำลังสร้างไฟล์สรุป Requirement Excel (.xlsx)</h3>
                <p className="text-xs text-slate-500 mt-0.5">{exportProgress.message}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
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
        rememberedName={t.lastName}
        modules={t.modules}
        team={t.team}
        developers={t.developers}
        onAddModule={t.addModule}
        onAddTeamMember={(name) => t.addTeamMember(name)}
        onAddDeveloper={t.addDeveloper}
      />

      <RequirementDetailModal
        isOpen={detailRequirement !== null}
        onClose={() => setDetailId(null)}
        requirement={detailRequirement}
        team={t.team}
        developers={t.developers}
        rememberedName={t.lastName}
        onEdit={openEdit}
        onDelete={requestDelete}
        onStatusChange={t.changeStatus}
        onAssignDev={handleAssignDev}
        onRequestInfo={handleRequestInfo}
        onReplyInfo={handleReplyInfo}
        onAddFile={t.addFile}
        onDeleteFile={t.deleteFile}
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
