import { supabase } from '@/lib/supabase';
import type { ActivityAction, Requirement, RequirementImage } from '@/types';
import { DEFAULT_MODULES, DEFAULT_TEAM_MEMBERS } from './defaults';
import { mapActivity, mapModule, mapRequirement, mapTeamMember } from './mappers';
import type { DataStore, TrackerSnapshot } from './store';

const REQUIREMENT_SELECT =
  '*, images:requirement_images(id, requirement_id, file_url, file_name, file_size, created_at)';

const UNIQUE_VIOLATION = '23505';

function fail(context: string, error: { message: string; code?: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function logActivity(entry: {
  requirement_id: string;
  actor: string;
  action: ActivityAction;
  from_status?: string | null;
  to_status?: string | null;
  message?: string | null;
}): Promise<void> {
  // The history is informational: never fail the user's action because of it.
  const { error } = await supabase.from('requirement_activity').insert(entry);
  if (error) console.warn('Activity log failed:', error.message);
}

/** Make the stored image rows match `images` without wiping unchanged ones. */
async function syncImages(requirementId: string, images: RequirementImage[]): Promise<void> {
  const { data: existing, error } = await supabase
    .from('requirement_images')
    .select('id')
    .eq('requirement_id', requirementId);
  fail('โหลดรูปเดิมไม่สำเร็จ', error);

  const keepIds = new Set(images.map((i) => i.id).filter(Boolean) as string[]);
  const removeIds = (existing || []).map((r) => r.id as string).filter((id) => !keepIds.has(id));
  if (removeIds.length > 0) {
    const { error: delErr } = await supabase.from('requirement_images').delete().in('id', removeIds);
    fail('ลบรูปไม่สำเร็จ', delErr);
  }

  const toInsert = images
    .filter((i) => !i.id)
    .map((i) => ({
      requirement_id: requirementId,
      file_url: i.file_url,
      file_name: i.file_name,
      file_size: i.file_size || 0,
    }));
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('requirement_images').insert(toInsert);
    fail('บันทึกรูปไม่สำเร็จ', insErr);
  }
}

export const supabaseStore: DataStore = {
  mode: 'supabase',

  async load(): Promise<TrackerSnapshot> {
    const [reqRes, modRes, teamRes] = await Promise.all([
      supabase.from('requirements').select(REQUIREMENT_SELECT).order('created_at', { ascending: false }),
      supabase.from('modules').select('id, core_function, name').order('name'),
      supabase.from('team_members').select('id, name, role').order('name'),
    ]);

    if (reqRes.error) throw new Error(`โหลดข้อมูล Requirement ไม่สำเร็จ: ${reqRes.error.message}`);

    const missing: string[] = [];
    if (modRes.error) missing.push('modules');
    if (teamRes.error) missing.push('team_members');

    return {
      requirements: (reqRes.data || []).map(mapRequirement),
      modules: modRes.error ? DEFAULT_MODULES : (modRes.data || []).map(mapModule),
      team: teamRes.error ? DEFAULT_TEAM_MEMBERS : (teamRes.data || []).map(mapTeamMember),
      warning:
        missing.length > 0
          ? `ไม่พบตาราง ${missing.join(', ')} ใน Supabase — กรุณารัน supabase/requirement_schema.sql ใหม่ (ตอนนี้ใช้ค่าเริ่มต้นชั่วคราว และบันทึกการเปลี่ยนแปลงส่วนนี้ไม่ได้)`
          : undefined,
    };
  },

  async loadRequirements() {
    const { data, error } = await supabase
      .from('requirements')
      .select(REQUIREMENT_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`โหลดข้อมูล Requirement ไม่สำเร็จ: ${error.message}`);
    return (data || []).map(mapRequirement);
  },

  async createRequirement(input, images, actor): Promise<Requirement> {
    // req_id is intentionally omitted: the database sequence assigns it atomically.
    const { data, error } = await supabase
      .from('requirements')
      .insert(input)
      .select(REQUIREMENT_SELECT)
      .single();
    fail('สร้าง Requirement ไม่สำเร็จ', error);
    const created = mapRequirement(data);

    if (images.length > 0) await syncImages(created.id, images);
    await logActivity({
      requirement_id: created.id,
      actor,
      action: 'created',
      to_status: created.status,
      message: `สร้าง Requirement ${created.req_id}`,
    });
    return created;
  },

  async updateRequirement(id, patch, images, actor) {
    const { error } = await supabase.from('requirements').update(patch).eq('id', id);
    fail('บันทึก Requirement ไม่สำเร็จ', error);
    if (images) await syncImages(id, images);
    await logActivity({ requirement_id: id, actor, action: 'update', message: 'แก้ไขรายละเอียด Requirement' });
  },

  async changeStatus(id, from, to, actor) {
    const { error } = await supabase.from('requirements').update({ status: to }).eq('id', id);
    fail('เปลี่ยนสถานะไม่สำเร็จ', error);
    await logActivity({ requirement_id: id, actor, action: 'status_change', from_status: from, to_status: to });
  },

  async deleteRequirement(id) {
    // Images and activity rows are removed by ON DELETE CASCADE.
    const { error } = await supabase.from('requirements').delete().eq('id', id);
    fail('ลบ Requirement ไม่สำเร็จ', error);
  },

  async loadActivity(requirementId) {
    const { data, error } = await supabase
      .from('requirement_activity')
      .select('*')
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Activity load failed:', error.message);
      return [];
    }
    return (data || []).map(mapActivity);
  },

  async addComment(requirementId, actor, message) {
    const { error } = await supabase
      .from('requirement_activity')
      .insert({ requirement_id: requirementId, actor, action: 'comment', message });
    fail('บันทึกความเห็นไม่สำเร็จ', error);
  },

  async addModule(core, name) {
    const { error } = await supabase.from('modules').insert({ core_function: core, name });
    fail(error?.code === UNIQUE_VIOLATION ? 'มีโมดูลชื่อนี้อยู่แล้ว' : 'เพิ่มโมดูลไม่สำเร็จ', error);
  },

  async renameModule(core, oldName, newName) {
    const { error } = await supabase
      .from('modules')
      .update({ name: newName })
      .eq('core_function', core)
      .eq('name', oldName);
    fail(error?.code === UNIQUE_VIOLATION ? 'มีโมดูลชื่อนี้อยู่แล้ว' : 'แก้ชื่อโมดูลไม่สำเร็จ', error);

    const { error: reqErr } = await supabase
      .from('requirements')
      .update({ module: newName })
      .eq('core_function', core)
      .eq('module', oldName);
    fail('อัปเดตชื่อโมดูลใน Requirement ไม่สำเร็จ', reqErr);
  },

  async deleteModule(core, name) {
    const { error } = await supabase.from('modules').delete().eq('core_function', core).eq('name', name);
    fail('ลบโมดูลไม่สำเร็จ', error);
  },

  async addTeamMember(name, role) {
    const { error } = await supabase.from('team_members').insert({ name, role: role || null });
    fail(error?.code === UNIQUE_VIOLATION ? 'มีชื่อนี้อยู่ในทีมแล้ว' : 'เพิ่มสมาชิกไม่สำเร็จ', error);
  },
};
