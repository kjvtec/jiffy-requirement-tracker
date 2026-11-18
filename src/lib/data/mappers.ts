import {
  CORE_FUNCTIONS,
  DEFAULT_CORE_FUNCTION,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  type ActivityEntry,
  type CoreFunctionType,
  type Developer,
  type PriorityType,
  type Requirement,
  type RequirementFile,
  type RequirementImage,
  type RequirementStatusType,
  type RequirementType,
  type SystemModule,
  type TeamMember,
} from '@/types';

const PRIORITIES: PriorityType[] = ['1.High', '2.Medium', '3.Low'];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Statuses from before the workflow was simplified (Draft/In Review became New). */
function normalizeStatus(value: unknown): RequirementStatusType {
  if (value === 'Draft' || value === 'In Review') return 'New';
  return pick<RequirementStatusType>(value, REQUIREMENT_STATUSES, 'New');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapImage(row: any): RequirementImage {
  return {
    id: row.id,
    requirement_id: row.requirement_id,
    file_url: row.file_url,
    file_name: row.file_name,
    file_size: row.file_size ?? 0,
    created_at: row.created_at,
  };
}

export function mapFile(row: any): RequirementFile {
  return {
    id: row.id,
    requirement_id: row.requirement_id,
    file_name: row.file_name,
    file_size: row.file_size ?? 0,
    mime_type: row.mime_type ?? null,
    drive_file_id: row.drive_file_id,
    web_view_link: row.web_view_link,
    uploaded_by: row.uploaded_by || '',
    created_at: row.created_at,
  };
}

export function mapRequirement(row: any): Requirement {
  const now = new Date().toISOString();
  return {
    id: row.id,
    req_id: row.req_id,
    title: row.title || row.details || '',
    priority: pick(row.priority, PRIORITIES, '2.Medium'),
    type: pick<RequirementType>(row.type, REQUIREMENT_TYPES, 'New Feature'),
    core_function: pick<CoreFunctionType>(row.core_function, CORE_FUNCTIONS, DEFAULT_CORE_FUNCTION),
    module: row.module || 'General',
    details: row.details || '',
    requested_by: row.requested_by || '',
    request_date: row.request_date || row.created_at || now,
    status: normalizeStatus(row.status),
    dev_assigned: row.dev_assigned || null,
    info_requested: Boolean(row.info_requested),
    info_request_note: row.info_request_note ?? null,
    info_requested_by: row.info_requested_by ?? null,
    info_requested_at: row.info_requested_at ?? null,
    created_at: row.created_at || now,
    updated_at: row.updated_at || now,
    images: (row.images || []).map(mapImage),
    files: (row.files || []).map(mapFile),
  };
}

export function mapModule(row: any): SystemModule {
  return {
    id: row.id,
    name: row.name,
    core_function: pick<CoreFunctionType>(row.core_function, CORE_FUNCTIONS, DEFAULT_CORE_FUNCTION),
  };
}

export function mapTeamMember(row: any): TeamMember {
  return { id: row.id, name: row.name, role: row.role ?? null };
}

export function mapDeveloper(row: any): Developer {
  return { id: row.id, name: row.name };
}

export function mapActivity(row: any): ActivityEntry {
  return {
    id: row.id,
    requirement_id: row.requirement_id,
    actor: row.actor,
    action: row.action,
    from_status: row.from_status ?? null,
    to_status: row.to_status ?? null,
    message: row.message ?? null,
    created_at: row.created_at,
  };
}
