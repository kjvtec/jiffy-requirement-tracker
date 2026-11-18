'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, PlusCircle, Lock, FolderTree, Code2, Tag, FileText } from 'lucide-react';
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
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  TeamMember,
  SystemModule,
} from '@/types';
import ImageUploader from './ImageUploader';

interface RequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reqData: Partial<Requirement>, images: RequirementImage[]) => Promise<void>;
  initialData?: Requirement | null;
  suggestedReqId?: string;
  defaultCoreFunction?: CoreFunctionType | string;
  defaultModule?: string;
  defaultPriority?: PriorityType;
  modules: SystemModule[];
  teamMembers: TeamMember[];
  onAddModule?: (name: string, coreFunction: CoreFunctionType | string) => Promise<void>;
  onAddTeamMember?: (name: string) => Promise<void>;
}

export default function RequirementModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  suggestedReqId = 'JFY-REQ-01',
  defaultCoreFunction,
  defaultModule,
  defaultPriority,
  modules,
  teamMembers,
  onAddModule,
  onAddTeamMember,
}: RequirementModalProps) {
  const [reqId, setReqId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityType>('2.Medium');
  const [type, setType] = useState<RequirementType>('New Feature');
  const [coreFunction, setCoreFunction] = useState<CoreFunctionType | string>(DEFAULT_CORE_FUNCTION);
  const [module, setModule] = useState('');
  const [details, setDetails] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [status, setStatus] = useState<RequirementStatusType>('Draft');
  const [devAssigned, setDevAssigned] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [remark, setRemark] = useState('');
  const [images, setImages] = useState<RequirementImage[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Reset or Populate form
  useEffect(() => {
    if (initialData) {
      setReqId(initialData.req_id);
      setTitle(initialData.title || '');
      setPriority((initialData.priority as PriorityType) || '2.Medium');
      setType((initialData.type as RequirementType) || 'New Feature');
      setCoreFunction(initialData.core_function || DEFAULT_CORE_FUNCTION);
      setModule(initialData.module);
      setDetails(initialData.details);
      setRequestedBy(initialData.requested_by);
      setStatus((initialData.status as RequirementStatusType) || 'Draft');
      setDevAssigned(initialData.dev_assigned || '');
      setTargetVersion(initialData.target_version || '');
      setRemark(initialData.remark || '');
      setImages(initialData.images || []);
    } else {
      setReqId(suggestedReqId);
      setTitle('');
      setPriority(defaultPriority || '2.Medium');
      setType('New Feature');
      const initialCore = defaultCoreFunction || DEFAULT_CORE_FUNCTION;
      setCoreFunction(initialCore);
      const defaults = DEFAULT_MODULES_BY_CORE[initialCore as CoreFunctionType] || [];
      setModule(defaultModule || defaults[0] || 'General');
      setDetails('');
      setRequestedBy(teamMembers.length > 0 ? teamMembers[0].name : '');
      setStatus('Draft');
      setDevAssigned('');
      setTargetVersion('');
      setRemark('');
      setImages([]);
    }
  }, [initialData, suggestedReqId, defaultCoreFunction, defaultModule, defaultPriority, teamMembers]);

  // Dynamic modules list for selected Core Function
  const availableModules = useMemo(() => {
    const listFromDb = modules
      .filter((m) => (m.core_function || DEFAULT_CORE_FUNCTION) === coreFunction)
      .map((m) => m.name);

    const fallbackList = DEFAULT_MODULES_BY_CORE[coreFunction as CoreFunctionType] || [];
    return Array.from(new Set([...listFromDb, ...fallbackList]));
  }, [modules, coreFunction]);

  const handleCoreChange = (newCore: string) => {
    setCoreFunction(newCore);
    const defaults = DEFAULT_MODULES_BY_CORE[newCore as CoreFunctionType] || [];
    if (defaults.length > 0 && !defaults.includes(module)) {
      setModule(defaults[0]);
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleName.trim() || !onAddModule) return;
    try {
      await onAddModule(newModuleName.trim(), coreFunction);
      setModule(newModuleName.trim());
      setNewModuleName('');
      setIsAddingModule(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberName.trim() || !onAddTeamMember) return;
    try {
      await onAddTeamMember(newMemberName.trim());
      setRequestedBy(newMemberName.trim());
      setNewMemberName('');
      setIsAddingMember(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim() || !requestedBy.trim() || !module.trim()) {
      alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (หัวข้อ, รายละเอียด, ผู้ขอ, และโมดูล)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          req_id: reqId,
          title: title.trim(),
          priority,
          type,
          core_function: coreFunction,
          module,
          details: details.trim(),
          requested_by: requestedBy,
          status,
          dev_assigned: devAssigned.trim() || null,
          target_version: targetVersion.trim() || null,
          remark: remark.trim() || null,
        },
        images
      );
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData ? `แก้ไข Requirement: ${initialData.req_id}` : 'สร้าง Requirement ใหม่'}
              </h3>
              <p className="text-xs text-slate-500">
                ระบบบันทึกและส่งมอบข้อกำหนดความต้องการซอฟต์แวร์ให้ Dev
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Row 1: Req ID, Priority, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Requirement ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={reqId}
                  disabled
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-xl cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority (ความเร่งด่วน) *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="1.High">1.High (สำคัญมาก / เร่งด่วน)</option>
                <option value="2.Medium">2.Medium (ปานกลาง)</option>
                <option value="3.Low">3.Low (ต่ำ / ปรับปรุงทั่วไป)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Type (ประเภท) *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RequirementType)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                {REQUIREMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              หัวข้อสรุป Requirement (Title) *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น รองรับการสแกน Barcode สินค้าแบบชั่งน้ำหนัก หรือ เพิ่มรายงานยอดขายแยกตามกะ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:font-normal placeholder:text-slate-400"
            />
          </div>

          {/* Row 3: Core Function & Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Core Function (ระบบหลัก) *
              </label>
              <select
                value={coreFunction}
                onChange={(e) => handleCoreChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
              >
                {CORE_FUNCTIONS.map((cf) => (
                  <option key={cf} value={cf}>
                    {cf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Module (โมดูลย่อย) *
                </label>
                {onAddModule && !isAddingModule && (
                  <button
                    type="button"
                    onClick={() => setIsAddingModule(true)}
                    className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                  >
                    <PlusCircle className="w-3 h-3" /> เพิ่มโมดูล
                  </button>
                )}
              </div>

              {isAddingModule ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อโมดูลใหม่..."
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-sky-400 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleCreateModule}
                    className="px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-medium"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingModule(false)}
                    className="px-2 py-2 text-slate-400 text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
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

          {/* Row 4: Details / Acceptance Criteria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              รายละเอียดความต้องการ / Acceptance Criteria *
            </label>
            <textarea
              required
              rows={4}
              placeholder="อธิบายรายละเอียดพฤติกรรมที่ต้องการ (User Story, Input/Output, เงื่อนไขทางธุรกิจ, หรือกรณีพิเศษที่ต้องการให้ Dev พัฒนา)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Row 5: Requested By, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Requested By (ผู้ขอ Requirement) *
                </label>
                {onAddTeamMember && !isAddingMember && (
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(true)}
                    className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                  >
                    <PlusCircle className="w-3 h-3" /> เพิ่มผู้ขอ
                  </button>
                )}
              </div>

              {isAddingMember ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อผู้ขอ..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-sky-400 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleCreateMember}
                    className="px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-medium"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="px-2 py-2 text-slate-400 text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <select
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                >
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.name}>
                      {tm.name} {tm.role ? `(${tm.role})` : ''}
                    </option>
                  ))}
                  {/* Fallback if current requestedBy not in list */}
                  {requestedBy && !teamMembers.some((m) => m.name === requestedBy) && (
                    <option value={requestedBy}>{requestedBy}</option>
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                สถานะ (Status) *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RequirementStatusType)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
              >
                {REQUIREMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 6: Dev Specific Fields (Dev Assigned & Target Version) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                Dev Assigned (Dev ผู้รับผิดชอบ)
              </label>
              <input
                type="text"
                placeholder="เช่น Kampon, ช่างเอก หรือทีม Backend..."
                value={devAssigned}
                onChange={(e) => setDevAssigned(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Target Version / Sprint
              </label>
              <input
                type="text"
                placeholder="เช่น v1.2.0, Sprint 5, Q1-Release..."
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Row 7: Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              หมายเหตุเพิ่มเติม (Remark / Dev Notes)
            </label>
            <input
              type="text"
              placeholder="หมายเหตุเพิ่มเติม ข้อตกลงพิเศษ หรือข้อควรระวัง..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
            />
          </div>

          {/* Row 8: Image Uploader with Ctrl + V */}
          <div className="pt-2 border-t border-slate-100">
            <ImageUploader
              images={images}
              onChange={setImages}
              reqId={reqId}
              title="แนบรูปภาพ Wireframe / Mockup / หน้าจออ้างอิง"
            />
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'สร้าง Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}
