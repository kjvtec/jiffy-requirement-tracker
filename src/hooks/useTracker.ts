'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { store } from '@/lib/data';
import { DEFAULT_DEVELOPER_LIST, DEFAULT_MODULES, DEFAULT_TEAM_MEMBERS } from '@/lib/data/defaults';
import type { NewFile } from '@/lib/data/store';
import type {
  CoreFunctionType,
  Developer,
  Requirement,
  RequirementImage,
  RequirementInput,
  RequirementStatusType,
  SystemModule,
  TeamMember,
} from '@/types';

const NAME_KEY = 'jiffy_last_name_v1';
const UNKNOWN_ACTOR = 'ไม่ระบุ';

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
  const [developers, setDevelopers] = useState<Developer[]>(DEFAULT_DEVELOPER_LIST);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [lastName, setLastName] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const pushToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
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
      setDevelopers(snap.developers);
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
      const res = await store.loadRequirements();
      setRequirements(res.requirements);
    } catch (e) {
      pushToast('error', errMessage(e));
    }
  }, [pushToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* ---------- remembered name (used for the history; there is no login) ---------- */
  useEffect(() => {
    try {
      setLastName(localStorage.getItem(NAME_KEY) || '');
    } catch {
      // ignore
    }
  }, []);

  const rememberName = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setLastName(clean);
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      // ignore
    }
  }, []);

  /* ---------- requirements ---------- */
  const saveRequirement = useCallback(
    async (id: string | null, input: RequirementInput, images: RequirementImage[] | undefined) => {
      if (id) {
        await store.updateRequirement(id, input, images, lastName || input.requested_by || UNKNOWN_ACTOR);
      } else {
        rememberName(input.requested_by);
        await store.createRequirement(input, images ?? [], input.requested_by || UNKNOWN_ACTOR);
      }
      await reloadRequirements();
    },
    [lastName, rememberName, reloadRequirements]
  );

  /** Optimistic: the UI updates immediately, rolls back if the save fails. */
  const changeStatus = useCallback(
    async (id: string, to: RequirementStatusType) => {
      const current = requirements.find((r) => r.id === id);
      if (!current || current.status === to) return;
      const from = current.status;

      setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status: to } : r)));
      try {
        await store.changeStatus(id, from, to, lastName || UNKNOWN_ACTOR);
      } catch (e) {
        setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, status: from } : r)));
        pushToast('error', errMessage(e));
        throw e;
      }
    },
    [requirements, lastName, pushToast]
  );

  const deleteRequirement = useCallback(async (id: string) => {
    await store.deleteRequirement(id);
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /* ---------- information requests ---------- */
  const requestInfo = useCallback(
    async (id: string, note: string, askedBy: string) => {
      rememberName(askedBy);
      await store.requestInfo(id, note, askedBy);
      await reloadRequirements();
    },
    [rememberName, reloadRequirements]
  );

  const replyInfo = useCallback(
    async (id: string, message: string, repliedBy: string) => {
      rememberName(repliedBy);
      await store.replyInfo(id, message, repliedBy);
      await reloadRequirements();
    },
    [rememberName, reloadRequirements]
  );

  /* ---------- files (stored in Google Drive) ---------- */
  const addFile = useCallback(
    async (id: string, file: NewFile) => {
      await store.addFile(id, file, file.uploaded_by || lastName || UNKNOWN_ACTOR);
      await reloadRequirements();
    },
    [lastName, reloadRequirements]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      await store.deleteFile(fileId);
      await reloadRequirements();
    },
    [reloadRequirements]
  );

  /* ---------- history ---------- */
  const loadActivity = useCallback((id: string) => store.loadActivity(id), []);

  const addComment = useCallback(
    async (id: string, message: string, by: string) => {
      rememberName(by);
      await store.addComment(id, by, message);
    },
    [rememberName]
  );

  /* ---------- modules ---------- */
  const addModule = useCallback(async (name: string, core: CoreFunctionType) => {
    await store.addModule(core, name);
    const snap = await store.load();
    setModules(snap.modules);
  }, []);

  const renameModule = useCallback(async (oldName: string, newName: string, core: CoreFunctionType) => {
    await store.renameModule(core, oldName, newName);
    setModules((prev) =>
      prev.map((m) => (m.core_function === core && m.name === oldName ? { ...m, name: newName } : m))
    );
    setRequirements((prev) =>
      prev.map((r) => (r.core_function === core && r.module === oldName ? { ...r, module: newName } : r))
    );
  }, []);

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

  /* ---------- requesters and developers (two separate lists) ---------- */
  const addTeamMember = useCallback(async (name: string, role?: string) => {
    await store.addTeamMember(name, role);
    const snap = await store.load();
    setTeam(snap.team);
  }, []);

  const addDeveloper = useCallback(async (name: string) => {
    await store.addDeveloper(name);
    const snap = await store.load();
    setDevelopers(snap.developers);
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

  const needsInfoCount = useMemo(
    () => requirements.filter((r) => r.info_requested && r.status !== 'Done').length,
    [requirements]
  );

  return {
    mode: store.mode,
    requirements,
    modules,
    team,
    developers,
    loading,
    loadError,
    warning,
    lastName,
    toasts,
    pushToast,
    dismissToast,
    nextReqIdPreview,
    needsInfoCount,
    reload,
    saveRequirement,
    changeStatus,
    deleteRequirement,
    requestInfo,
    replyInfo,
    addFile,
    deleteFile,
    loadActivity,
    addComment,
    addModule,
    renameModule,
    deleteModule,
    addTeamMember,
    addDeveloper,
  };
}

export type Tracker = ReturnType<typeof useTracker>;
