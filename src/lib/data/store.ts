import type {
  ActivityEntry,
  CoreFunctionType,
  Requirement,
  RequirementImage,
  RequirementInput,
  RequirementStatusType,
  SystemModule,
  TeamMember,
} from '@/types';

export interface TrackerSnapshot {
  requirements: Requirement[];
  modules: SystemModule[];
  team: TeamMember[];
  /** Set when the database is reachable but optional tables are missing. */
  warning?: string;
}

/**
 * Persistence contract used by the UI. Two implementations exist:
 *  - supabaseStore: the real backend (PostgreSQL + Storage)
 *  - localStore:    browser-only demo mode (used until Supabase is configured)
 */
export interface DataStore {
  readonly mode: 'supabase' | 'local';

  load(): Promise<TrackerSnapshot>;
  loadRequirements(): Promise<Requirement[]>;

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

  loadActivity(requirementId: string): Promise<ActivityEntry[]>;
  addComment(requirementId: string, actor: string, message: string): Promise<void>;

  addModule(core: CoreFunctionType, name: string): Promise<void>;
  renameModule(core: CoreFunctionType, oldName: string, newName: string): Promise<void>;
  deleteModule(core: CoreFunctionType, name: string): Promise<void>;
  addTeamMember(name: string, role?: string): Promise<void>;
}
