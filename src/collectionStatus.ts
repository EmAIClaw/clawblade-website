import type { AlbumState } from './types';

export type Ownership = 'none' | 'want' | 'owned';
const statusKeys = ['owned', 'wantlist', 'listened', 'lastListened'] as const;
type StatusKey = typeof statusKeys[number];
export type StatusUndo = {
  albumId: string;
  keys: StatusKey[];
  before: Partial<AlbumState>;
  after: Partial<AlbumState>;
};

export function ownershipPatch(value: Ownership): Partial<AlbumState> {
  return { owned: value === 'owned', wantlist: value === 'want' };
}

export function listenedPatch(current: AlbumState, now: string): Partial<AlbumState> {
  return { listened: !current.listened, lastListened: current.listened ? current.lastListened : now };
}

export function makeStatusUndo(albumId: string, current: AlbumState, patch: Partial<AlbumState>): StatusUndo | null {
  const after = { ...patch };
  if (patch.owned === true) after.wantlist = false;
  if (patch.wantlist === true) after.owned = false;
  const keys = statusKeys.filter(key => key in after && !Object.is(current[key], after[key]));
  if (!keys.length) return null;
  return { albumId, keys, before: { ...current }, after };
}

export function applyStatusUndo(current: AlbumState, undo: StatusUndo): AlbumState {
  if (!undo.keys.every(key => Object.is(current[key], undo.after[key]))) return current;
  const restored = { ...current };
  for (const key of undo.keys) {
    if (undo.before[key] === undefined) delete restored[key];
    else Object.assign(restored, { [key]: undo.before[key] });
  }
  return restored;
}
