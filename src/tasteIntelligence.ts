import type { Album, VaultState } from "./types";

const returnGapMs = 90 * 24 * 60 * 60 * 1000;

export type ReturnRecommendation = {
  album: Album;
  lastListenedAt: string;
};

export type CollectionStory = {
  arcStatement: string;
  returnTo: ReturnRecommendation | null;
  firstListen: Album | null;
};

function validPastTime(value: string | undefined, nowTime: number) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= nowTime ? time : null;
}

function storyArc(ownedAlbums: Album[]) {
  if (!ownedAlbums.length) {
    return "Mark records as owned to reveal the decades and genres that shape your collection.";
  }

  const decades = ownedAlbums
    .map((album) => Math.floor(album.year / 10) * 10)
    .sort((a, b) => a - b);
  const firstDecade = `${decades[0]}s`;
  if (ownedAlbums.length === 1) {
    const genre = ownedAlbums[0].genre ? ` through ${ownedAlbums[0].genre}` : "";
    return `One owned record places your story in the ${firstDecade}${genre}. Add more to reveal an arc.`;
  }

  const genreCounts = new Map<string, number>();
  ownedAlbums.forEach((album) => {
    if (album.genre) {
      genreCounts.set(album.genre, (genreCounts.get(album.genre) ?? 0) + 1);
    }
  });
  const genres = Array.from(genreCounts.entries()).sort(
    ([genreA, countA], [genreB, countB]) =>
      countB - countA || genreA.localeCompare(genreB)
  );
  const leadCount = genres[0]?.[1] ?? 0;
  const leadGenres = genres
    .filter(([, count]) => count === leadCount)
    .map(([genre]) => genre);
  const genrePhrase = leadGenres.length === 1
    ? `with ${leadGenres[0]} as the strongest thread.`
    : leadGenres.length > 1
      ? `moving through ${leadGenres.slice(0, 2).join(" and ")}.`
      : "with its genre thread still uncatalogued.";

  const lastDecade = `${decades[decades.length - 1]}s`;
  if (firstDecade === lastDecade) {
    return `Your collection is rooted in the ${firstDecade}, ${genrePhrase}`;
  }

  return `Your shelves travel from the ${firstDecade} to the ${lastDecade}, ${genrePhrase}`;
}

export function buildCollectionStory(
  catalog: Album[],
  state: VaultState,
  now = new Date()
): CollectionStory {
  const nowTime = now.getTime();
  const latestListenByAlbum = new Map<string, number>();

  Object.entries(state.albums).forEach(([albumId, albumState]) => {
    const time = validPastTime(albumState.lastListened, nowTime);
    if (time !== null) latestListenByAlbum.set(albumId, time);
  });

  state.sessions.forEach((session) => {
    const time = validPastTime(
      session.completedAt ?? session.startedAt,
      nowTime
    );
    if (time === null) return;
    const current = latestListenByAlbum.get(session.albumId);
    if (current === undefined || time > current) {
      latestListenByAlbum.set(session.albumId, time);
    }
  });

  const ownedAlbums = catalog.filter((album) => state.albums[album.id]?.owned);
  const returnAlbum = ownedAlbums
    .map((album) => ({ album, time: latestListenByAlbum.get(album.id) }))
    .filter(
      (item): item is { album: Album; time: number } =>
        item.time !== undefined && nowTime - item.time >= returnGapMs
    )
    .sort((a, b) => a.time - b.time || a.album.rank - b.album.rank)[0];

  const firstListen = ownedAlbums
    .filter((album) => {
      const albumState = state.albums[album.id] ?? {};
      return !(
        albumState.listened ||
        (albumState.listenCount ?? 0) > 0 ||
        latestListenByAlbum.has(album.id)
      );
    })
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))[0] ?? null;

  return {
    arcStatement: storyArc(ownedAlbums),
    returnTo: returnAlbum
      ? {
          album: returnAlbum.album,
          lastListenedAt: new Date(returnAlbum.time).toISOString()
        }
      : null,
    firstListen
  };
}
