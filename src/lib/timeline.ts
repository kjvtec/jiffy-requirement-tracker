import { Issue, TeamMember, TimelineEntry } from '@/types';

const HEADER_REGEX =
  /^\[([^\]]+?)\s*\|\s*โดย:\s*([^|\]]+?)(?:\s*\|\s*สถานะ:\s*([^\]]+?))?\]$/;

const RECENT_UPDATERS_STORAGE_KEY = 'jiffy_recent_updaters_v1';

/** Format date/time cleanly in Thai short format without comma separators. */
export function formatTimelineTimestamp(date: Date = new Date()): string {
  try {
    const formatted = date.toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatted.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

/**
 * Parse `resolution` field into chronological TimelineEntry items.
 * Preserves legacy plain-text notes safely alongside structured timeline blocks.
 */
export function parseResolutionTimeline(resolution?: string | null): TimelineEntry[] {
  const raw = (resolution || '').trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/);
  const entries: TimelineEntry[] = [];
  let legacyLines: string[] = [];
  let currentEntry: { timestamp: string; author: string; statusLabel?: string; lines: string[] } | null = null;

  const flushCurrent = () => {
    if (!currentEntry) return;
    // Trim leading/trailing empty lines and trailing separator '---'
    const cleaned = [...currentEntry.lines];
    while (cleaned.length > 0 && cleaned[0].trim() === '') cleaned.shift();
    while (
      cleaned.length > 0 &&
      (cleaned[cleaned.length - 1].trim() === '' || /^-{3,}$/.test(cleaned[cleaned.length - 1].trim()))
    ) {
      cleaned.pop();
    }
    entries.push({
      timestamp: currentEntry.timestamp,
      author: currentEntry.author,
      statusLabel: currentEntry.statusLabel,
      message: cleaned.join('\n'),
      isLegacy: false,
    });
    currentEntry = null;
  };

  const flushLegacy = () => {
    const cleaned = [...legacyLines];
    while (cleaned.length > 0 && cleaned[0].trim() === '') cleaned.shift();
    while (
      cleaned.length > 0 &&
      (cleaned[cleaned.length - 1].trim() === '' || /^-{3,}$/.test(cleaned[cleaned.length - 1].trim()))
    ) {
      cleaned.pop();
    }
    const text = cleaned.join('\n').trim();
    if (text) {
      entries.push({
        message: text,
        isLegacy: true,
      });
    }
    legacyLines = [];
  };

  for (const line of lines) {
    const match = line.trim().match(HEADER_REGEX);
    if (match) {
      if (currentEntry) {
        flushCurrent();
      } else {
        flushLegacy();
      }
      currentEntry = {
        timestamp: match[1].trim(),
        author: match[2].trim(),
        statusLabel: match[3] ? match[3].trim() : undefined,
        lines: [],
      };
    } else if (currentEntry) {
      currentEntry.lines.push(line);
    } else {
      legacyLines.push(line);
    }
  }

  flushCurrent();
  flushLegacy();

  return entries;
}

/** Append a formatted timeline entry onto an existing resolution string. */
export function appendTimelineEntry(
  existingResolution: string | null | undefined,
  params: {
    author: string;
    statusLabel: string;
    message: string;
    timestamp?: string;
  }
): string {
  const safeAuthor = params.author.replace(/[\|\[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const safeStatus = params.statusLabel.replace(/[\|\[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const stamp = (params.timestamp || formatTimelineTimestamp()).replace(/[\|\[\]\r\n]/g, ' ').trim();
  const cleanMsg = params.message.trim();

  const header = `[${stamp} | โดย: ${safeAuthor} | สถานะ: ${safeStatus}]`;
  const block = cleanMsg ? `${header}\n${cleanMsg}` : header;

  const existing = (existingResolution || '').trim();
  if (!existing) return block;
  return `${existing}\n\n---\n\n${block}`;
}

export interface LatestTimelineSummary {
  latestAuthor: string | null;
  latestTimestamp: string | null;
  latestStatus: string | null;
  latestMessage: string | null;
  entryCount: number;
}

/** Return the latest timeline author/status/message for quick table/dashboard previews. */
export function getLatestTimelineInfo(issue: Pick<Issue, 'resolution' | 'updated_by'>): LatestTimelineSummary {
  const entries = parseResolutionTimeline(issue.resolution);
  if (entries.length === 0) {
    return {
      latestAuthor: issue.updated_by || null,
      latestTimestamp: null,
      latestStatus: null,
      latestMessage: null,
      entryCount: 0,
    };
  }

  const structuredEntries = entries.filter((e) => !e.isLegacy && e.author);
  const latest = structuredEntries.length > 0
    ? structuredEntries[structuredEntries.length - 1]
    : entries[entries.length - 1];

  return {
    latestAuthor: latest.author || issue.updated_by || null,
    latestTimestamp: latest.timestamp || null,
    latestStatus: latest.statusLabel || null,
    latestMessage: latest.message || null,
    entryCount: entries.length,
  };
}

/** Collect all unique updater names from team members, issue timelines, and browser storage. */
export function collectSuggestedUpdaters(
  issues: Issue[],
  teamMembers: TeamMember[],
  priorityNames: string[] = []
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addName = (name?: string | null) => {
    const clean = (name || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  };

  priorityNames.forEach(addName);
  teamMembers.forEach((tm) => addName(tm.name));

  // Previously typed updaters saved locally in this browser
  readRecentUpdaters().forEach(addName);

  // Names already recorded in issue timelines / updated_by across all users
  issues.forEach((issue) => {
    addName(issue.updated_by);
    parseResolutionTimeline(issue.resolution).forEach((entry) => {
      addName(entry.author);
    });
  });

  return result;
}

export function readRecentUpdaters(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_UPDATERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function saveRecentUpdater(name: string) {
  if (typeof window === 'undefined') return;
  const clean = name.trim();
  if (!clean) return;
  try {
    const current = readRecentUpdaters().filter(
      (n) => n.toLowerCase() !== clean.toLowerCase()
    );
    const next = [clean, ...current].slice(0, 15);
    localStorage.setItem(RECENT_UPDATERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}
