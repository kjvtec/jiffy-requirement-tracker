'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit,
  Trash2,
  Layers,
  Code2,
  Save,
  ZoomIn,
  FileText,
  MessageSquare,
  History,
  Send,
} from 'lucide-react';
import {
  CORE_FUNCTION_META,
  REQUIREMENT_STATUSES,
  type ActivityEntry,
  type Requirement,
  type RequirementStatusType,
  type TeamMember,
} from '@/types';
import { getStatusBadgeClass, getStatusShortTh } from '@/lib/status';
import LightboxModal from './LightboxModal';

interface RequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: Requirement | null;
  team: TeamMember[];
  onEdit: (requirement: Requirement) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: RequirementStatusType) => Promise<void>;
  onQuickUpdate: (
    id: string,
    patch: Pick<Requirement, 'dev_assigned' | 'target_version' | 'remark'>
  ) => Promise<void>;
  loadActivity: (id: string) => Promise<ActivityEntry[]>;
  onAddComment: (id: string, message: string) => Promise<void>;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function RequirementDetailModal({
  isOpen,
  onClose,
  requirement,
  team,
  onEdit,
  onDelete,
  onStatusChange,
  onQuickUpdate,
  loadActivity,
  onAddComment,
}: RequirementDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | false>(false);

  const [devAssigned, setDevAssigned] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [remark, setRemark] = useState('');

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const reqId = requirement?.id;
  const reqStatus = requirement?.status;

  // Re-sync the quick-edit fields whenever a different requirement is shown
  // or the saved values change underneath us.
  useEffect(() => {
    if (!requirement) return;
    setDevAssigned(requirement.dev_assigned || '');
    setTargetVersion(requirement.target_version || '');
    setRemark(requirement.remark || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement?.id, requirement?.dev_assigned, requirement?.target_version, requirement?.remark]);

  const refreshActivity = useCallback(async () => {
    if (!reqId) return;
    setActivity(await loadActivity(reqId));
  }, [reqId, loadActivity]);

  // Reload the history when opening and after every status change.
  useEffect(() => {
    if (isOpen && reqId) void refreshActivity();
    if (!isOpen) setActivity([]);
  }, [isOpen, reqId, reqStatus, refreshActivity]);

  if (!isOpen || !requirement) return null;

  const coreMeta = CORE_FUNCTION_META[requirement.core_function];
  const images = requirement.images;

  const handleStatusClick = async (newStatus: RequirementStatusType) => {
    if (newStatus === requirement.status) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(requirement.id, newStatus);
    } catch (e) {
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + errText(e));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickSave = async () => {
    try {
      setIsSaving(true);
      await onQuickUpdate(requirement.id, {
        dev_assigned: devAssigned || null,
        target_version: targetVersion.trim() || null,
        remark: remark.trim() || null,
      });
      setSaveSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setSaveSuccess(false), 2500);
      void refreshActivity();
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + errText(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleComment = async () => {
    const text = comment.trim();
    if (!text) return;
    try {
      setIsCommenting(true);
      await onAddComment(requirement.id, text);
      setComment('');
      await refreshActivity();
    } catch (e) {
      alert('บันทึกความเห็นไม่สำเร็จ: ' + errText(e));
    } finally {
      setIsCommenting(false);
    }
  };

  const describe = (a: ActivityEntry): string => {
    if (a.action === 'status_change') return `เปลี่ยนสถานะ ${a.from_status} → ${a.to_status}`;
    return a.message || (a.action === 'created' ? 'สร้าง Requirement' : 'แก้ไข Requirement');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#044492] to-[#0086FF] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black px-3 py-1 bg-white text-[#044492] rounded-xl shadow-xs">
              {requirement.req_id}
            </span>
            <div>
              <span className="text-xs font-semibold text-blue-100">
                {requirement.type}
              </span>
              <h2 className="text-base sm:text-lg font-black leading-tight line-clamp-1">
                {requirement.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(requirement)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="แก้ไข Requirement"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(requirement.id)}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-colors"
              title="ลบ Requirement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Pipeline Switcher */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <span>สถานะงาน (Workflow Status):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {REQUIREMENT_STATUSES.map((st) => {
              const isActive = requirement.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusClick(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? `${getStatusBadgeClass(st)} ring-2 ring-blue-400/50 shadow-xs`
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {st} ({getStatusShortTh(st)})
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Core Function */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Core Function</div>
              <div className="mt-1">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}>
                  {requirement.core_function}
                </span>
              </div>
            </div>

            {/* Module */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Module</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {requirement.module}
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Priority</div>
              <div className="mt-1">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${
                  requirement.priority.includes('High')
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : requirement.priority.includes('Medium')
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {requirement.priority}
                </span>
              </div>
            </div>

            {/* Requested By */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">ผู้ขอ / วันที่ขอ</div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {requirement.requested_by || 'Unknown'}
              </div>
              <div className="text-[10px] text-slate-500">
                {requirement.request_date
                  ? new Date(requirement.request_date).toLocaleDateString('th-TH')
                  : '-'}
              </div>
            </div>
          </div>

          {/* Details / User Story Section */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0086FF]" />
              รายละเอียดความต้องการ / User Story / Acceptance Criteria
            </h4>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl whitespace-pre-wrap leading-relaxed text-slate-800 text-xs">
              {requirement.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </div>
          </div>

          {/* Dev Assignment & Version Control Panel */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#044492] text-xs flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#0086FF]" />
                ข้อมูลการพัฒนา (Development & Release Info)
              </h4>
              {saveSuccess && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {saveSuccess}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Dev ผู้รับผิดชอบ (Dev Assigned)
                </label>
                <select
                  value={devAssigned}
                  onChange={(e) => setDevAssigned(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="">-- ยังไม่มอบหมาย Dev --</option>
                  {team.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name} {tm.role ? `(${tm.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Version / Sprint
                </label>
                <input
                  type="text"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  placeholder="เช่น v1.2.0, Sprint 4"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม / Dev Notes (Remark)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="เช่น สรุปผลการทดสอบ, จุดที่ต้องระวัง, หรือสถานะการส่งมอบ..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none text-xs"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleQuickSave}
                  className="px-4 py-2 bg-[#044492] hover:bg-[#0086FF] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>

          {/* Attached Wireframes / Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">
                รูปภาพ Wireframe / Mockup ({images.length} รูป)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className="group relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer hover:border-[#0086FF] transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.file_url}
                      alt={img.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <ZoomIn className="w-4 h-4" />
                      คลิกดูภาพขยาย
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity history & comments */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#0086FF]" />
              ประวัติการดำเนินงาน &amp; ความเห็น ({activity.length})
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleComment();
                  }
                }}
                placeholder="เพิ่มความเห็น / อัปเดตความคืบหน้า..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none text-xs focus:ring-2 focus:ring-[#0086FF]"
              />
              <button
                type="button"
                disabled={isCommenting || !comment.trim()}
                onClick={handleComment}
                className="px-4 py-2 bg-[#044492] hover:bg-[#0086FF] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                ส่ง
              </button>
            </div>
            {activity.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-1">ยังไม่มีประวัติ</p>
            ) : (
              <ol className="space-y-2 border-l-2 border-slate-200 ml-1.5 pl-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span
                      className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                        a.action === 'comment'
                          ? 'bg-amber-400'
                          : a.action === 'status_change'
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="text-[11px] text-slate-500">
                      <b className="text-slate-700">{a.actor}</b> •{' '}
                      {new Date(a.created_at).toLocaleString('th-TH')}
                    </div>
                    <div className="text-xs text-slate-800 whitespace-pre-wrap flex items-start gap-1">
                      {a.action === 'comment' && <MessageSquare className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />}
                      {describe(a)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            สร้างเมื่อ: {requirement.created_at ? new Date(requirement.created_at).toLocaleString('th-TH') : '-'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Lightbox for zooming attached wireframe images */}
      {lightboxOpen && (
        <LightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={images}
          currentIndex={activeImageIndex}
          onNavigate={setActiveImageIndex}
        />
      )}
    </div>
  );
}
