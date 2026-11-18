import { supabase } from '@/lib/supabase';
import type { ActivityAction, Requirement, RequirementImage } from '@/types';
import { DEFAULT_DEVELOPER_LIST, DEFAULT_MODULES, DEFAULT_TEAM_MEMBERS } from './defaults';
import { mapActivity, mapDeveloper, mapModule, mapRequirement, mapTeamMember } from './mappers';
import type { DataStore, TrackerSnapshot } from './store';

const IMAGES_EMBED =
  'images:requirement_images(id, requirement_id, file_url, file_name, file_size, created_at)';
const FILES_EMBED =
  'files:requirement_files(id, requirement_id, file_name, file_size, mime_type, drive_file_id, web_view_link, uploaded_by, created_at)';

const UNIQUE_VIOLATION = '23505';

const SCHEMA_HINT = 'กรุณารัน supabase/requirement_schema.sql ใน Supabase SQL Editor';

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

/**
 * Load requirements. If the newer `requirement_files` table does not exist yet
 * (schema not re-run) fall back to a query without it instead of breaking the app.
 */
async function selectRequirements(): Promise<{ rows: unknown[]; warning?: string }> {
  const full = await supabase
    .from('requirements')
    .select(`*, ${IMAGES_EMBED}, ${FILES_EMBED}`)
    .order('created_at', { ascending: false });
  if (!full.error) return { rows: full.data || [] };

  const basic = await supabase
    .from('requirements')
    .select(`*, ${IMAGES_EMBED}`)
    .order('created_at', { ascending: false });
  if (basic.error) throw new Error(`โหลดข้อมูล Requirement ไม่สำเร็จ: ${basic.error.message}`);
  return {
    rows: basic.data || [],
    warning: `ยังไม่พบตาราง requirement_files — ${SCHEMA_HINT} (ไฟล์แนบ Google Drive จะใช้ไม่ได้จนกว่าจะรัน)`,
  };
}

export const supabaseStore: DataStore = {
  mode: 'supabase',

  async load(): Promise<TrackerSnapshot> {
    const [reqRes, modRes, teamRes, devRes] = await Promise.all([
      selectRequirements(),
      supabase.from('requirement_modules').select('id, core_function, name').order('id'),
      supabase.from('requirement_team_members').select('id, name, role').order('name'),
      supabase.from('requirement_developers').select('id, name').order('name'),
    ]);

    const missing: string[] = [];
    if (modRes.error) missing.push('requirement_modules');
    if (teamRes.error) missing.push('requirement_team_members');
    if (devRes.error) missing.push('requirement_developers');

    const warnings: string[] = [];
    if (reqRes.warning) warnings.push(reqRes.warning);
    if (missing.length > 0) {
      warnings.push(
        `ไม่พบตาราง ${missing.join(', ')} ใน Supabase — ${SCHEMA_HINT} (ตอนนี้ใช้ค่าเริ่มต้นชั่วคราว และบันทึกการเปลี่ยนแปลงส่วนนี้ไม่ได้)`
      );
    }

    return {
      requirements: reqRes.rows.map(mapRequirement),
      modules: modRes.error ? DEFAULT_MODULES : (modRes.data || []).map(mapModule),
      team: teamRes.error ? DEFAULT_TEAM_MEMBERS : (teamRes.data || []).map(mapTeamMember),
      developers: devRes.error ? DEFAULT_DEVELOPER_LIST : (devRes.data || []).map(mapDeveloper),
      warning: warnings.length > 0 ? warnings.join(' | ') : undefined,
    };
  },

  async loadRequirements() {
    const { rows, warning } = await selectRequirements();
    return { requirements: rows.map(mapRequirement), warning };
  },

  async createRequirement(input, images, actor): Promise<Requirement> {
    // req_id is intentionally omitted: the database sequence assigns it atomically.
    const { data, error } = await supabase
      .from('requirements')
      .insert(input)
      .select(`*, ${IMAGES_EMBED}`)
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
    // Images, files and activity rows are removed by ON DELETE CASCADE.
    const { error } = await supabase.from('requirements').delete().eq('id', id);
    fail('ลบ Requirement ไม่สำเร็จ', error);
  },

  async requestInfo(id, note, askedBy) {
    const { error } = await supabase
      .from('requirements')
      .update({
        info_requested: true,
        info_request_note: note,
        info_requested_by: askedBy,
        info_requested_at: new Date().toISOString(),
      })
      .eq('id', id);
    fail(`ส่งคำขอข้อมูลเพิ่มไม่สำเร็จ (${SCHEMA_HINT})`, error);
    await logActivity({
      requirement_id: id,
      actor: askedBy,
      action: 'info_request',
      message: note,
    });
  },

  async replyInfo(id, message, repliedBy) {
    const { error } = await supabase.from('requirements').update({ info_requested: false }).eq('id', id);
    fail('บันทึกการให้ข้อมูลไม่สำเร็จ', error);
    await logActivity({
      requirement_id: id,
      actor: repliedBy,
      action: 'info_reply',
      message,
    });
  },

  async addFile(requirementId, file, actor) {
    const { error } = await supabase.from('requirement_files').insert({ requirement_id: requirementId, ...file });
    fail(`บันทึกไฟล์แนบไม่สำเร็จ (${SCHEMA_HINT})`, error);
    await logActivity({
      requirement_id: requirementId,
      actor,
      action: 'file',
      message: `แนบไฟล์ ${file.file_name}`,
    });
  },

  async deleteFile(fileId) {
    // Removes the link only; the file stays in Google Drive.
    const { error } = await supabase.from('requirement_files').delete().eq('id', fileId);
    fail('ลบไฟล์แนบไม่สำเร็จ', error);
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
    const { error } = await supabase.from('requirement_modules').insert({ core_function: core, name });
    fail(error?.code === UNIQUE_VIOLATION ? 'มีโมดูลชื่อนี้อยู่แล้ว' : 'เพิ่มโมดูลไม่สำเร็จ', error);
  },

  async renameModule(core, oldName, newName) {
    const { error } = await supabase
      .from('requirement_modules')
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
    const { error } = await supabase
      .from('requirement_modules')
      .delete()
      .eq('core_function', core)
      .eq('name', name);
    fail('ลบโมดูลไม่สำเร็จ', error);
  },

  async addTeamMember(name, role) {
    const { error } = await supabase.from('requirement_team_members').insert({ name, role: role || null });
    fail(error?.code === UNIQUE_VIOLATION ? 'มีชื่อนี้อยู่ในรายชื่อผู้ขอแล้ว' : 'เพิ่มผู้ขอไม่สำเร็จ', error);
  },

  async addDeveloper(name) {
    const { error } = await supabase.from('requirement_developers').insert({ name });
    fail(
      error?.code === UNIQUE_VIOLATION ? 'มี Dev ชื่อนี้อยู่แล้ว' : `เพิ่ม Dev ไม่สำเร็จ (${SCHEMA_HINT})`,
      error
    );
  },

  async renameDeveloper(oldName, newName) {
    const { error } = await supabase
      .from('requirement_developers')
      .update({ name: newName })
      .eq('name', oldName);
    fail(error?.code === UNIQUE_VIOLATION ? 'มี Dev ชื่อนี้อยู่แล้ว' : 'แก้ชื่อ Dev ไม่สำเร็จ', error);

    const { error: reqErr } = await supabase
      .from('requirements')
      .update({ dev_assigned: newName })
      .eq('dev_assigned', oldName);
    fail('อัปเดตชื่อ Dev ใน Requirement ไม่สำเร็จ', reqErr);
  },

  async deleteDeveloper(name) {
    const { error } = await supabase
      .from('requirement_developers')
      .delete()
      .eq('name', name);
    fail('ลบ Dev ไม่สำเร็จ', error);
  },
};
