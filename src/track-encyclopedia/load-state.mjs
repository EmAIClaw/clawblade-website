import { loadTrackEncyclopediaAlbum } from './runtime.ts';

export async function loadTrackEncyclopediaState(albumId, modules) {
  if (!(albumId in modules)) return { albumId, status: 'missing' };
  try {
    const entry = await loadTrackEncyclopediaAlbum(albumId, modules);
    if (!entry) {
      return {
        albumId,
        status: 'error',
        message: 'Track encyclopedia data failed schema or integrity verification.',
      };
    }
    return { albumId, status: 'loaded', entry };
  } catch (error) {
    return {
      albumId,
      status: 'error',
      message: error instanceof Error ? error.message : 'Track encyclopedia load failed.',
    };
  }
}
