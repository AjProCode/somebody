import type { PersonaRole } from './medhaviEngine';
import type { StudioExecutionResult } from './studioRunner';

export type TrackedStudioId =
  | 'evaluator'
  | 'lesson_arch'
  | 'circular'
  | 'revision_arena'
  | 'revision';

export const STUDIO_HISTORY_STORAGE_KEY = 'medhavi_studio_history_v1';
export const STUDIO_HISTORY_EVENT = 'medhavi:studio-history-updated';
const MAX_STORED_STUDIO_ENTRIES = 80;

export const STUDIO_LABELS: Record<TrackedStudioId, string> = {
  evaluator: 'Answer Evaluator',
  lesson_arch: 'Lesson Plan',
  circular: 'Circulars',
  revision_arena: 'Revision Tests',
  revision: '5-Min Revision'
};

export const STUDIO_SHORT_BADGES: Record<TrackedStudioId, string> = {
  evaluator: 'Evaluator',
  lesson_arch: 'Lesson Plan',
  circular: 'Circulars',
  revision_arena: 'Revision Tests',
  revision: '5-Min Revision'
};

export interface StudioHistoryEntry {
  id: string;
  studioId: TrackedStudioId;
  role: PersonaRole;
  ownerId: string;
  title: string;
  subtitle: string;
  subject: string;
  inputsSnapshot: Record<string, string | number | boolean>;
  result: StudioExecutionResult;
  timestamp: number;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(override?: StorageAdapter | null): StorageAdapter | null {
  if (override) return override;
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return null;
}

function emitStudioHistoryUpdate(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(STUDIO_HISTORY_EVENT));
  }
}

function readRawHistoryList(storageOverride?: StorageAdapter | null): StudioHistoryEntry[] {
  const storage = getDefaultStorage(storageOverride);
  if (!storage) return [];
  try {
    const raw = storage.getItem(STUDIO_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is StudioHistoryEntry =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.studioId === 'string' &&
          (item.role === 'student' || item.role === 'teacher') &&
          item.result &&
          typeof item.result.content === 'string'
      )
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch {
    return [];
  }
}

function writeRawHistoryList(
  entries: StudioHistoryEntry[],
  storageOverride?: StorageAdapter | null
): void {
  const storage = getDefaultStorage(storageOverride);
  if (!storage) return;
  let bounded = [...entries]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, MAX_STORED_STUDIO_ENTRIES);

  // Guard against localStorage QuotaExceededError by trimming oldest entries if needed
  while (bounded.length > 0) {
    try {
      storage.setItem(STUDIO_HISTORY_STORAGE_KEY, JSON.stringify(bounded));
      emitStudioHistoryUpdate();
      return;
    } catch {
      bounded = bounded.slice(0, bounded.length - 1);
    }
  }
  try {
    storage.removeItem(STUDIO_HISTORY_STORAGE_KEY);
    emitStudioHistoryUpdate();
  } catch {
    // ignore
  }
}

export function loadAllStudioHistory(
  role?: PersonaRole,
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry[] {
  const all = readRawHistoryList(storageOverride);
  if (!role) return all;
  return all.filter((entry) => entry.role === role);
}

export function loadStudioHistory(
  studioId: TrackedStudioId,
  role: PersonaRole,
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry[] {
  return readRawHistoryList(storageOverride).filter(
    (entry) => entry.studioId === studioId && entry.role === role
  );
}

export function saveStudioHistoryEntry(
  input: Omit<StudioHistoryEntry, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: number;
  },
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry {
  const entry: StudioHistoryEntry = {
    id: input.id || `st-${input.studioId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studioId: input.studioId,
    role: input.role,
    ownerId: (input.ownerId || 'default').trim(),
    title: (input.title || STUDIO_LABELS[input.studioId] || 'Studio Output').slice(0, 140),
    subtitle: (input.subtitle || '').slice(0, 180),
    subject: (input.subject || 'Mathematics').slice(0, 80),
    inputsSnapshot: { ...(input.inputsSnapshot || {}) },
    result: {
      content: input.result.content,
      durationSeconds: input.result.durationSeconds,
      reasoningTokens: input.result.reasoningTokens,
      model: input.result.model,
      source: input.result.source,
      webSources: input.result.webSources
    },
    timestamp: input.timestamp || Date.now()
  };

  const existing = readRawHistoryList(storageOverride).filter((e) => e.id !== entry.id);
  writeRawHistoryList([entry, ...existing], storageOverride);
  return entry;
}

export function deleteStudioHistoryEntry(
  id: string,
  storageOverride?: StorageAdapter | null
): void {
  const existing = readRawHistoryList(storageOverride);
  const next = existing.filter((entry) => entry.id !== id);
  if (next.length !== existing.length) {
    writeRawHistoryList(next, storageOverride);
  }
}

export function clearStudioHistory(
  studioId: TrackedStudioId,
  role: PersonaRole,
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry[] {
  const existing = readRawHistoryList(storageOverride);
  const removed = existing.filter((entry) => entry.studioId === studioId && entry.role === role);
  const kept = existing.filter((entry) => !(entry.studioId === studioId && entry.role === role));
  writeRawHistoryList(kept, storageOverride);
  return removed;
}

export function clearAllRoleStudioHistory(
  role: PersonaRole,
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry[] {
  const existing = readRawHistoryList(storageOverride);
  const removed = existing.filter((entry) => entry.role === role);
  const kept = existing.filter((entry) => entry.role !== role);
  writeRawHistoryList(kept, storageOverride);
  return removed;
}

export function mergeStudioHistoryLists(
  cloudEntries: StudioHistoryEntry[],
  storageOverride?: StorageAdapter | null
): StudioHistoryEntry[] {
  const local = readRawHistoryList(storageOverride);
  const byId = new Map<string, StudioHistoryEntry>();

  for (const item of local) {
    byId.set(item.id, item);
  }
  for (const item of cloudEntries) {
    const existing = byId.get(item.id);
    if (!existing || (item.timestamp || 0) > (existing.timestamp || 0)) {
      byId.set(item.id, item);
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  writeRawHistoryList(merged, storageOverride);
  return merged;
}

export function formatHistoryTimestamp(ts: number, nowTs: number = Date.now()): string {
  if (!ts || Number.isNaN(ts)) return 'Saved';
  const date = new Date(ts);
  const now = new Date(nowTs);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timePart = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (sameDay) {
    return `Today · ${timePart}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday · ${timePart}`;
  }

  const datePart = date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short'
  });
  return `${datePart} · ${timePart}`;
}
