import { isSupabaseConfigured } from '@/lib/supabase';
import { localStore } from './localStore';
import { supabaseStore } from './supabaseStore';
import type { DataStore } from './store';

export type { DataStore, TrackerSnapshot } from './store';

/** Real backend when Supabase env vars are set, browser-only demo mode otherwise. */
export const store: DataStore = isSupabaseConfigured ? supabaseStore : localStore;
