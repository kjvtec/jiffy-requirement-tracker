import type {
  ActivityEntry,
  CoreFunctionType,
  Developer,
  Requirement,
  RequirementFile,
  RequirementImage,
  RequirementInput,
  RequirementStatusType,
  SystemModule,
  TeamMember,
} from '@/types';

export interface TrackerSnapshot {
  requirements: Requirement[];
  modules: SystemModule[];
  /** Requesters: the people who open a requirement. */
  team: TeamMember[];
  /** Developers who can be assigned to a requirement (separate list from requesters). */
  developers: Developer[];
  /** Set when the database is reachable but optional tables are missing. */
  warning?: string;
}

export type NewFile = Omit<RequirementFile, 'id' | 'requirement_id' | 'created_at'>;

/**
 * Persistence contract used by the UI. Two implementations exist:
 *  - supabaseStore: the real backend (PostgreSQL + Storage)
 *  - localStore:    browser-only demo mode (used until Supabase is configured)
 */
export interface DataStore {
  readonly mode: 'supabase' | 'local';

  load(): Promise<TrackerSnapshot>;
  loadRequirements(): Promise<{ requirements: Requirement[]; warning?: string }>;

  createRequirement(
    input: RequirementInput,
    images: RequirementImage[],
    actor: string
  ): Promise<Requirement>;
  updateRequirement(
    id: string,
    patch: Partial<RequirementInput>,
    images: RequirementImage[] | undefined,
    actor: string
  ): Promise<void>;
  changeStatus(
    id: string,
    from: RequirementStatusType,
    to: RequirementStatusType,
    actor: string
  ): Promise<void>;
  deleteRequirement(id: string): Promise<void>;

  /** A developer asks the requester for more information. */
  requestInfo(id: string, note: string, askedBy: string): Promise<void>;
  /** The requester answers; clears the "waiting for information" flag. */
  replyInfo(id: string, message: string, repliedBy: string): Promise<void>;

  addFile(requirementId: string, file: NewFile, actor: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;

  loadActivity(requirementId: string): Promise<ActivityEntry[]>;
  addComment(requirementId: string, actor: string, message: string): Promise<void>;

  addModule(core: CoreFunctionType, name: string): Promise<void>;
  renameModule(core: CoreFunctionType, oldName: string, newName: string): Promise<void>;
  deleteModule(core: CoreFunctionType, name: string): Promise<void>;
  addTeamMember(name: string, role?: string): Promise<void>;
  addDeveloper(name: string): Promise<void>;
}
