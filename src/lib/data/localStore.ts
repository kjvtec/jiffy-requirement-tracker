import type {
  ActivityEntry,
  Developer,
  Requirement,
  RequirementImage,
  SystemModule,
  TeamMember,
} from '@/types';
import { DEFAULT_DEVELOPER_LIST, DEFAULT_MODULES, DEFAULT_TEAM_MEMBERS } from './defaults';
import type { DataStore, TrackerSnapshot } from './store';

/**
 * Browser-only demo store. Used when Supabase env vars are not configured so
 * the app is still fully usable (data lives in this browser's localStorage).
 */
const STORAGE_KEY = 'jiffy_requirement_demo_v2';

interface LocalState {
  seq: number;
  requirements: Requirement[];
  modules: SystemModule[];
  team: TeamMember[];
  developers: Developer[];
  activity: ActivityEntry[];
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function seedState(): LocalState {
  const now = new Date().toISOString();
  const base = {
    request_date: now,
    created_at: now,
    updated_at: now,
    images: [] as RequirementImage[],
    files: [],
    info_requested: false,
    info_request_note: null,
    info_requested_by: null,
    info_requested_at: null,
  };
  return {
    seq: 2,
    modules: DEFAULT_MODULES,
    team: DEFAULT_TEAM_MEMBERS,
    developers: DEFAULT_DEVELOPER_LIST,
    activity: [],
    requirements: [
      {
        ...base,
        id: uid(),
        req_id: 'JFY-REQ-01',
        title: 'รองรับการสแกน Barcode สินค้าแบบชั่งน้ำหนัก (Weight Barcode 13 หลัก)',
        priority: '1.High',
        type: 'New Feature',
        core_function: 'VTec POS',
        module: 'Sale / Checkout',
        details:
          'ต้องการให้หน้าจอขาย POS สามารถสแกนบาร์โค้ด EAN-13 ของสินค้าประเภทชั่งน้ำหนัก (ขึ้นต้นด้วย 20-29) โดยแยกถอดรหัสรหัสสินค้า (Item Code 5 หลัก) และน้ำหนัก/ราคา (5 หลัก) เพื่อคำนวณยอดเงินรวมได้อัตโนมัติ ไม่ต้องคีย์มือน้ำหนักซ้ำ',
        requested_by: 'Nat',
        status: 'In Development',
        dev_assigned: 'Kampon',
      },
      {
        ...base,
        id: uid(),
        req_id: 'JFY-REQ-02',
        title: 'เพิ่มปุ่มคัดลอกเลขที่เอกสารในหน้ารายงานสินค้าขาด (Stock Shortage)',
        priority: '2.Medium',
        type: 'Enhancement',
        core_function: 'VTec Store Backoffice',
        module: 'Report',
        details:
          'เพิ่มปุ่ม Copy เลขที่ใบโอน/เลขที่ PO บนหน้ารายงานสต็อก เพื่อให้พนักงานสาขาคัดลอกไปค้นหาต่อในหน้า Stock Adjustment ได้สะดวกขึ้นโดยไม่ต้องพิมพ์เอง',
        requested_by: 'Tukta',
        status: 'New',
        dev_assigned: null,
        info_requested: true,
        info_request_note: 'ขอตัวอย่างหน้ารายงานที่ต้องการเพิ่มปุ่ม และระบุว่าต้องคัดลอกเลขที่เอกสารรูปแบบใดบ้าง',
        info_requested_by: 'Kampon',
        info_requested_at: now,
      },
    ],
  };
}

function read(): LocalState {
  if (typeof window === 'undefined') return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LocalState;
  } catch {
    // fall through to a fresh seed
  }
  const seeded = seedState();
  write(seeded);
  return seeded;
}

function write(state: LocalState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error('พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม (รูปภาพใน Demo mode ใช้พื้นที่มาก)');
  }
}

function mutate(fn: (s: LocalState) => void): void {
  const state = read();
  fn(state);
  write(state);
}

function log(state: LocalState, entry: Omit<ActivityEntry, 'id' | 'created_at'>): void {
  state.activity.push({ ...entry, id: uid(), created_at: new Date().toISOString() });
}

function patchRequirement(s: LocalState, id: string, patch: Partial<Requirement>): void {
  s.requirements = s.requirements.map((r) =>
    r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r
  );
}

export const localStore: DataStore = {
  mode: 'local',

  async load(): Promise<TrackerSnapshot> {
    const s = read();
    return { requirements: s.requirements, modules: s.modules, team: s.team, developers: s.developers };
  },

  async loadRequirements() {
    return { requirements: read().requirements };
  },

  async createRequirement(input, images, actor) {
    let created!: Requirement;
    mutate((s) => {
      s.seq += 1;
      const now = new Date().toISOString();
      created = {
        ...input,
        id: uid(),
        req_id: `JFY-REQ-${String(s.seq).padStart(2, '0')}`,
        created_at: now,
        updated_at: now,
        images: images.map((i) => ({ ...i, id: i.id || uid() })),
        files: [],
        info_requested: false,
        info_request_note: null,
        info_requested_by: null,
        info_requested_at: null,
      };
      s.requirements.unshift(created);
      log(s, {
        requirement_id: created.id,
        actor,
        action: 'created',
        to_status: created.status,
        message: `สร้าง Requirement ${created.req_id}`,
      });
    });
    return created;
  },

  async updateRequirement(id, patch, images, actor) {
    mutate((s) => {
      patchRequirement(s, id, {
        ...patch,
        ...(images ? { images: images.map((i) => ({ ...i, id: i.id || uid() })) } : {}),
      });
      log(s, { requirement_id: id, actor, action: 'update', message: 'แก้ไขรายละเอียด Requirement' });
    });
  },

  async changeStatus(id, from, to, actor) {
    mutate((s) => {
      patchRequirement(s, id, { status: to });
      log(s, { requirement_id: id, actor, action: 'status_change', from_status: from, to_status: to });
    });
  },

  async deleteRequirement(id) {
    mutate((s) => {
      s.requirements = s.requirements.filter((r) => r.id !== id);
      s.activity = s.activity.filter((a) => a.requirement_id !== id);
    });
  },

  async requestInfo(id, note, askedBy) {
    mutate((s) => {
      patchRequirement(s, id, {
        info_requested: true,
        info_request_note: note,
        info_requested_by: askedBy,
        info_requested_at: new Date().toISOString(),
      });
      log(s, { requirement_id: id, actor: askedBy, action: 'info_request', message: note });
    });
  },

  async replyInfo(id, message, repliedBy) {
    mutate((s) => {
      patchRequirement(s, id, { info_requested: false });
      log(s, { requirement_id: id, actor: repliedBy, action: 'info_reply', message });
    });
  },

  async addFile(requirementId, file, actor) {
    mutate((s) => {
      const entry = { ...file, id: uid(), requirement_id: requirementId, created_at: new Date().toISOString() };
      s.requirements = s.requirements.map((r) =>
        r.id === requirementId ? { ...r, files: [...r.files, entry] } : r
      );
      log(s, { requirement_id: requirementId, actor, action: 'file', message: `แนบไฟล์ ${file.file_name}` });
    });
  },

  async deleteFile(fileId) {
    mutate((s) => {
      s.requirements = s.requirements.map((r) => ({ ...r, files: r.files.filter((f) => f.id !== fileId) }));
    });
  },

  async loadActivity(requirementId) {
    return read()
      .activity.filter((a) => a.requirement_id === requirementId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async addComment(requirementId, actor, message) {
    mutate((s) => log(s, { requirement_id: requirementId, actor, action: 'comment', message }));
  },

  async addModule(core, name) {
    mutate((s) => {
      if (s.modules.some((m) => m.core_function === core && m.name === name)) {
        throw new Error('มีโมดูลชื่อนี้อยู่แล้ว');
      }
      s.modules.push({ id: Date.now(), core_function: core, name });
    });
  },

  async renameModule(core, oldName, newName) {
    mutate((s) => {
      if (s.modules.some((m) => m.core_function === core && m.name === newName)) {
        throw new Error('มีโมดูลชื่อนี้อยู่แล้ว');
      }
      s.modules = s.modules.map((m) =>
        m.core_function === core && m.name === oldName ? { ...m, name: newName } : m
      );
      s.requirements = s.requirements.map((r) =>
        r.core_function === core && r.module === oldName ? { ...r, module: newName } : r
      );
    });
  },

  async deleteModule(core, name) {
    mutate((s) => {
      s.modules = s.modules.filter((m) => !(m.core_function === core && m.name === name));
    });
  },

  async addTeamMember(name, role) {
    mutate((s) => {
      if (s.team.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('มีชื่อนี้อยู่ในรายชื่อผู้ขอแล้ว');
      }
      s.team.push({ id: Date.now(), name, role: role || null });
    });
  },

  async addDeveloper(name) {
    mutate((s) => {
      if (s.developers.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('มี Dev ชื่อนี้อยู่แล้ว');
      }
      s.developers.push({ id: Date.now(), name });
    });
  },
};
