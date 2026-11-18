'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, PlusCircle, Lock, FolderTree, Code2, User } from 'lucide-react';
import {
  CORE_FUNCTIONS,
  CoreFunctionType,
  DEFAULT_CORE_FUNCTION,
  DEFAULT_MODULES_BY_CORE,
  Requirement,
  RequirementImage,
  PriorityType,
  RequirementStatusType,
  RequirementType,
  TeamMember,
  SystemModule,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
} from '@/types';
import ImageUploader from './ImageUploader';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reqData: Partial<Requirement>, images: RequirementImage[]) => Promise<void>;
  initialData?: Requirement | null;
  suggestedLogId?: string;
  defaultCoreFunction?: CoreFunctionType | string;
  defaultModule?: string;
  defaultPriority?: PriorityType;
  modules: SystemModule[];
  teamMembers: TeamMember[];
  onAddModule?: (name: string, coreFunction: CoreFunctionType | string) => Promise<void>;
  onAddTeamMember?: (name: string) => Promise<void>;
}

export default function IssueModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  suggestedLogId = 'JFY-REQ-01',
  defaultCoreFunction,
  defaultModule,
  defaultPriority,
  modules,
  teamMembers,
  onAddModule,
  onAddTeamMember,
}: IssueModalProps) {
  const [reqId, setReqId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityType>('2.Medium');
  const [type, setType] = useState<RequirementType>('New Feature');
  const [coreFunction, setCoreFunction] = useState<CoreFunctionType | string>(DEFAULT_CORE_FUNCTION);
  const [module, setModule] = useState('');
  const [details, setDetails] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [status, setStatus] = useState<RequirementStatusType>('Draft');
  const [devAssigned, setDevAssigned] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [remark, setRemark] = useState('');
  const [images, setImages] = useState<RequirementImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New module & member creation
  const [newModuleName, setNewModuleName] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);

  // Available modules for current core function
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    const defaults = DEFAULT_MODULES_BY_CORE[coreFunction as CoreFunctionType] || [];
    defaults.forEach((m) => set.add(m));

    modules.forEach((m) => {
      const mCore = m.core_function || DEFAULT_CORE_FUNCTION;
      if (mCore === coreFunction) {
        set.add(m.name);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [modules, coreFunction]);

  useEffect(() => {
    if (initialData) {
      setReqId(initialData.req_id || (initialData as any).log_id || '');
      setTitle(initialData.title || initialData.details || '');
      setPriority((initialData.priority as PriorityType) || '2.Medium');
      setType((initialData.type as RequirementType) || 'New Feature');
      setCoreFunction(initialData.core_function || DEFAULT_CORE_FUNCTION);
      setModule(initialData.module || '');
      setDetails(initialData.details || '');
      setRequestedBy(initialData.requested_by || (initialData as any).raise_by || '');
      setRequestDate(initialData.request_date || (initialData as any).raise_date || new Date().toISOString().slice(0, 10));
      setStatus((initialData.status as RequirementStatusType) || 'Draft');
      setDevAssigned(initialData.dev_assigned || (initialData as any).closed_by || '');
      setTargetVersion(initialData.target_version || (initialData as any).closed_version || '');
      setRemark(initialData.remark || (initialData as any).resolution || '');
      setImages(initialData.images || []);
    } else {
      setReqId(suggestedLogId);
      setTitle('');
      setPriority(defaultPriority || '2.Medium');
      setType('New Feature');
      const initCore = (defaultCoreFunction as CoreFunctionType) || DEFAULT_CORE_FUNCTION;
      setCoreFunction(initCore);
      const defaults = DEFAULT_MODULES_BY_CORE[initCore] || [];
      setModule(defaultModule || defaults[0] || 'General');
      setDetails('');
      setRequestedBy(teamMembers[0]?.name || 'Nat');
      setRequestDate(new Date().toISOString().slice(0, 10));
      setStatus('Draft');
      setDevAssigned('');
      setTargetVersion('v1.0.0');
      setRemark('');
      setImages([]);
    }
  }, [initialData, suggestedLogId, defaultCoreFunction, defaultModule, defaultPriority, teamMembers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !details.trim()) {
      alert('กรุณากรอกหัวข้อหรือรายละเอียด Requirement');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(
        {
          req_id: reqId,
          title: title.trim() || details.slice(0, 60),
          priority,
          type,
          core_function: coreFunction as CoreFunctionType,
          module,
          details: details.trim(),
          requested_by: requestedBy,
          request_date: requestDate,
          status,
          dev_assigned: devAssigned.trim() || null,
          target_version: targetVersion.trim() || null,
          remark: remark.trim() || null,
          // compatibility
          log_id: reqId,
          raise_by: requestedBy,
          raise_date: requestDate,
          closed_by: devAssigned.trim() || null,
          closed_version: targetVersion.trim() || null,
          resolution: remark.trim() || undefined,
        },
        images
      );
      onClose();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModuleName.trim() || !onAddModule) return;
    try {
      await onAddModule(newModuleName.trim(), coreFunction);
      setModule(newModuleName.trim());
      setNewModuleName('');
      setShowAddModule(false);
    } catch (err: any) {
      alert('เพิ่มโมดูลไม่สำเร็จ: ' + (err?.message || err));
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !onAddTeamMember) return;
    try {
      await onAddTeamMember(newMemberName.trim());
      setRequestedBy(newMemberName.trim());
      setNewMemberName('');
      setShowAddMember(false);
    } catch (err: any) {
      alert('เพิ่มสมาชิกไม่สำเร็จ: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#044492] to-[#0086FF] p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black tracking-tight">
              {initialData ? 'แก้ไข Requirement' : 'บันทึก Requirement ใหม่'}
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Jiffy Requirement Tracker ( New Pos Jiffy)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Row 1: Req ID & Title */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Req ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={reqId}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-[#044492] cursor-not-allowed text-xs"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">
                หัวข้อ Requirement <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="สรุปหัวข้อความต้องการสั้นกระชับ เช่น สแกน Weight Barcode 13 หลัก"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
                required
              />
            </div>
          </div>

          {/* Row 2: Core Function & Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Core Function (ระบบหลัก)
              </label>
              <select
                value={coreFunction}
                onChange={(e) => {
                  const newCore = e.target.value as CoreFunctionType;
                  setCoreFunction(newCore);
                  const defaults = DEFAULT_MODULES_BY_CORE[newCore] || [];
                  setModule(defaults[0] || 'General');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
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
                <label className="font-bold text-slate-700">โมดูลย่อย (Module)</label>
                <button
                  type="button"
                  onClick={() => setShowAddModule((prev) => !prev)}
                  className="text-[11px] font-semibold text-[#0086FF] hover:underline flex items-center gap-0.5"
                >
                  <PlusCircle className="w-3 h-3" />
                  {showAddModule ? 'ยกเลิก' : '+ เพิ่มโมดูล'}
                </button>
              </div>

              {showAddModule ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="ชื่อโมดูลใหม่..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-3 py-2 bg-[#044492] text-white font-bold rounded-xl text-xs"
                  >
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
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

          {/* Row 3: Priority, Type, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Priority (ความเร่งด่วน)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
              >
                <option value="1.High">1.High (สำคัญมาก/เร่งด่วน)</option>
                <option value="2.Medium">2.Medium (สำคัญปานกลาง)</option>
                <option value="3.Low">3.Low (สำคัญน้อย)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ประเภท (Requirement Type)
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RequirementType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
              >
                {REQUIREMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                สถานะ (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RequirementStatusType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
              >
                <option value="Draft">Draft (ร่างข้อกำหนด)</option>
                <option value="In Review">In Review (รอตรวจทาน)</option>
                <option value="In Development">In Development (Dev กำลังทำ)</option>
                <option value="Testing">Testing (กำลังทดสอบ/UAT)</option>
                <option value="Done">Done (เสร็จสมบูรณ์)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Details (User Story / Acceptance Criteria) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              รายละเอียดความต้องการ / User Story / Acceptance Criteria
            </label>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ระบุพฤติกรรมของระบบที่ต้องการ เงื่อนไขการคำนวณ หรือ Acceptance Criteria..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0086FF] outline-none text-xs leading-relaxed"
            />
          </div>

          {/* Row 5: Dev Assigned & Target Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
            <div>
              <label className="block font-bold text-[#044492] mb-1 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5" />
                Dev ผู้รับผิดชอบ (Dev Assigned)
              </label>
              <select
                value={devAssigned}
                onChange={(e) => setDevAssigned(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
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
              <label className="block font-bold text-[#044492] mb-1">
                Target Version / Sprint
              </label>
              <input
                type="text"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="เช่น v1.2.0, Sprint 4"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
              />
            </div>
          </div>

          {/* Row 6: Requested By & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">ผู้ขอ (Requested By)</label>
                <button
                  type="button"
                  onClick={() => setShowAddMember((prev) => !prev)}
                  className="text-[11px] font-semibold text-[#0086FF] hover:underline flex items-center gap-0.5"
                >
                  <PlusCircle className="w-3 h-3" />
                  {showAddMember ? 'ยกเลิก' : '+ เพิ่มผู้ขอ'}
                </button>
              </div>

              {showAddMember ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="ชื่อผู้ขอใหม่..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-2 bg-[#044492] text-white font-bold rounded-xl text-xs"
                  >
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
                >
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                วันที่ขอ (Request Date)
              </label>
              <input
                type="date"
                value={requestDate.slice(0, 10)}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
              />
            </div>
          </div>

          {/* Row 7: Remark / Dev Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              หมายเหตุเพิ่มเติม / Dev Notes (Remark)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุ สรุปผลการพัฒนา หรือผลการประสานงาน..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0086FF] outline-none text-xs"
            />
          </div>

          {/* Row 8: Image Uploader with Paste Support */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              รูปภาพ Wireframe / Mockup / เอกสารประกอบ (กด Ctrl+V เพื่อแปะได้ทันที)
            </label>
            <ImageUploader
              images={images}
              onChange={setImages}
              bucketName="requirement-attachments"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFCB06] hover:bg-[#E5B600] text-slate-950 font-black transition-all shadow-md disabled:opacity-50"
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
