import {
  CORE_FUNCTIONS,
  DEFAULT_MODULES_BY_CORE,
  DEFAULT_TEAM,
  type SystemModule,
  type TeamMember,
} from '@/types';

/** Built-in modules, used in demo mode or when the modules table is unavailable. */
export const DEFAULT_MODULES: SystemModule[] = CORE_FUNCTIONS.flatMap((core, coreIdx) =>
  DEFAULT_MODULES_BY_CORE[core].map((name, modIdx) => ({
    id: (coreIdx + 1) * 100 + modIdx + 1,
    core_function: core,
    name,
  }))
);

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = DEFAULT_TEAM.map((m, i) => ({
  id: i + 1,
  ...m,
}));
