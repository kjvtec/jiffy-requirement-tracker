'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { store } from '@/lib/data';
import { DEFAULT_MODULES, DEFAULT_TEAM_MEMBERS } from '@/lib/data/defaults';
import type {
  CoreFunctionType,
  Requirement,
  RequirementImage,
  RequirementInput,
  RequirementStatusType,
  SystemModule,
  TeamMember,
} from '@/types';

const ACTOR_KEY = 'jiffy_current_user_v1';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Central state + actions for the tracker. Pages/components stay presentational;
 * everything that talks to the database goes through here.
 */
export function useTracker() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [modules, setModules] = useState<SystemModule[]>(DEFAULT_MODULES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM_MEMBERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actor, setActorState] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const pushToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ---------- load ---------- */
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await store.load();
      setRequirements(snap.requirements);
      setModules(snap.modules);
      setTeam(snap.team);
      setWarning(snap.warning ?? null);
      setLoadError(null);
    } catch (e) {
      setLoadError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadRequirements = useCallback(async () => {
    try {
      setRequirements(await store.loadRequirements());
    } catch (e) {
      pushToast('error', errMessage(e));
    }
  }, [pushToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* ---------- who am I (stored per browser, used for history + defaults) ---------- */
  useEffect(() => {
    try {
      setActorState(localStorage.getItem(ACTOR_KEY) || '');
    } catch {
      // ignore
    }
  }, []);

  // Default to the first team member if nobody has been chosen yet.
  const currentUser = actor || team[0]?.name || '';

  const setCurrentUser = useCallback((name: string) => {
    setActorState(name);
    try {
      localStorage.setItem(ACTOR_KEY, name);
    } catch {
      // ignore
    }
  }, []);

  /* ---------- requirements ---------- */
  const saveRequirement = useCallback(
    async (id: string | null, input: RequirementInput, images: RequirementImage[] | undefined) => {
      if (id) {
        await store.updateRequirement(id, input, images, currentUser);
      } else {
        await store.createRequirement(input, images ?? [], currentUser);
      }
      await reloadRequirements();
    },
    [currentUser, reloadRequirements]
  );

  /** Optimistic: the UI moves the card immediately, rolls back if the save fails. */
  const changeStatus = useCallback(
    async (id: string, to: RequirementStatusType) => {
      const current = requirements.find((r) => r.id === id);
      if (!current || current.status === to) return;
      const from = current.status;

      setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status: to } : r)));
      try {
        await store.changeStatus(id, from, to, currentUser);
      } catch (e) {
        setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status: from } : r)));
        pushToast('error', errMessage(e));
        throw e;
      }
    },
    [requirements, currentUser, pushToast]
  );

  const deleteRequirement = useCallback(
    async (id: string) => {
      await store.deleteRequirement(id);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  const loadActivity = useCallback((id: string) => store.loadActivity(id), []);

  const addComment = useCallback(
    (id: string, message: string) => store.addComment(id, currentUser, message),
    [currentUser]
  );

  /* ---------- modules ---------- */
  const addModule = useCallback(
    async (name: string, core: CoreFunctionType) => {
      await store.addModule(core, name);
      const snap = await store.load();
      setModules(snap.modules);
    },
    []
  );

  const renameModule = useCallback(
    async (oldName: string, newName: string, core: CoreFunctionType) => {
      await store.renameModule(core, oldName, newName);
      setModules((prev) =>
        prev.map((m) => (m.core_function === core && m.name === oldName ? { ...m, name: newName } : m))
      );
      setRequirements((prev) =>
        prev.map((r) =>
          r.core_function === core && r.module === oldName ? { ...r, module: newName } : r
        )
      );
    },
    []
  );

  const deleteModule = useCallback(
    async (name: string, core: CoreFunctionType): Promise<{ success: boolean; message?: string }> => {
      const used = requirements.filter((r) => r.core_function === core && r.module === name).length;
      if (used > 0) {
        return {
          success: false,
          message: `ไม่สามารถลบโมดูล "${name}" ได้ เนื่องจากมี Requirement ใช้งานอยู่ ${used} รายการ`,
        };
      }
      await store.deleteModule(core, name);
      setModules((prev) => prev.filter((m) => !(m.core_function === core && m.name === name)));
      return { success: true };
    },
    [requirements]
  );

  /* ---------- team ---------- */
  const addTeamMember = useCallback(async (name: string, role?: string) => {
    await store.addTeamMember(name, role);
    const snap = await store.load();
    setTeam(snap.team);
  }, []);

  /* ---------- derived ---------- */
  const nextReqIdPreview = useMemo(() => {
    let max = 0;
    for (const r of requirements) {
      const n = parseInt(r.req_id.replace(/\D/g, '') || '0', 10);
      if (n > max) max = n;
    }
    return `JFY-REQ-${String(max + 1).padStart(2, '0')}`;
  }, [requirements]);

  return {
    mode: store.mode,
    requirements,
    modules,
    team,
    loading,
    loadError,
    warning,
    currentUser,
    setCurrentUser,
    toasts,
    pushToast,
    dismissToast,
    nextReqIdPreview,
    reload,
    saveRequirement,
    changeStatus,
    deleteRequirement,
    loadActivity,
    addComment,
    addModule,
    renameModule,
    deleteModule,
    addTeamMember,
  };
}

export type Tracker = ReturnType<typeof useTracker>;
