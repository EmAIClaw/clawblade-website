import type { TrackEncyclopediaAlbumEntry } from '../types';
import type { TrackEncyclopediaModuleRecord } from './runtime';

export type TrackEncyclopediaLoadState =
  | { albumId: string; status: 'loading' }
  | { albumId: string; status: 'loaded'; entry: TrackEncyclopediaAlbumEntry }
  | { albumId: string; status: 'missing' }
  | { albumId: string; status: 'error'; message: string };

export function loadTrackEncyclopediaState(
  albumId: string,
  modules: TrackEncyclopediaModuleRecord,
): Promise<Exclude<TrackEncyclopediaLoadState, { status: 'loading' }>>;
