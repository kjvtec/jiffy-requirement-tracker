'use client';

import React from 'react';
import { ShieldAlert, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Issue } from '@/types';

interface DeleteGuardOverlayProps {
  warningVisible: boolean;
  onDismissWarning: () => void;
  confirmIssue: Issue | null;
  isDeleting: boolean;
  onCancelConfirm: () => void;
  onConfirmDelete: () => Promise<void>;
}

/**
 * Shared guard UI for protected issue deletion:
 * - Shows a clear non-blocking warning banner for regular users (clicks 1–4).
 * - Shows an Admin Confirm Delete modal after 5 consecutive clicks on the same issue.
 */
export default function DeleteGuardOverlay({
  warningVisible,
  onDismissWarning,
  confirmIssue,
  isDeleting,
  onCancelConfirm,
  onConfirmDelete,
}: DeleteGuardOverlayProps) {
  return (
    <>
      {/* Regular-user Permission Warning Banner (Non-blocking so Admin can reach 5 clicks smoothly) */}
      {warningVisible && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] w-[92vw] max-w-md pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="bg-white border-2 border-red-400 rounded-2xl shadow-xl shadow-red-900/15 p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-red-900">
                ไม่มีสิทธิ์ดำเนินการ
              </h4>
              <p className="text-xs font-medium text-red-700 mt-0.5 leading-relaxed">
                ไม่มีสิทธิ์แก้ไขหรือลบ กรุณาติดต่อผู้ดูแล
              </p>
            </div>
            <button
              type="button"
              onClick={onDismissWarning}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="ปิดแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Confirm Delete Popup (Unlocked on 5th consecutive delete click) */}
      {confirmIssue && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                    Admin Confirmation
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    ยืนยันการลบรายการ {confirmIssue.log_id}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancelConfirm}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    {confirmIssue.log_id}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {confirmIssue.module}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    • ผู้แจ้ง: {confirmIssue.raise_by}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-800 line-clamp-3 leading-relaxed">
                  {confirmIssue.details}
                </p>
                {confirmIssue.images && confirmIssue.images.length > 0 && (
                  <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 pt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    มีรูปภาพประกอบ {confirmIssue.images.length} รูปที่จะถูกลบออกด้วย
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                คุณต้องการลบรายการ <strong className="text-red-700">{confirmIssue.log_id}</strong> ออกจากระบบถาวรใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={onCancelConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={onConfirmDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors disabled:opacity-60"
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
      )}
    </>
  );
}
