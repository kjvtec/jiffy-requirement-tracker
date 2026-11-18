'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Layers,
  Code2,
  Tag,
  Save,
  ZoomIn,
  Flame,
  Clock,
  Compass,
  TestTube2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  Requirement,
  RequirementImage,
  RequirementStatusType,
  TeamMember,
  CORE_FUNCTION_META,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  REQUIREMENT_STATUSES,
} from '@/types';
import { getStatusBadgeClass, getStatusShortTh } from '@/lib/status';
import LightboxModal from './LightboxModal';

interface IssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Requirement | null;
  onEdit: (issue: Requirement) => void;
  onDelete: (issueId: string) => Promise<void>;
  onStatusChange: (issueId: string, newStatus: RequirementStatusType) => Promise<void>;
  onUpdateIssue: (issueId: string, updates: Partial<Requirement>, images: RequirementImage[]) => Promise<void>;
  teamMembers: TeamMember[];
  suggestedUpdaters?: string[];
}

export default function IssueDetailModal({
  isOpen,
  onClose,
  issue,
  onEdit,
  onDelete,
  onStatusChange,
  onUpdateIssue,
  teamMembers,
}: IssueDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | false>(false);

  // Quick edit fields
  const [devAssigned, setDevAssigned] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (issue) {
      setDevAssigned(issue.dev_assigned || (issue as any).closed_by || '');
      setTargetVersion(issue.target_version || (issue as any).closed_version || '');
      setRemark(issue.remark || (issue as any).resolution || '');
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
  const coreMeta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
  const displayId = issue.req_id || (issue as any).log_id || 'REQ';
  const images = issue.images || [];

  const handleStatusClick = async (newStatus: RequirementStatusType) => {
    if (newStatus === issue.status) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(issue.id, newStatus);
    } catch (e: any) {
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + (e?.message || e));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickSave = async () => {
    try {
      setIsSaving(true);
      await onUpdateIssue(
        issue.id,
        {
          dev_assigned: devAssigned.trim() || null,
          target_version: targetVersion.trim() || null,
          remark: remark.trim() || null,
          closed_by: devAssigned.trim() || null,
          closed_version: targetVersion.trim() || null,
          resolution: remark.trim() || undefined,
        },
        images
      );
      setSaveSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e: any) {
      alert('บันทึกไม่สำเร็จ: ' + (e?.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#044492] to-[#0086FF] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black px-3 py-1 bg-white text-[#044492] rounded-xl shadow-xs">
              {displayId}
            </span>
            <div>
              <span className="text-xs font-semibold text-blue-100">
                {issue.type || 'Requirement'}
              </span>
              <h2 className="text-base sm:text-lg font-black leading-tight line-clamp-1">
                {issue.title || issue.details}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(issue)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="แก้ไข Requirement"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(issue.id)}
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
              const isActive = issue.status === st;
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
                  {issue.core_function || DEFAULT_CORE_FUNCTION}
                </span>
              </div>
            </div>

            {/* Module */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Module</div>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {issue.module}
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Priority</div>
              <div className="mt-1">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${
                  issue.priority.includes('High')
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : issue.priority.includes('Medium')
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {issue.priority}
                </span>
              </div>
            </div>

            {/* Requested By */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">ผู้ขอ / วันที่ขอ</div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {issue.requested_by || (issue as any).raise_by || 'Unknown'}
              </div>
              <div className="text-[10px] text-slate-500">
                {issue.request_date || (issue as any).raise_date
                  ? new Date(issue.request_date || (issue as any).raise_date).toLocaleDateString('th-TH')
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
              {issue.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
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
                  {teamMembers.map((tm) => (
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            สร้างเมื่อ: {issue.created_at ? new Date(issue.created_at).toLocaleString('th-TH') : '-'}
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
