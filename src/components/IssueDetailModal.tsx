'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Edit,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Layers,
  ExternalLink,
  Save,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FolderTree,
  MessageSquare,
  HelpCircle,
  Send,
  History,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import {
  Issue,
  IssueImage,
  StatusType,
  TeamMember,
  CORE_FUNCTION_META,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
} from '@/types';
import {
  appendTimelineEntry,
  collectSuggestedUpdaters,
  getLatestTimelineInfo,
  parseResolutionTimeline,
  readRecentUpdaters,
  saveRecentUpdater,
} from '@/lib/timeline';
import { getStatusBadgeClass } from '@/lib/status';
import LightboxModal from './LightboxModal';
import ImageUploader from './ImageUploader';

interface IssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
  onEdit: (issue: Issue) => void;
  onDelete: (issueId: string) => Promise<void>;
  onStatusChange: (issueId: string, newStatus: StatusType) => Promise<void>;
  onUpdateIssue: (issueId: string, updates: Partial<Issue>, images: IssueImage[]) => Promise<void>;
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
  suggestedUpdaters = [],
}: IssueDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | false>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Composer state for new Timeline update + editable closing metadata
  const [updatedBy, setUpdatedBy] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [closedBy, setClosedBy] = useState('');
  const [closedVersion, setClosedVersion] = useState('');
  const [remark, setRemark] = useState('');

  // Existing & newly attached images
  const [existingImages, setExistingImages] = useState<IssueImage[]>([]);
  const [newImages, setNewImages] = useState<IssueImage[]>([]);

  const lastIssueIdRef = useRef<string | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  // Sync state when issue opens or updates
  useEffect(() => {
    if (!issue) {
      lastIssueIdRef.current = null;
      return;
    }

    const switchedIssue = issue.id !== lastIssueIdRef.current;
    setClosedBy(issue.closed_by || '');
    setClosedVersion(issue.closed_version || '');
    setRemark(issue.remark || '');
    setExistingImages(issue.images || []);

    if (switchedIssue) {
      lastIssueIdRef.current = issue.id;
      setNewMessage('');
      setNewImages([]);
      setSelectedPreviewIndex(0);
      setSaveSuccess(false);
      setValidationError(null);
      const recent = readRecentUpdaters();
      setUpdatedBy(recent[0] || '');
    }
  }, [issue]);

  // Parse Timeline & Latest Updater from issue.resolution
  const timelineEntries = useMemo(
    () => parseResolutionTimeline(issue?.resolution),
    [issue?.resolution]
  );

  const latestTimelineInfo = useMemo(
    () =>
      issue
        ? getLatestTimelineInfo(issue)
        : { latestAuthor: null, latestTimestamp: null, latestStatus: null, latestMessage: null, entryCount: 0 },
    [issue]
  );

  // Build deduplicated quick-select chips (prioritizing case owner, then team, then recent/learned Dev names)
  const quickUpdaterNames = useMemo(() => {
    if (!issue) return [];
    const base = collectSuggestedUpdaters([issue], teamMembers, [issue.raise_by]);
    const combined = [...base, ...suggestedUpdaters];
    const seen = new Set<string>();
    const unique: string[] = [];
    combined.forEach((name) => {
      const clean = name.trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(clean);
      }
    });
    return unique;
  }, [issue, teamMembers, suggestedUpdaters]);

  if (!isOpen || !issue) return null;

  const handleOpenLightbox = (index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  // Unified save handler for Inline Update & Timeline Actions
  const handleSaveUpdate = async (targetStatus?: StatusType, customSuccessText?: string) => {
    setValidationError(null);
    const trimmedAuthor = updatedBy.trim();
    const trimmedMsg = newMessage.trim();
    const hasNewImages = newImages.length > 0;
    const isStatusTransition = targetStatus !== undefined && targetStatus !== issue.status;
    const nextStatus = targetStatus ?? (issue.status as StatusType);

    // Require author + message when requesting Need Info or replying with new content
    if (targetStatus === 'Need Info' && (!trimmedAuthor || (!trimmedMsg && !hasNewImages))) {
      setValidationError('กรุณาระบุ "ชื่อผู้อัปเดต" และพิมพ์รายละเอียดข้อมูลที่ต้องการขอเพิ่มจากผู้เปิด Case');
      return;
    }

    if ((trimmedMsg || isStatusTransition) && !trimmedAuthor) {
      setValidationError('กรุณาระบุ "ชื่อผู้อัปเดต" ก่อนบันทึกข้อความหรือเปลี่ยนสถานะ (พิมพ์ชื่อเองหรือคลิกเลือกด้านล่าง)');
      return;
    }

    if (hasNewImages && !trimmedAuthor && !trimmedMsg) {
      setValidationError('กรุณาระบุ "ชื่อผู้อัปเดต" เพื่อบันทึกผู้แนบรูปภาพเพิ่มเติม');
      return;
    }

    setIsSaving(true);
    try {
      let nextResolution = issue.resolution || '';
      const shouldAppendTimeline = Boolean(trimmedMsg || hasNewImages || isStatusTransition);

      if (shouldAppendTimeline) {
        const autoMessage =
          trimmedMsg ||
          (hasNewImages
            ? `แนบรูปภาพเพิ่มเติม (${newImages.length} รูป)`
            : `เปลี่ยนสถานะเป็น ${nextStatus}`);

        nextResolution = appendTimelineEntry(issue.resolution, {
          author: trimmedAuthor,
          statusLabel: nextStatus,
          message: autoMessage,
        });
        saveRecentUpdater(trimmedAuthor);
      }

      const combinedImages = [...existingImages, ...newImages];
      const updates: Partial<Issue> = {
        resolution: nextResolution,
        closed_by: closedBy,
        closed_version: closedVersion,
        remark,
      };
      if (targetStatus) {
        updates.status = targetStatus;
        if (targetStatus === 'Closed') {
          if (!updates.closed_by) {
            updates.closed_by = trimmedAuthor || 'Kampon';
          }
          updates.closed_date = new Date().toISOString();
        }
      }

      await onUpdateIssue(issue.id, updates, combinedImages);

      setExistingImages(combinedImages);
      setNewImages([]);
      if (shouldAppendTimeline) {
        setNewMessage('');
      }
      setSaveSuccess(
        customSuccessText ||
          (targetStatus === 'Need Info'
            ? `ส่งขอข้อมูลเพิ่มถึง ${issue.raise_by} แล้ว`
            : targetStatus
              ? `บันทึกและเปลี่ยนสถานะเป็น ${targetStatus} แล้ว`
              : 'บันทึกการอัปเดตสำเร็จ!')
      );
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to update issue inline:', err);
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatus = async (status: StatusType) => {
    // If user already typed a message and updater name, save it together with status change
    if (newMessage.trim() && updatedBy.trim()) {
      await handleSaveUpdate(status);
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(issue.id, status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete an existing image
  const handleDeleteExistingImage = async (indexToDelete: number) => {
    if (!confirm('ยืนยันการลบรูปภาพนี้ออกจาก Issue หรือไม่?')) return;
    const updated = existingImages.filter((_, idx) => idx !== indexToDelete);
    setExistingImages(updated);
    if (selectedPreviewIndex >= updated.length) {
      setSelectedPreviewIndex(Math.max(0, updated.length - 1));
    }
    await onUpdateIssue(
      issue.id,
      { resolution: issue.resolution || '', closed_by: closedBy, closed_version: closedVersion, remark },
      [...updated, ...newImages]
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority.includes('High')) return 'bg-red-50 text-red-700 border-red-200';
    if (priority.includes('Medium')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const currentPreviewImage = existingImages[selectedPreviewIndex] || existingImages[0];
  const isNeedInfo = issue.status === 'Need Info';

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-white bg-indigo-600 px-3.5 py-1 rounded-xl shadow-sm">
                {issue.log_id}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${getPriorityBadge(issue.priority)}`}>
                {issue.priority}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${getStatusBadgeClass(
                  issue.status
                )}`}
              >
                {isNeedInfo && <HelpCircle className="w-3.5 h-3.5 text-orange-600" />}
                {isNeedInfo ? 'Need Info (รอข้อมูลเพิ่ม)' : issue.status}
              </span>
              {(() => {
                const coreFn = (issue.core_function || DEFAULT_CORE_FUNCTION) as CoreFunctionType;
                const meta = CORE_FUNCTION_META[coreFn] || CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];
                return (
                  <span className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                    <FolderTree className="w-3.5 h-3.5" />
                    {coreFn}
                  </span>
                );
              })()}
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 font-medium">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {issue.module}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onEdit(issue)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-indigo-600" />
                แก้ไขทุกช่อง
              </button>
              <button
                type="button"
                onClick={() => onDelete(issue.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="ลบรายการนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Need Info Alert Callout Banner */}
            {isNeedInfo && (
              <div className="rounded-2xl border-2 border-orange-300 shadow-xs bg-gradient-to-r from-orange-50 via-amber-50/90 to-orange-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-500 text-white shrink-0 shadow-xs">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-orange-950">
                        Dev ขอข้อมูลเพิ่มเติม — รอผู้เปิด Case ({issue.raise_by}) ตอบกลับ
                      </h4>
                      {latestTimelineInfo.latestAuthor && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-orange-800 border border-orange-300">
                          ถามโดย: {latestTimelineInfo.latestAuthor}
                        </span>
                      )}
                    </div>
                    {latestTimelineInfo.latestMessage && (
                      <p className="text-xs text-orange-900/90 whitespace-pre-wrap leading-relaxed bg-white/80 px-3 py-2 rounded-xl border border-orange-200">
                        {latestTimelineInfo.latestMessage}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0 self-start sm:self-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  ตอบกลับข้อมูลเพิ่ม ↓
                </button>
              </div>
            )}

            {/* Meta info row (8 balanced slots) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Core Function (กลุ่มหลัก):</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {issue.core_function || DEFAULT_CORE_FUNCTION}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Module (กลุ่มย่อย):</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {issue.module}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">ผู้รับผิดชอบ (คนเปิด Case):</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{issue.raise_by}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    เจ้าของเคส
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">วันที่แจ้ง:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {issue.raise_date ? new Date(issue.raise_date).toLocaleDateString('th-TH') : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">อัปเดตล่าสุดโดย (Updated By):</span>
                {latestTimelineInfo.latestAuthor ? (
                  <div>
                    <span className="font-bold text-indigo-700 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      {latestTimelineInfo.latestAuthor}
                    </span>
                    {latestTimelineInfo.latestTimestamp && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {latestTimelineInfo.latestTimestamp}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold text-slate-500">-</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block mb-1">ผู้ปิดงาน (Closed By):</span>
                <span className="font-semibold text-slate-800">
                  {closedBy || issue.closed_by || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Closed Version:</span>
                <span className="font-semibold text-slate-800">
                  {closedVersion || issue.closed_version || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">หมายเหตุ (Remark):</span>
                <span className="font-medium text-slate-700 line-clamp-2">
                  {remark || issue.remark || '-'}
                </span>
              </div>
            </div>

            {/* LARGE IMAGE PREVIEW SECTION */}
            {existingImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span>รูปภาพหลักฐาน ({existingImages.length} รูป)</span>
                    <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      รูปที่ {selectedPreviewIndex + 1} จาก {existingImages.length}
                    </span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(selectedPreviewIndex)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                      title="ลบรูปนี้ออกจาก Issue"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> ลบรูปนี้
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLightbox(selectedPreviewIndex)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> ขยายดูภาพเต็มจอ
                    </button>
                  </div>
                </div>

                {/* Big Image Viewer Container */}
                <div className="relative rounded-2xl border-2 border-slate-200 bg-slate-900/5 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 group">
                  <div
                    onClick={() => handleOpenLightbox(selectedPreviewIndex)}
                    className="cursor-pointer max-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPreviewImage.file_url}
                      alt={currentPreviewImage.file_name}
                      className="max-h-[480px] w-auto max-w-full object-contain rounded-lg shadow-sm group-hover:scale-[1.01] transition-transform duration-200"
                    />
                  </div>

                  {existingImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPreviewIndex((prev) => (prev > 0 ? prev - 1 : existingImages.length - 1))
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-110"
                        title="รูปก่อนหน้า"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPreviewIndex((prev) => (prev < existingImages.length - 1 ? prev + 1 : 0))
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-transform hover:scale-110"
                        title="รูปถัดไป"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  <div
                    onClick={() => handleOpenLightbox(selectedPreviewIndex)}
                    className="mt-2 text-xs text-slate-500 flex items-center gap-1 cursor-pointer hover:text-indigo-600 font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> คลิกที่รูปเพื่อซูมขนาดใหญ่พิเศษ
                  </div>
                </div>

                {existingImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                    {existingImages.map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedPreviewIndex(idx)}
                        className={`relative rounded-xl overflow-hidden border-2 flex-shrink-0 w-24 h-16 bg-slate-100 transition-all ${
                          selectedPreviewIndex === idx
                            ? 'border-indigo-600 ring-2 ring-indigo-300 scale-105'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.file_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-1 text-[9px] bg-black/70 text-white px-1 rounded font-bold">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                รายละเอียดปัญหา (Details)
              </h3>
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                {issue.details}
              </div>
            </div>

            {/* TIMELINE / CONVERSATION HISTORY SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>ประวัติการอัปเดต & โต้ตอบ (Timeline)</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {timelineEntries.length} รายการ
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  บันทึกต่อเนื่องโดยไม่ทับข้อความเดิม
                </span>
              </div>

              {timelineEntries.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  ยังไม่มีประวัติการอัปเดตหรือการขอข้อมูลเพิ่ม — สามารถบันทึกได้ในกล่องด้านล่าง
                </div>
              ) : (
                <div className="space-y-2.5">
                  {timelineEntries.map((entry, idx) => {
                    if (entry.isLegacy) {
                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>บันทึกแนวทางแก้ไขเดิม (Resolution)</span>
                          </div>
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{entry.message}</p>
                        </div>
                      );
                    }

                    const entryIsNeedInfo = entry.statusLabel === 'Need Info';
                    const isCaseOwner =
                      entry.author &&
                      issue.raise_by &&
                      entry.author.toLowerCase() === issue.raise_by.toLowerCase();

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-2 shadow-2xs ${
                          entryIsNeedInfo
                            ? 'bg-orange-50/70 border-orange-200'
                            : entry.statusLabel === 'Closed'
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 ${
                                entryIsNeedInfo
                                  ? 'bg-orange-500'
                                  : isCaseOwner
                                    ? 'bg-indigo-600'
                                    : 'bg-slate-700'
                              }`}
                            >
                              {(entry.author || '?').slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-bold text-slate-900">{entry.author || 'ไม่ระบุ'}</span>
                            {isCaseOwner && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                คนเปิด Case
                              </span>
                            )}
                            {entry.statusLabel && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClass(
                                  entry.statusLabel
                                )}`}
                              >
                                {entry.statusLabel === 'Need Info'
                                  ? 'Need Info (ขอข้อมูลเพิ่ม)'
                                  : entry.statusLabel}
                              </span>
                            )}
                          </div>
                          {entry.timestamp && (
                            <span className="text-[11px] font-medium text-slate-400">
                              {entry.timestamp}
                            </span>
                          )}
                        </div>
                        {entry.message && (
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed pl-8">
                            {entry.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* INLINE UPDATE SECTION */}
            <div
              ref={composerRef}
              className={`rounded-2xl border-2 p-5 space-y-4 shadow-sm ${
                isNeedInfo
                  ? 'border-orange-200 bg-gradient-to-b from-orange-50/40 to-white'
                  : 'border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg text-white ${isNeedInfo ? 'bg-orange-500' : 'bg-indigo-600'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isNeedInfo
                        ? `ตอบกลับข้อมูลเพิ่มเติม / อัปเดต (${issue.raise_by} เจ้าของ Case)`
                        : 'อัปเดตข้อมูล / ขอข้อมูลเพิ่ม / บันทึกผลการแก้ไข (Inline Update)'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ระบุชื่อผู้อัปเดตเองได้อิสระ ข้อความใหม่จะเพิ่มต่อใน Timeline โดยคงผู้รับผิดชอบเป็น {issue.raise_by} เหมือนเดิม
                    </p>
                  </div>
                </div>

                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveSuccess}
                  </span>
                )}
              </div>

              {/* Self-Entered Updater Name + Quick Pick Chips */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    ชื่อผู้อัปเดตครั้งนี้ (Updated By) *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    พิมพ์ชื่อตนเอง (เช่น ชื่อ Dev) หรือคลิกเลือกด่วน
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={updatedBy}
                    onChange={(e) => {
                      setUpdatedBy(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="พิมพ์ชื่อผู้อัปเดตด้วยตนเอง เช่น Dev Bom, Nat, Kampon..."
                    className="flex-1 px-3.5 py-2 text-sm font-semibold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50/50 focus:bg-white"
                  />
                  {updatedBy && (
                    <button
                      type="button"
                      onClick={() => setUpdatedBy('')}
                      className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl"
                      title="ล้างชื่อผู้อัปเดต"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {quickUpdaterNames.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">เลือกด่วน:</span>
                    {quickUpdaterNames.map((name) => {
                      const isSelected = updatedBy.trim().toLowerCase() === name.toLowerCase();
                      const isOwner = name.toLowerCase() === issue.raise_by.toLowerCase();
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setUpdatedBy(name);
                            if (validationError) setValidationError(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : isOwner
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {name}
                          {isOwner ? ' (คนเปิด Case)' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* New Update Message Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isNeedInfo
                    ? 'ข้อความตอบกลับข้อมูลเพิ่มเติมสำหรับ Dev:'
                    : 'ข้อความอัปเดตใหม่ (คำถามขอข้อมูลเพิ่ม / แนวทางแก้ไข / ข้อความตอบกลับ):'}
                </label>
                <textarea
                  rows={3}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={
                    isNeedInfo
                      ? 'ระบุข้อมูลเพิ่มเติมที่ Dev ถามหา เช่น ตั้งค่าไว้แบบใด, แนบภาพหน้าจอเพิ่ม, ขั้นตอนที่พบปัญหา...'
                      : 'ระบุสิ่งที่ต้องการขอข้อมูลเพิ่มจากผู้เปิด Case หรือรายละเอียดการแก้ไข (จะเพิ่มเป็นรายการใหม่ใน Timeline)...'
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white leading-relaxed"
                />
              </div>

              {/* Add More Images (ImageUploader with Ctrl+V) */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <ImageUploader
                  images={newImages}
                  onChange={setNewImages}
                  issueLogId={issue.log_id}
                  title="แนบรูปภาพเพิ่มเติม (ถ้ามี)"
                />
              </div>

              {/* Closed details & Remark */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Closed By (ผู้ปิดงาน):
                  </label>
                  <select
                    value={closedBy}
                    onChange={(e) => setClosedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="">-- ยังไม่ระบุ --</option>
                    {teamMembers.map((tm) => (
                      <option key={tm.id} value={tm.name}>
                        {tm.name} {tm.name === 'Kampon' ? '⭐ (Lead)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Closed Version:
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น v1.0.1, Hotfix-1"
                    value={closedVersion}
                    onChange={(e) => setClosedVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remark (หมายเหตุ):
                  </label>
                  <input
                    type="text"
                    placeholder="หมายเหตุเพิ่มเติม..."
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none bg-white"
                  />
                </div>
              </div>

              {validationError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Inline Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                {isNeedInfo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveUpdate(undefined, 'บันทึกข้อความใน Need Info แล้ว')}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      บันทึกข้อความ (คง Need Info)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveUpdate('Open', `ตอบข้อมูลเพิ่มถึง Dev และส่งกลับ Open แล้ว`)
                      }
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-200 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      ตอบข้อมูลเพิ่ม → ส่งกลับ Open
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveUpdate('In Progress', `ตอบข้อมูลเพิ่มและส่งต่อ In Progress แล้ว`)
                      }
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      ตอบข้อมูลเพิ่ม → In Progress
                    </button>
                  </>
                ) : (
                  <>
                    {issue.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => handleSaveUpdate('Need Info')}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-200 transition-all hover:scale-[1.02] disabled:opacity-50"
                      >
                        <HelpCircle className="w-4 h-4" />
                        {isSaving
                          ? 'กำลังบันทึก...'
                          : `Dev ขอข้อมูลเพิ่ม (Need Info ถึง ${issue.raise_by})`}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSaveUpdate(undefined)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'กำลังบันทึก...' : 'บันทึกการอัปเดต (Save Updates)'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick status bar footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600 font-bold">เปลี่ยนสถานะด่วน:</span>
              <button
                disabled={isUpdatingStatus || isSaving || issue.status === 'Open'}
                onClick={() => handleQuickStatus('Open')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
              >
                Open
              </button>
              <button
                disabled={isUpdatingStatus || isSaving || issue.status === 'Need Info'}
                onClick={() => handleQuickStatus('Need Info')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                Need Info (ขอข้อมูล)
              </button>
              <button
                disabled={isUpdatingStatus || isSaving || issue.status === 'In Progress'}
                onClick={() => handleQuickStatus('In Progress')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                In Progress
              </button>
              <button
                disabled={isUpdatingStatus || isSaving || issue.status === 'Test'}
                onClick={() => handleQuickStatus('Test')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                Ready for Test
              </button>
              <button
                disabled={isUpdatingStatus || isSaving || issue.status === 'Closed'}
                onClick={() => {
                  if (!closedBy) setClosedBy('Kampon');
                  handleQuickStatus('Closed');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                Close Issue
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox for full size photo zoom */}
      {existingImages.length > 0 && (
        <LightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={existingImages}
          currentIndex={activeImageIndex}
          onNavigate={setActiveImageIndex}
        />
      )}
    </>
  );
}
