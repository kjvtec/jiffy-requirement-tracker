import { REQUIREMENT_STATUSES, type Requirement } from '@/types';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}

/** Columns that can be sorted in every requirement table. */
export type RequirementSortKey =
  | 'req_id'
  | 'title'
  | 'core_function'
  | 'module'
  | 'priority'
  | 'status'
  | 'dev_assigned'
  | 'requested_by'
  | 'request_date';

/** Clicking the active column flips A→Z / Z→A, clicking another column starts at A→Z. */
export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: 'asc' };
}

const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

export function reqNumber(reqId: string): number {
  return parseInt(reqId.replace(/\D/g, '') || '0', 10);
}

function valueFor(r: Requirement, key: RequirementSortKey): string | number {
  switch (key) {
    case 'req_id':
      return reqNumber(r.req_id);
    case 'priority':
      return parseInt(r.priority, 10); // "1.High" -> 1
    case 'status':
      return REQUIREMENT_STATUSES.indexOf(r.status);
    case 'request_date':
      return new Date(r.request_date).getTime() || 0;
    case 'dev_assigned':
      // Unassigned items go last when sorting A-Z
      return r.dev_assigned || '￿';
    default:
      return r[key] || '';
  }
}

/** Sort requirements by a column; ties fall back to Req ID so the order is stable. */
export function sortRequirements(
  list: Requirement[],
  state: SortState<RequirementSortKey>
): Requirement[] {
  const sign = state.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const primary = compare(valueFor(a, state.key), valueFor(b, state.key)) * sign;
    return primary !== 0 ? primary : reqNumber(a.req_id) - reqNumber(b.req_id);
  });
}
