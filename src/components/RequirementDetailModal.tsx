'use client';

import React, { useState } from 'react';
import {
  X,
  Edit,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Layers,
  ExternalLink,
  ZoomIn,
  Code2,
  Tag,
  FileText,
  Clock,
  Sparkles,
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
import { getStatusBadgeClass } from '@/lib/status';
import LightboxModal from './LightboxModal';
import ImageUploader from './ImageUploader';

interface RequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: Requirement | null;
  onEdit: (requirement: Requirement) => void;
  onDelete: (reqId: string) => Promise<void>;
  onStatusChange: (requirementId: string, newStatus: RequirementStatusType) => Promise<void>;
  onUpdateRequirement: (
    requirementId: string,
    updates: Partial<Requirement>,
    images: RequirementImage[]
  ) => Promise<void>;
  teamMembers: TeamMember[];
}

export default function RequirementDetailModal({
  isOpen,
  onClose,
  requirement,
  onEdit,
  onDelete,
  onStatusChange,
  onUpdateRequirement,
  teamMembers,
}: RequirementDetailModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingDev, setIsEditingDev] = useState(false);
  const [devInput, setDevInput] = useState('');

  if (!isOpen || !requirement) return null;

  const coreMeta =
    CORE_FUNCTION_META[(requirement.core_function as CoreFunctionType) || DEFAULT_CORE_FUNCTION] ||
    CORE_FUNCTION_META[DEFAULT_CORE_FUNCTION];

  const handleStatusClick = async (newStatus: RequirementStatusType) => {
    if (newStatus === requirement.status) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(requirement.id, newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveDev = async () => {
    try {
      await onUpdateRequirement(
        requirement.id,
        { dev_assigned: devInput.trim() || null },
        requirement.images || []
      );
      setIsEditingDev(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = async () => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ Requirement: ${requirement.req_id}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(requirement.id);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleImagesChange = async (newImages: RequirementImage[]) => {
    try {
      await onUpdateRequirement(requirement.id, {}, newImages);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100/70 border border-sky-200 px-2.5 py-1 rounded-lg">
              {requirement.req_id}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                  requirement.status
                )}`}
              >
                {requirement.status}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {requirement.priority}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {requirement.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(requirement)}
              className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200"
              title="แก้ไข Requirement"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
              title="ลบ Requirement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {requirement.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                ผู้ขอ: <strong className="text-slate-700">{requirement.requested_by}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                วันที่: {new Date(requirement.request_date).toLocaleDateString('th-TH')}
              </span>
              <span>•</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${coreMeta.badgeBg} ${coreMeta.badgeText} ${coreMeta.badgeBorder}`}
              >
                {requirement.core_function || DEFAULT_CORE_FUNCTION}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {requirement.module}
              </span>
            </div>
          </div>

          {/* Quick Status Workflow Step */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Workflow Status (คลิกเพื่อเปลี่ยนสถานะ)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {REQUIREMENT_STATUSES.map((st) => {
                const isActive = requirement.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusClick(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-center ${
                      isActive
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              รายละเอียดความต้องการ / Acceptance Criteria
            </label>
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {requirement.details}
            </div>
          </div>

          {/* Dev Assigned & Target Version Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  Dev ผู้รับผิดชอบ (Assignee)
                </span>
                {!isEditingDev && (
                  <button
                    type="button"
                    onClick={() => {
                      setDevInput(requirement.dev_assigned || '');
                      setIsEditingDev(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    แก้ไข
                  </button>
                )}
              </div>
              {isEditingDev ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={devInput}
                    onChange={(e) => setDevInput(e.target.value)}
                    placeholder="ระบุชื่อ Dev..."
                    className="flex-1 px-2.5 py-1 text-xs border border-indigo-300 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDev}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDev(false)}
                    className="px-2 py-1 text-xs text-slate-400"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-800">
                  {requirement.dev_assigned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700">
                      {requirement.dev_assigned}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">ยังไม่ได้กำหนด Dev</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1 mb-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Target Version / Sprint
              </span>
              <p className="text-xs font-medium text-slate-800">
                {requirement.target_version ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700">
                    {requirement.target_version}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">ยังไม่ได้กำหนด Version</span>
                )}
              </p>
            </div>
          </div>

          {/* Remark */}
          {requirement.remark && (
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs">
              <span className="font-semibold text-amber-900 block mb-1">
                หมายเหตุเพิ่มเติม / Dev Notes:
              </span>
              <p className="text-amber-800 whitespace-pre-wrap">{requirement.remark}</p>
            </div>
          )}

          {/* Images Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <ImageUploader
              images={requirement.images || []}
              onChange={handleImagesChange}
              reqId={requirement.req_id}
              title="รูปภาพ Wireframe / Mockup ประกอบ (คลิกเพื่อขยาย)"
            />

            {requirement.images && requirement.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {requirement.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative group border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-100 cursor-pointer hover:shadow-md transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.file_url}
                      alt={img.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="p-1.5 bg-white/90 rounded-full text-slate-800">
                        <ZoomIn className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {requirement.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && requirement.images && (
        <LightboxModal
          isOpen={true}
          images={requirement.images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
        />
      )}
    </div>
  );
}
