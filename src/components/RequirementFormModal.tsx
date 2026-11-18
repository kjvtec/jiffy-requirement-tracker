'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, PlusCircle, Lock, Code2, UserRound, ClipboardList } from 'lucide-react';
import {
  CORE_FUNCTIONS,
  DEFAULT_CORE_FUNCTION,
  REQUIREMENT_TYPES,
  type CoreFunctionType,
  type Developer,
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
import RichTextarea from './RichTextarea';

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
  /** Last name used in this browser; pre-selects the requester. */
  rememberedName: string;
  modules: SystemModule[];
  /** Requesters (people who open a requirement). */
  team: TeamMember[];
  /** Developers (a separate list from requesters). */
  developers: Developer[];
  onAddModule: (name: string, core: CoreFunctionType) => Promise<void>;
  onAddTeamMember: (name: string) => Promise<void>;
  onAddDeveloper: (name: string) => Promise<void>;
}

const label = 'block text-sm font-semibold text-slate-700 mb-1.5';

export default function RequirementFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  presets,
  nextReqIdPreview,
  rememberedName,
  modules,
  team,
  developers,
  onAddModule,
  onAddTeamMember,
  onAddDeveloper,
}: RequirementFormModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityType>('2.Medium');
  const [type, setType] = useState<RequirementType>('New Feature');
  const [coreFunction, setCoreFunction] = useState<CoreFunctionType>(DEFAULT_CORE_FUNCTION);
  const [module, setModule] = useState('');
  const [details, setDetails] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [status, setStatus] = useState<RequirementStatusType>('New');
  const [devAssigned, setDevAssigned] = useState('');
  const [images, setImages] = useState<RequirementImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newModuleName, setNewModuleName] = useState('');
  const [showAddModule, setShowAddModule] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [showAddDev, setShowAddDev] = useState(false);

  const firstModuleOf = (core: string) => modules.find((m) => m.core_function === core)?.name;

  const availableModules = useMemo(() => {
    const list = modules
      .filter((m) => m.core_function === coreFunction)
      .map((m) => m.name)
      .sort((a, b) => a.localeCompare(b, 'th'));
    // Keep a module visible even if it was removed from the list after this requirement used it.
    if (module && !list.includes(module)) list.unshift(module);
    return list;
  }, [modules, coreFunction, module]);

  // Reset the form only when the modal opens (or switches to another record) -
  // NOT when the lists change, otherwise typed input would be wiped.
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
      setStatus(initialData.status);
      setDevAssigned(initialData.dev_assigned || '');
      setImages(initialData.images);
    } else {
      const core = presets?.core || DEFAULT_CORE_FUNCTION;
      setTitle('');
      setPriority(presets?.priority || '2.Medium');
      setType('New Feature');
      setCoreFunction(core);
      setModule(presets?.module || firstModuleOf(core) || 'General');
      setDetails('');
      setRequestedBy(team.some((t) => t.name === rememberedName) ? rememberedName : team[0]?.name || '');
      setStatus(presets?.status || 'New');
      setDevAssigned('');
      setImages([]);
    }
    setShowAddModule(false);
    setShowAddMember(false);
    setShowAddDev(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData?.id]);

  if (!isOpen) return null;

  const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกหัวข้อ Requirement');
      return;
    }
    if (!requestedBy) {
      alert('กรุณาเลือก Tester');
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
          request_date: initialData ? initialData.request_date : new Date().toISOString(),
          status,
          dev_assigned: devAssigned || null,
        },
        images
      );
      onClose();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + errText(err));
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
      alert('เพิ่มโมดูลไม่สำเร็จ: ' + errText(err));
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
      alert('เพิ่ม Tester ไม่สำเร็จ: ' + errText(err));
    }
  };

  const handleAddDev = async () => {
    const name = newDevName.trim();
    if (!name) return;
    try {
      await onAddDeveloper(name);
      setDevAssigned(name);
      setNewDevName('');
      setShowAddDev(false);
    } catch (err) {
      alert('เพิ่ม Dev ไม่สำเร็จ: ' + errText(err));
    }
  };

  const keyEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fn();
    }
  };

  const addToggle = (open: boolean, toggle: () => void, text: string) => (
    <button
      type="button"
      onClick={toggle}
      className="text-xs font-semibold text-jiffy-blue hover:underline inline-flex items-center gap-1"
    >
      <PlusCircle className="w-3.5 h-3.5" aria-hidden />
      {open ? 'ยกเลิก' : text}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-[1280px] w-[96vw] h-[94vh] border border-line shadow-pop overflow-hidden my-2 flex flex-col">
        <div className="bg-gradient-to-r from-jiffy-navy to-[#0a5fc4] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-jiffy-yellow text-jiffy-ink flex items-center justify-center shadow-card">
              <ClipboardList className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-bold">{initialData ? 'แก้ไข Requirement' : 'บันทึก Requirement ใหม่'}</h3>
              <p className="text-sm text-blue-100">Jiffy Requirement Tracker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Req ID & Title */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={label}>Req ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={initialData ? initialData.req_id : nextReqIdPreview}
                  readOnly
                  className="field bg-slate-100 font-mono font-bold text-jiffy-navy cursor-not-allowed pr-9"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" aria-hidden />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className={label}>
                หัวข้อ Requirement <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field font-semibold"
                maxLength={255}
                required
              />
            </div>
          </div>

          {/* Core Function & Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>Core Function (ระบบหลัก)</label>
              <select
                value={coreFunction}
                onChange={(e) => {
                  const next = e.target.value as CoreFunctionType;
                  setCoreFunction(next);
                  setModule(firstModuleOf(next) || 'General');
                }}
                className="field font-semibold"
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
                <label className="text-sm font-semibold text-slate-700">โมดูลย่อย (Module)</label>
                {addToggle(showAddModule, () => setShowAddModule((v) => !v), 'เพิ่มโมดูล')}
              </div>
              {showAddModule ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    onKeyDown={keyEnter(handleAddModule)}
                    placeholder="ชื่อโมดูลใหม่"
                    className="field flex-1"
                  />
                  <button type="button" onClick={handleAddModule} className="btn-brand shrink-0">
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select value={module} onChange={(e) => setModule(e.target.value)} className="field">
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
              <label className={label}>Priority (ความเร่งด่วน)</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityType)} className="field font-semibold">
                <option value="1.High">1.High (สำคัญมาก/เร่งด่วน)</option>
                <option value="2.Medium">2.Medium (สำคัญปานกลาง)</option>
                <option value="3.Low">3.Low (สำคัญน้อย)</option>
              </select>
            </div>
            <div>
              <label className={label}>ประเภท (Requirement Type)</label>
              <select value={type} onChange={(e) => setType(e.target.value as RequirementType)} className="field font-semibold">
                {REQUIREMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>สถานะ (Status)</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as RequirementStatusType)} className="field font-semibold">
                <option value="New">New (ใหม่)</option>
                <option value="In Development">In Development (Dev กำลังทำ)</option>
                <option value="Testing">Testing (กำลังทดสอบ/UAT)</option>
                <option value="Done">Done (เสร็จสมบูรณ์)</option>
              </select>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className={label}>รูปภาพ Wireframe / Mockup / เอกสารประกอบ (กด Ctrl+V เพื่อแปะได้ทันที)</label>
            <ImageUploader images={images} onChange={setImages} folder={initialData?.req_id} bucketName="requirement-attachments" />
          </div>

          {/* Details */}
          <div>
            <label className={label}>รายละเอียดความต้องการ / User Requirement</label>
            <RichTextarea
              value={details}
              onChange={setDetails}
              placeholder="ระบุพฤติกรรมของระบบที่ต้องการ เงื่อนไขการคำนวณ หรือ Acceptance Criteria (รองรับตัวหนา ลิสต์ แปะลิงก์ URL อัตโนมัติ)"
              rows={6}
              minHeight="150px"
              theme="jiffy"
            />
          </div>

          {/* Requester (people who open requirements) and Developer (separate list) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-amber-900 inline-flex items-center gap-1.5">
                  <UserRound className="w-4 h-4" aria-hidden />
                  Tester (ผู้เปิด Requirement)
                </label>
                {addToggle(showAddMember, () => setShowAddMember((v) => !v), 'เพิ่ม Tester')}
              </div>
              {showAddMember ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={keyEnter(handleAddMember)}
                    placeholder="ชื่อ Tester ใหม่"
                    className="field flex-1"
                  />
                  <button type="button" onClick={handleAddMember} className="btn-brand shrink-0">
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} className="field font-semibold">
                  {requestedBy && !team.some((t) => t.name === requestedBy) && <option value={requestedBy}>{requestedBy}</option>}
                  {team.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-indigo-900 inline-flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" aria-hidden />
                  Dev ผู้รับผิดชอบ
                </label>
                {addToggle(showAddDev, () => setShowAddDev((v) => !v), 'เพิ่ม Dev')}
              </div>
              {showAddDev ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newDevName}
                    onChange={(e) => setNewDevName(e.target.value)}
                    onKeyDown={keyEnter(handleAddDev)}
                    placeholder="ชื่อ Dev ใหม่"
                    className="field flex-1"
                  />
                  <button type="button" onClick={handleAddDev} className="btn-brand shrink-0">
                    เพิ่ม
                  </button>
                </div>
              ) : (
                <select value={devAssigned} onChange={(e) => setDevAssigned(e.target.value)} className="field font-semibold">
                  <option value="">-- ยังไม่มอบหมาย Dev --</option>
                  {devAssigned && !developers.some((d) => d.name === devAssigned) && (
                    <option value={devAssigned}>{devAssigned}</option>
                  )}
                  {developers.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} className="btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              <Save className="w-4 h-4" aria-hidden />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก Requirement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
