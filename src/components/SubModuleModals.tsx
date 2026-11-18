'use client';

import React from 'react';
import {
  Edit,
  X,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Check,
  Settings,
  Search,
  FolderPlus,
  Folder,
} from 'lucide-react';
import { CoreFunctionType } from '@/types';

export interface RenameTarget {
  oldName: string;
  core: CoreFunctionType | string;
}

export interface DeleteBlockedNotice {
  moduleName: string;
  count: number;
}

export interface ConfirmDeleteTarget {
  moduleName: string;
  core: CoreFunctionType | string;
}

export interface SubModuleSummary {
  name: string;
  total: number;
  closed: number;
  open: number;
  highOpen: number;
}

export interface ActiveCoreSummary {
  core: CoreFunctionType | string;
  subModules: SubModuleSummary[];
}

interface SubModuleModalsProps {
  // Rename Modal
  renameTarget: RenameTarget | null;
  renameValue: string;
  savingRename: boolean;
  onRenameValueChange: (val: string) => void;
  onCloseRename: () => void;
  onSaveRename: () => void;

  // Delete Blocked Notice Modal
  deleteBlockedNotice: DeleteBlockedNotice | null;
  onCloseDeleteBlockedNotice: () => void;

  // Confirm Delete Modal
  confirmDeleteTarget: ConfirmDeleteTarget | null;
  deletingModule: boolean;
  onCloseConfirmDelete: () => void;
  onConfirmDelete: () => void;

  // Manage Sub-modules Modal
  managingModules: boolean;
  activeCoreSummary: ActiveCoreSummary | null;
  manageSearch: string;
  onManageSearchChange: (val: string) => void;
  onCloseManagingModules: () => void;
  onOpenAddSubModule: () => void;
  onOpenRename: (name: string, core?: CoreFunctionType | string | null) => void;
  onAttemptDeleteModule: (name: string, core: CoreFunctionType | string | null | undefined, totalCount: number) => void;
  selectedCore: CoreFunctionType | string | null;
  canUpdateModule: boolean;
  canDeleteModule: boolean;
}

export default function SubModuleModals({
  renameTarget,
  renameValue,
  savingRename,
  onRenameValueChange,
  onCloseRename,
  onSaveRename,

  deleteBlockedNotice,
  onCloseDeleteBlockedNotice,

  confirmDeleteTarget,
  deletingModule,
  onCloseConfirmDelete,
  onConfirmDelete,

  managingModules,
  activeCoreSummary,
  manageSearch,
  onManageSearchChange,
  onCloseManagingModules,
  onOpenAddSubModule,
  onOpenRename,
  onAttemptDeleteModule,
  selectedCore,
  canUpdateModule,
  canDeleteModule,
}: SubModuleModalsProps) {
  return (
    <>
      {/* Modal 1: Rename Sub-module */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
          onClick={onCloseRename}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">แก้ไขชื่อกลุ่มย่อย (Rename Module)</h3>
                  <p className="text-[11px] text-slate-500">ในกลุ่ม {renameTarget.core}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseRename}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">ชื่อกลุ่มย่อยใหม่ *</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => onRenameValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveRename();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="ระบุชื่อกลุ่มย่อยใหม่..."
              />
              <p className="text-[11px] text-slate-500">
                • เมื่อเปลี่ยนชื่อ ระบบจะอัปเดตชื่อกลุ่มย่อยใน Master Data และเปลี่ยนชื่อกลุ่มย่อยใน Issue ทั้งหมดที่เกี่ยวข้องให้อัตโนมัติ
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onCloseRename}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!renameValue.trim() || renameValue.trim() === renameTarget.oldName || savingRename}
                onClick={onSaveRename}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                {savingRename ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Delete Blocked Notice (Rule: Cannot delete if issues exist) */}
      {deleteBlockedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
          onClick={onCloseDeleteBlockedNotice}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-amber-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  ไม่สามารถลบกลุ่มย่อยนี้ได้ (ห้ามลบ)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  กลุ่มย่อย <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">"{deleteBlockedNotice.moduleName}"</span> มีปัญหา (Issue) ใช้งานอยู่จำนวน <span className="font-extrabold text-red-600">{deleteBlockedNotice.count} รายการ</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                นโยบายความปลอดภัยของระบบ:
              </div>
              <p className="text-[11px] leading-relaxed">
                ระบบไม่อนุญาตให้ลบกลุ่มย่อยที่มีข้อมูล Issue ผูกอยู่ เพื่อป้องกันไม่ให้ข้อมูลในระบบเกิดความเสียหายหรือสูญหาย
              </p>
              <div className="pt-1 text-[11px] text-slate-600 border-t border-amber-200/60">
                💡 <b>คำแนะนำ:</b> หากต้องการลบกลุ่มย่อยนี้จริง กรุณาเข้าไปเปิดแก้ไข Issue ทั้ง {deleteBlockedNotice.count} รายการดังกล่าว แล้วเปลี่ยนกลุ่มย่อยไปยังกลุ่มอื่นก่อน จากนั้นจึงจะสามารถลบกลุ่มย่อยนี้ได้ครับ
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onCloseDeleteBlockedNotice}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                รับทราบ / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirm Delete Sub-module (Only when 0 issues) */}
      {confirmDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
          onClick={onCloseConfirmDelete}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">ยืนยันการลบกลุ่มย่อย</h3>
                <p className="text-xs text-slate-600 mt-1">
                  คุณต้องการลบกลุ่มย่อย <span className="font-bold text-slate-900">"{confirmDeleteTarget.moduleName}"</span> ออกจากกลุ่ม <span className="font-bold text-slate-900">"{confirmDeleteTarget.core}"</span> ใช่หรือไม่?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>กลุ่มย่อยนี้ไม่มี Issue ใดใช้งานอยู่ สามารถลบได้อย่างปลอดภัย</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onCloseConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deletingModule}
                onClick={onConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                {deletingModule ? 'กำลังลบ...' : 'ยืนยันลบกลุ่มย่อย'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Manage Sub-modules Modal for Active Core */}
      {managingModules && activeCoreSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
          onClick={onCloseManagingModules}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    จัดการกลุ่มย่อยใน {activeCoreSummary.core}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                      {activeCoreSummary.subModules.length} กลุ่มย่อย
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    แก้ไขชื่อ หรือลบกลุ่มย่อยที่ไม่ได้ใช้งาน (หากมี Issue ใช้งานอยู่จะไม่อนุญาตให้ลบ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseManagingModules}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกลุ่มย่อย..."
                  value={manageSearch}
                  onChange={(e) => onManageSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={onOpenAddSubModule}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                เพิ่มกลุ่มย่อยใหม่
              </button>
            </div>

            {/* Modules Table List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-4">
              {activeCoreSummary.subModules
                .filter((m) => !manageSearch.trim() || m.name.toLowerCase().includes(manageSearch.toLowerCase().trim()))
                .map((mod) => (
                  <div
                    key={mod.name}
                    className="p-3 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                          {mod.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{mod.total} Issue</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">{mod.closed} ปิด</span>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold">{mod.open} ค้าง</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {mod.total > 0 ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                          มี {mod.total} Issue (ห้ามลบ)
                        </span>
                      ) : (
                        <span className="hidden sm:inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ไม่มี Issue (ลบได้)
                        </span>
                      )}

                      {canUpdateModule && (
                        <button
                          type="button"
                          onClick={() => onOpenRename(mod.name, selectedCore)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="แก้ไขชื่อกลุ่มย่อย"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" />
                          <span className="hidden sm:inline">แก้ไข</span>
                        </button>
                      )}

                      {canDeleteModule && (
                        <button
                          type="button"
                          onClick={() => onAttemptDeleteModule(mod.name, selectedCore, mod.total)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border ${
                            mod.total > 0
                              ? 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 cursor-not-allowed'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={
                            mod.total > 0
                              ? `มี ${mod.total} Issue ใช้งานกลุ่มย่อยนี้อยู่ (ห้ามลบ)`
                              : `ลบกลุ่มย่อย "${mod.name}"`
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden sm:inline">ลบ</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onCloseManagingModules}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
