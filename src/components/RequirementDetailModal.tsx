'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Edit,
  Trash2,
  Layers,
  Code2,
  ZoomIn,
  FileText,
  MessageSquare,
  History,
  Send,
  CircleHelp,
  CheckCheck,
  UserRound,
  CalendarClock,
  Sparkles,
  Activity,
  Paperclip,
  Images,
  type LucideIcon,
} from 'lucide-react';
import {
  CORE_FUNCTION_META,
  REQUIREMENT_STATUSES,
  type ActivityEntry,
  type Developer,
  type Requirement,
  type RequirementImage,
  type RequirementStatusType,
  type TeamMember,
} from '@/types';
import { CORE_ICON } from '@/lib/coreIcons';
import { STATUS_META } from '@/lib/status';
import type { NewFile } from '@/lib/data/store';
import { PriorityBadge, formatDateTime } from './Badges';
import DriveFilesPanel from './DriveFilesPanel';
import LightboxModal from './LightboxModal';
import ImageUploader from './ImageUploader';
import { encodeMessage, splitMessage } from '@/lib/activityImages';

interface RequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: Requirement | null;
  /** Requesters */
  team: TeamMember[];
  developers: Developer[];
  rememberedName: string;
  onEdit: (requirement: Requirement) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: RequirementStatusType) => Promise<void>;
  onAssignDev: (id: string, dev: string | null) => Promise<void>;
  onRequestInfo: (id: string, note: string, askedBy: string) => Promise<void>;
  onReplyInfo: (id: string, message: string, repliedBy: string) => Promise<void>;
  onAddFile: (id: string, file: NewFile) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  loadActivity: (id: string) => Promise<ActivityEntry[]>;
  onAddComment: (id: string, message: string, by: string) => Promise<void>;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function SectionTitle({ icon: Icon, tone, children }: { icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
      <span className={`h-7 w-7 rounded-lg text-white flex items-center justify-center ${tone}`}>
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      {children}
    </h4>
  );
}

const ACTIVITY_STYLE: Record<ActivityEntry['action'], { dot: string; icon: LucideIcon }> = {
  created: { dot: 'bg-sky-500', icon: Sparkles },
  status_change: { dot: 'bg-emerald-500', icon: Activity },
  comment: { dot: 'bg-amber-400', icon: MessageSquare },
  update: { dot: 'bg-slate-400', icon: Edit },
  info_request: { dot: 'bg-orange-500', icon: CircleHelp },
  info_reply: { dot: 'bg-teal-500', icon: CheckCheck },
  file: { dot: 'bg-violet-500', icon: Paperclip },
};

export default function RequirementDetailModal({
  isOpen,
  onClose,
  requirement,
  team,
  developers,
  rememberedName,
  onEdit,
  onDelete,
  onStatusChange,
  onAssignDev,
  onRequestInfo,
  onReplyInfo,
  onAddFile,
  onDeleteFile,
  loadActivity,
  onAddComment,
}: RequirementDetailModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<RequirementImage[]>([]);
  const [commentImages, setCommentImages] = useState<RequirementImage[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [devAssigned, setDevAssigned] = useState('');
  const [savingDev, setSavingDev] = useState(false);

  // information request (Dev -> requester) and the requester's answer
  const [asking, setAsking] = useState(false);
  const [askNote, setAskNote] = useState('');
  const [askBy, setAskBy] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyBy, setReplyBy] = useState('');
  const [busyInfo, setBusyInfo] = useState(false);

  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [comment, setComment] = useState('');
  const [commentBy, setCommentBy] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const reqId = requirement?.id;
  const reqStatus = requirement?.status;
  const reqInfo = requirement?.info_requested;

  const everyone = useMemo(
    () => Array.from(new Set([...developers.map((d) => d.name), ...team.map((t) => t.name)])),
    [developers, team]
  );

  /** Names grouped so Testers and Devs are never mixed together in a list. */
  const nameOptions = (
    <>
      <optgroup label="Tester">
        {team.map((t) => (
          <option key={`t-${t.id}`} value={t.name}>
            {t.name}
          </option>
        ))}
      </optgroup>
      {developers.length > 0 && (
        <optgroup label="Dev">
          {developers.map((d) => (
            <option key={`d-${d.id}`} value={d.name}>
              {d.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  // Re-sync local fields whenever a different requirement is shown.
  useEffect(() => {
    if (!requirement) return;
    setDevAssigned(requirement.dev_assigned || '');
    setAsking(false);
    setAskNote('');
    setReplyText('');
    setComment('');
    setCommentImages([]);
    setAskBy(requirement.dev_assigned || (developers.some((d) => d.name === rememberedName) ? rememberedName : ''));
    setReplyBy(requirement.requested_by || '');
    setCommentBy(rememberedName || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement?.id]);

  useEffect(() => {
    if (requirement) setDevAssigned(requirement.dev_assigned || '');
  }, [requirement]);

  const refreshActivity = useCallback(async () => {
    if (!reqId) return;
    setActivity(await loadActivity(reqId));
  }, [reqId, loadActivity]);

  // Reload the history when opening and after status / info changes.
  useEffect(() => {
    if (isOpen && reqId) void refreshActivity();
    if (!isOpen) setActivity([]);
  }, [isOpen, reqId, reqStatus, reqInfo, refreshActivity]);

  if (!isOpen || !requirement) return null;

  const coreMeta = CORE_FUNCTION_META[requirement.core_function];
  const CoreIcon = CORE_ICON[requirement.core_function];
  const images = requirement.images;
  const needsInfo = requirement.info_requested && requirement.status !== 'Done';

  const handleStatusClick = async (next: RequirementStatusType) => {
    if (next === requirement.status) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(requirement.id, next);
    } catch (e) {
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + errText(e));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveDev = async () => {
    try {
      setSavingDev(true);
      await onAssignDev(requirement.id, devAssigned || null);
      void refreshActivity();
    } catch (e) {
      alert('บันทึก Dev ไม่สำเร็จ: ' + errText(e));
    } finally {
      setSavingDev(false);
    }
  };

  const handleSendAsk = async () => {
    if (!askNote.trim()) return;
    if (!askBy) {
      alert('กรุณาเลือกชื่อ Dev ที่ขอข้อมูล');
      return;
    }
    try {
      setBusyInfo(true);
      await onRequestInfo(requirement.id, askNote.trim(), askBy);
      setAsking(false);
      setAskNote('');
    } catch (e) {
      alert('ส่งคำขอข้อมูลเพิ่มไม่สำเร็จ: ' + errText(e));
    } finally {
      setBusyInfo(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    if (!replyBy) {
      alert('กรุณาเลือกชื่อผู้ให้ข้อมูล');
      return;
    }
    try {
      setBusyInfo(true);
      await onReplyInfo(requirement.id, replyText.trim(), replyBy);
      setReplyText('');
    } catch (e) {
      alert('บันทึกการให้ข้อมูลไม่สำเร็จ: ' + errText(e));
    } finally {
      setBusyInfo(false);
    }
  };

  const handleComment = async () => {
    const text = comment.trim();
    if (!text && commentImages.length === 0) return;
    if (!commentBy) {
      alert('กรุณาเลือกชื่อผู้แสดงความเห็น');
      return;
    }
    try {
      setIsCommenting(true);
      await onAddComment(requirement.id, encodeMessage(text, commentImages), commentBy);
      setComment('');
      setCommentImages([]);
      await refreshActivity();
    } catch (e) {
      alert('บันทึกความเห็นไม่สำเร็จ: ' + errText(e));
    } finally {
      setIsCommenting(false);
    }
  };

  const describe = (a: ActivityEntry): string => {
    const message = splitMessage(a.message).text;
    switch (a.action) {
      case 'status_change':
        return `เปลี่ยนสถานะ ${a.from_status} → ${a.to_status}`;
      case 'info_request':
        return `ขอข้อมูลเพิ่ม: ${message}`;
      case 'info_reply':
        return `ให้ข้อมูลเพิ่ม: ${message}`;
      default:
        return message || (a.action === 'created' ? 'สร้าง Requirement' : 'แก้ไข Requirement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-[1280px] w-[96vw] h-[94vh] border border-line shadow-pop overflow-hidden my-2 flex flex-col">
        {/* Header */}
        <div
          className="bg-gradient-to-r from-jiffy-navy to-[#0a5fc4] p-5 text-white flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: `4px solid ${coreMeta.accentHex}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-sm font-bold px-3 py-1 bg-jiffy-yellow text-jiffy-ink rounded-lg shadow-card shrink-0">
              {requirement.req_id}
            </span>
            <div className="min-w-0">
              <span className="text-sm text-blue-100">{requirement.type}</span>
              <h2 className="text-lg font-bold leading-tight line-clamp-2">{requirement.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(requirement)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="แก้ไข Requirement"
              aria-label="แก้ไข Requirement"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(requirement.id)}
              className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 transition-colors"
              title="ลบ Requirement"
              aria-label="ลบ Requirement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="ปิด"
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status pipeline */}
        <div className="bg-slate-50 border-b border-line px-5 py-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 mr-1">สถานะ:</span>
            {REQUIREMENT_STATUSES.map((st) => {
              const meta = STATUS_META[st];
              const Icon = meta.icon;
              const active = requirement.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusClick(st)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    active
                      ? `${meta.badgeClass} ring-2 ring-offset-1 ring-jiffy-blue/40 shadow-card`
                      : 'bg-white text-slate-500 border-line hover:border-slate-400 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {meta.label}
                  {active && <span className="text-xs font-normal opacity-80">· {meta.shortTh}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 lg:p-8 space-y-7 overflow-y-auto flex-1 text-base text-slate-700">
          {/* Dev is waiting for more information */}
          {needsInfo && (
            <div className="need-info-beacon rounded-xl border-2 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <CircleHelp className="w-5 h-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-orange-900">
                    {requirement.info_requested_by || 'Dev'} ขอข้อมูลเพิ่มจาก {requirement.requested_by}
                  </div>
                  <div className="text-xs text-orange-800/80">{formatDateTime(requirement.info_requested_at)}</div>
                  <p className="mt-1.5 whitespace-pre-wrap text-orange-950">{requirement.info_request_note}</p>
                </div>
              </div>
              <div className="rounded-lg bg-white/80 border border-orange-200 p-3 space-y-2">
                <label className="text-sm font-semibold text-orange-900 block">
                  ผู้เปิด Requirement ตอบกลับ / ให้ข้อมูลเพิ่ม
                </label>
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="พิมพ์ข้อมูลที่ Dev ต้องการ (แนบรูปได้โดยกดแก้ไข Requirement)"
                  className="field"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={replyBy} onChange={(e) => setReplyBy(e.target.value)} className="field !w-auto font-semibold" aria-label="ผู้ให้ข้อมูล">
                    <option value="">-- ผู้ให้ข้อมูล --</option>
                    {nameOptions}
                  </select>
                  <button type="button" disabled={busyInfo || !replyText.trim()} onClick={handleReply} className="btn-primary">
                    <CheckCheck className="w-4 h-4" aria-hidden />
                    ให้ข้อมูลแล้ว (ปิดคำขอ)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3" style={{ borderColor: `${coreMeta.accentHex}55`, backgroundColor: `${coreMeta.accentHex}0d` }}>
              <div className="text-xs font-semibold text-slate-500">Core Function</div>
              <div className="mt-1 inline-flex items-center gap-2 font-bold" style={{ color: coreMeta.accentHex }}>
                <CoreIcon className="w-5 h-5" aria-hidden />
                {requirement.core_function}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold text-slate-500">Module</div>
              <div className="mt-1 inline-flex items-center gap-2 font-bold text-slate-800">
                <Layers className="w-4 h-4 text-slate-500" aria-hidden />
                {requirement.module}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold text-slate-500">Priority</div>
              <div className="mt-1">
                <PriorityBadge priority={requirement.priority} />
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="text-xs font-semibold text-amber-800">Tester / เปิดเมื่อ</div>
              <div className="mt-1 font-bold text-slate-800 inline-flex items-center gap-1.5">
                <UserRound className="w-4 h-4 text-amber-600" aria-hidden />
                {requirement.requested_by || '-'}
              </div>
              <div className="text-xs text-slate-600 inline-flex items-center gap-1 mt-0.5">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                {formatDateTime(requirement.request_date)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <SectionTitle icon={FileText} tone="bg-gradient-to-br from-sky-400 to-blue-600">
              รายละเอียดความต้องการ / User Story / Acceptance Criteria
            </SectionTitle>
            <div className="p-4 bg-white border border-line rounded-xl whitespace-pre-wrap leading-relaxed text-slate-800">
              {requirement.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
            </div>
          </div>

          {/* Dev + request info */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
            <SectionTitle icon={Code2} tone="bg-gradient-to-br from-indigo-400 to-violet-600">
              Dev ผู้รับผิดชอบ
            </SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select value={devAssigned} onChange={(e) => setDevAssigned(e.target.value)} className="field !w-auto min-w-[200px] font-semibold" aria-label="Dev ผู้รับผิดชอบ">
                <option value="">-- ยังไม่มอบหมาย Dev --</option>
                {devAssigned && !developers.some((d) => d.name === devAssigned) && <option value={devAssigned}>{devAssigned}</option>}
                {developers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={savingDev || devAssigned === (requirement.dev_assigned || '')}
                onClick={handleSaveDev}
                className="btn-brand"
              >
                {savingDev ? 'กำลังบันทึก...' : 'บันทึก Dev'}
              </button>
              <span className="flex-1" />
              {!needsInfo && !asking && (
                <button type="button" onClick={() => setAsking(true)} className="btn bg-orange-500 text-white hover:bg-orange-600 shadow-card">
                  <CircleHelp className="w-4 h-4" aria-hidden />
                  ขอข้อมูลเพิ่ม
                </button>
              )}
            </div>

            {asking && (
              <div className="rounded-lg bg-white border border-orange-300 p-3 space-y-2">
                <label className="text-sm font-semibold text-orange-900 block">
                  ข้อมูลที่ต้องการจาก {requirement.requested_by} (ผู้เปิด Requirement)
                </label>
                <textarea
                  rows={3}
                  autoFocus
                  value={askNote}
                  onChange={(e) => setAskNote(e.target.value)}
                  placeholder="ระบุสิ่งที่ต้องการให้ผู้เปิด Requirement ชี้แจงหรือส่งเพิ่ม เช่น ตัวอย่างหน้าจอ เงื่อนไขการคำนวณ"
                  className="field"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select value={askBy} onChange={(e) => setAskBy(e.target.value)} className="field !w-auto font-semibold" aria-label="Dev ที่ขอข้อมูล">
                    <option value="">-- Dev ที่ขอข้อมูล --</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={busyInfo || !askNote.trim()} onClick={handleSendAsk} className="btn bg-orange-500 text-white hover:bg-orange-600">
                    <Send className="w-4 h-4" aria-hidden />
                    ส่งคำขอ
                  </button>
                  <button type="button" onClick={() => setAsking(false)} className="btn-secondary">
                    ยกเลิก
                  </button>
                </div>
                <p className="text-xs text-slate-500">เมื่อส่งแล้ว หน้าหลักจะแสดงป้าย &quot;ขอข้อมูลเพิ่ม&quot; แบบกะพริบจนกว่าผู้เปิด Requirement จะให้ข้อมูล</p>
              </div>
            )}
          </div>

          {/* Files from developers (Google Drive) */}
          <DriveFilesPanel
            files={requirement.files}
            uploaders={developers.map((d) => d.name)}
            defaultUploader={requirement.dev_assigned || (developers.some((d) => d.name === rememberedName) ? rememberedName : '')}
            onAdd={(file) => onAddFile(requirement.id, file)}
            onDelete={onDeleteFile}
          />

          {/* Wireframes */}
          {images.length > 0 && (
            <div className="space-y-2">
              <SectionTitle icon={Images} tone="bg-gradient-to-br from-fuchsia-400 to-violet-600">
                รูปภาพ Wireframe / Mockup ({images.length} รูป)
              </SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => {
                      setLightboxImages(images);
                      setActiveImageIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className="group relative aspect-video rounded-xl border border-line overflow-hidden bg-slate-100 hover:border-jiffy-blue transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold gap-1">
                      <ZoomIn className="w-4 h-4" aria-hidden />
                      ดูภาพขยาย
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="space-y-3">
            <SectionTitle icon={History} tone="bg-gradient-to-br from-amber-400 to-orange-500">
              ประวัติการดำเนินงาน &amp; ความเห็น ({activity.length})
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
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
                placeholder="เพิ่มความเห็น / อัปเดตความคืบหน้า"
                aria-label="ความเห็น"
                className="field flex-1 min-w-[220px]"
              />
              <select value={commentBy} onChange={(e) => setCommentBy(e.target.value)} className="field !w-auto font-semibold" aria-label="ผู้แสดงความเห็น">
                <option value="">-- ชื่อผู้ส่ง --</option>
                {nameOptions}
              </select>
              <button type="button" disabled={isCommenting || (!comment.trim() && commentImages.length === 0)} onClick={handleComment} className="btn-brand">
                <Send className="w-4 h-4" aria-hidden />
                ส่ง
              </button>
            </div>
            <ImageUploader
              images={commentImages}
              onChange={setCommentImages}
              folder={`${requirement.req_id}-update`}
              title="แนบรูปประกอบการอัปเดต (กด Ctrl+V เพื่อแปะได้ทันที)"
              bucketName="requirement-attachments"
            />
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีประวัติ</p>
            ) : (
              <ol className="space-y-3 border-l-2 border-slate-200 ml-3 pl-5">
                {activity.map((a) => {
                  const style = ACTIVITY_STYLE[a.action] ?? ACTIVITY_STYLE.update;
                  const Icon = style.icon;
                  return (
                    <li key={a.id} className="relative">
                      <span className={`absolute -left-[33px] top-0.5 h-6 w-6 rounded-full ring-4 ring-white flex items-center justify-center text-white ${style.dot}`}>
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                      </span>
                      <div className="text-xs text-slate-500">
                        <b className="text-slate-700">{a.actor}</b> · {formatDateTime(a.created_at)}
                      </div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{describe(a)}</div>
                      {(() => {
                        const imgs = splitMessage(a.message).images;
                        if (imgs.length === 0) return null;
                        return (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {imgs.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setLightboxImages(imgs);
                                  setActiveImageIndex(i);
                                  setLightboxOpen(true);
                                }}
                                className="h-24 w-36 rounded-lg border border-line overflow-hidden bg-slate-100 hover:border-jiffy-blue"
                                title={img.file_name}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.file_url} alt={img.file_name} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-line flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">สร้างเมื่อ {formatDateTime(requirement.created_at)}</div>
          <button type="button" onClick={onClose} className="btn-secondary">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <LightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={lightboxImages}
          currentIndex={activeImageIndex}
          onNavigate={setActiveImageIndex}
        />
      )}
    </div>
  );
}
