'use client';

import React from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import type { Requirement } from '@/types';

interface DeleteConfirmModalProps {
  requirement: Requirement | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Single, explicit confirmation step before a requirement is permanently deleted. */
export default function DeleteConfirmModal({
  requirement,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!requirement) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-md w-full overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-card shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">ยืนยันการลบ {requirement.req_id}</h3>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors disabled:opacity-50"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                {requirement.req_id}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {requirement.module}
              </span>
              <span className="text-xs font-semibold text-slate-500">• ผู้ขอ: {requirement.requested_by}</span>
            </div>
            <p className="text-xs font-medium text-slate-800 line-clamp-3 leading-relaxed">{requirement.title}</p>
            {requirement.images.length > 0 && (
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                มีรูปภาพประกอบ {requirement.images.length} รูปที่จะถูกลบออกด้วย
              </p>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            ต้องการลบ <strong className="text-red-700">{requirement.req_id}</strong> ออกจากระบบถาวรใช่หรือไม่?
            การลบนี้ไม่สามารถกู้คืนได้
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-card transition-colors disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  ยืนยันลบรายการ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
