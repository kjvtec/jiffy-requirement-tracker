'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, PlusCircle, Lock, Code2 } from 'lucide-react';
import {
  CORE_FUNCTIONS,
  DEFAULT_CORE_FUNCTION,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  type CoreFunctionType,
  type PriorityType,
  type Requirement,
  type RequirementImage,
  type RequirementInput,
  type RequirementStatusType,
  type RequirementType,
  type SystemModule,
  type TeamMember,
} from '@/types';
import ImageUploader from './ImageUploader';

export interface FormPresets {
  core?: CoreFunctionType;
  module?: string;
  priority?: PriorityType;
  status?: RequirementStatusType;
}

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: RequirementInput, images: RequirementImage[]) => Promise<void>;
  /** When set the modal edits this requirement, otherwise it creates a new one. */
  initialData?: Requirement | null;
  presets?: FormPresets;
  /** Preview only - the real ID is assigned by the database on save. */
  nextReqIdPreview: string;
  currentUser: string;
  modules: SystemModule[];
  team: TeamMember[];
  onAddModule: (name: string, core: CoreFunctionType) => Promise<void>;
  onAddTeamMember: (name: string) => Promise<void>;
}

const todayYmd = () => new Date().toISOString().slice(0, 10);

const inputCls = 'field';

export default function RequirementFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  presets,
  nextReqIdPreview,
  currentUser,
  modules,
  team,
  onAddModule,
  onAddTeamMember,
}: RequirementFormModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityType>('2.Medium');
  const [type, setType] = useState<RequirementType>('New Feature');
  const [coreFunction, setCoreFunction] = useState<CoreFunctionType>(DEFAULT_CORE_FUNCTION);
  const [module, setModule] = useState('');
  const [details, setDetails] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestDate, setRequestDate] = useState(todayYmd());
  const [status, setStatus] = useState<RequirementStatusType>('Draft');
  const [devAssigned, setDevAssigned] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [remark, setRemark] = useState('');
  const [images, setImages] = useState<RequirementImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newModuleName, setNewModuleName] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);

  const firstModuleOf = (core: string) => modules.find((m) => m.core_function === core)?.name;

  const modulesFor = (core: string) =>
    modules
      .filter((m) => m.core_function === core)
      .map((m) => m.name)
      .sort((a, b) => a.localeCompare(b, 'th'));

  const availableModules = useMemo(() => {
    const list = modulesFor(coreFunction);
    // Keep a module visible even if it was removed from the list after this requirement used it.
    if (module && !list.includes(module)) list.unshift(module);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, coreFunction, module]);

  // Reset the form only when the modal opens (or switches to another record) -
  // NOT when the team/module lists change, otherwise typed input would be wiped.
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setTitle(initialData.title);
      setPriority(initialData.priority);
      setType(initialData.type);
      setCoreFunction(initialData.core_function);
      setModule(initialData.module);
      setDetails(initialData.details);
      setRequestedBy(initialData.requested_by);
      setRequestDate(initialData.request_date.slice(0, 10));
      setStatus(initialData.status);
      setDevAssigned(initialData.dev_assigned || '');
      setTargetVersion(initialData.target_version || '');
      setRemark(initialData.remark || '');
      setImages(initialData.images);
    } else {
      const core = presets?.core || DEFAULT_CORE_FUNCTION;
      setTitle('');
      setPriority(presets?.priority || '2.Medium');
      setType('New Feature');
      setCoreFunction(core);
      setModule(presets?.module || firstModuleOf(core) || 'General');
      setDetails('');
      setRequestedBy(currentUser || team[0]?.name || '');
      setRequestDate(todayYmd());
      setStatus(presets?.status || 'Draft');
      setDevAssigned('');
      setTargetVersion('');
      setRemark('');
      setImages([]);
    }
    setShowAddModule(false);
    setShowAddMember(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกหัวข้อ Requirement');
      return;
    }
    if (!requestedBy) {
      alert('กรุณาเลือกผู้ขอ (Requested By)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(
        {
          title: title.trim(),
          priority,
          type,
          core_function: coreFunction,
          module: module || 'General',
          details: details.trim(),
          requested_by: requestedBy,
          request_date: new Date(`${requestDate || todayYmd()}T00:00:00`).toISOString(),
          status,
          dev_assigned: devAssigned || null,
          target_version: targetVersion.trim() || null,
          remark: remark.trim() || null,
        },
        images
      );
      onClose();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddModule = async () => {
    const name = newModuleName.trim();
    if (!name) return;
    try {
      await onAddModule(name, coreFunction);
      setModule(name);
      setNewModuleName('');
      setShowAddModule(false);
    } catch (err) {
      alert('เพิ่มโมดูลไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    if (!name) return;
    try {
      await onAddTeamMember(name);
      setRequestedBy(name);
      setNewMemberName('');
      setShowAddMember(false);
    } catch (err) {
      alert('เพิ่มสมาชิกไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const reqIdLabel = initialData ? initialData.req_id : `${nextReqIdPreview} (รันอัตโนมัติ)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        <div className="bg-jiffy-navy p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold tracking-normal">
              {initialData ? 'แก้ไข Requirement' : 'บันทึก Requirement ใหม่'}
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">Jiffy Requirement Tracker (New POS Jiffy)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Req ID & Title */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Req ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={reqIdLabel}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-jiffy-navy cursor-not-allowed text-xs"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                หัวข้อ Requirement <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="สรุปหัวข้อความต้องการสั้นกระชับ เช่น สแกน Weight Barcode 13 หลัก"
                className={`${inputCls} font-semibold`}
                maxLength={255}
                required
              />
            </div>
          </div>

          {/* Core Function & Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Core Function (ระบบหลัก)</label>
              <select
                value={coreFunction}
                onChange={(e) => {
                  const next = e.target.value as CoreFunctionType;
                  setCoreFunction(next);
                  setModule(firstModuleOf(next) || 'General');
                }}
                className={`${inputCls} font-bold`}
              >
                {CORE_FUNCTIONS.map((cf) => (
                  <option key={cf} value={cf}>
                    {cf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-700">โมดูลย่อย (Module)</label>
                <button
                  type="button"
                  onClick={() => setShowAddModule((prev) => !prev)}
                  className="text-xs font-semibold text-jiffy-blue hover:underline flex items-center gap-0.5"
                >
                  <PlusCircle className="w-3 h-3" />
                  {showAddModule ? 'ยกเลิก' : 'เพิ่มโมดูล'}
                </button>
              </div>

              {showAddModule ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddModule();
                      }
                    }}
                    placeholder="ชื่อโมดูลใหม่..."
                    className="flex-1 field flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="btn-brand shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className={`${inputCls} font-semibold`}
                >
                  {availableModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Priority, Type, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority (ความเร่งด่วน)</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className={`${inputCls} font-bold`}
              >
                <option value="1.High">1.High (สำคัญมาก/เร่งด่วน)</option>
                <option value="2.Medium">2.Medium (สำคัญปานกลาง)</option>
                <option value="3.Low">3.Low (สำคัญน้อย)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ประเภท (Requirement Type)</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RequirementType)}
                className={`${inputCls} font-bold`}
              >
                {REQUIREMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">สถานะ (Status)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RequirementStatusType)}
                className={`${inputCls} font-bold`}
              >
                <option value="Draft">Draft (ร่างข้อกำหนด)</option>
                <option value="In Review">In Review (รอตรวจทาน)</option>
                <option value="In Development">In Development (Dev กำลังทำ)</option>
                <option value="Testing">Testing (กำลังทดสอบ/UAT)</option>
                <option value="Done">Done (เสร็จสมบูรณ์)</option>
              </select>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              รายละเอียดความต้องการ / User Story / Acceptance Criteria
            </label>
            <textarea
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ระบุพฤติกรรมของระบบที่ต้องการ เงื่อนไขการคำนวณ หรือ Acceptance Criteria..."
              className={`${inputCls} py-2.5 leading-relaxed`}
            />
          </div>

          {/* Dev & Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div>
              <label className="block font-bold text-jiffy-navy mb-1 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5" />
                Dev ผู้รับผิดชอบ (Dev Assigned)
              </label>
              <select
                value={devAssigned}
                onChange={(e) => setDevAssigned(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-jiffy-blue outline-none text-xs"
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
              <label className="block font-bold text-jiffy-navy mb-1">Target Version / Sprint</label>
              <input
                type="text"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="เช่น v1.2.0, Sprint 4"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-jiffy-blue outline-none text-xs"
              />
            </div>
          </div>

          {/* Requested By & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-700">ผู้ขอ (Requested By)</label>
                <button
                  type="button"
                  onClick={() => setShowAddMember((prev) => !prev)}
                  className="text-xs font-semibold text-jiffy-blue hover:underline flex items-center gap-0.5"
                >
                  <PlusCircle className="w-3 h-3" />
                  {showAddMember ? 'ยกเลิก' : 'เพิ่มสมาชิกทีม'}
                </button>
              </div>

              {showAddMember ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddMember();
                      }
                    }}
                    placeholder="ชื่อสมาชิกใหม่..."
                    className="flex-1 field flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="btn-brand shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className={`${inputCls} font-semibold`}
                >
                  {!team.some((t) => t.name === requestedBy) && requestedBy && (
                    <option value={requestedBy}>{requestedBy}</option>
                  )}
                  {team.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">วันที่ขอ (Request Date)</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              หมายเหตุเพิ่มเติม / Dev Notes (Remark)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุ สรุปผลการพัฒนา หรือผลการประสานงาน..."
              className={inputCls}
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5.5">
              รูปภาพ Wireframe / Mockup / เอกสารประกอบ (กด Ctrl+V เพื่อแปะได้ทันที)
            </label>
            <ImageUploader
              images={images}
              onChange={setImages}
              folder={initialData?.req_id}
              bucketName="requirement-attachments"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก Requirement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
