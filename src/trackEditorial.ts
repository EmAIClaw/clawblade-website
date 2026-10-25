// A small authored reading layer, bound to exact immutable research identity.
// This does not upgrade evidence status or change the original claims/excerpts.
import rumours from './data/rumours-editorial.json' with { type: 'json' };
import kindOfBlue from './data/kind-of-blue-editorial.json' with { type: 'json' };
import a1 from './data/next20-editorial/001-marvin-gaye-what-s-going-on-fd00dde9.json' with { type: 'json' };
import a2 from './data/next20-editorial/002-the-beach-boys-pet-sounds-eabcc325.json' with { type: 'json' };
import a3 from './data/next20-editorial/003-joni-mitchell-blue-9c3a8b85.json' with { type: 'json' };
import a4 from './data/next20-editorial/004-stevie-wonder-songs-in-the-key-of-life-0518d4f8.json' with { type: 'json' };
import a5 from './data/next20-editorial/005-the-beatles-abbey-road-1955f3c5.json' with { type: 'json' };
import a6 from './data/next20-editorial/006-nirvana-nevermind-0af5df5e.json' with { type: 'json' };
import a8 from './data/next20-editorial/008-prince-and-the-revolution-purple-rain-e947342e.json' with { type: 'json' };
import a9 from './data/next20-editorial/009-bob-dylan-blood-on-the-tracks-c704391c.json' with { type: 'json' };
import a10 from './data/next20-editorial/010-lauryn-hill-the-miseducation-of-lauryn-hill-57da212b.json' with { type: 'json' };
import a11 from './data/next20-editorial/011-the-beatles-revolver-b4f3c550.json' with { type: 'json' };
import a12 from './data/next20-editorial/012-michael-jackson-thriller-a46ba2f6.json' with { type: 'json' };
import a13 from './data/next20-editorial/013-aretha-franklin-i-never-loved-a-man-the-way-i-love-you-e41a23cf.json' with { type: 'json' };
import a14 from './data/next20-editorial/014-the-rolling-stones-exile-on-main-st-9d89aa7d.json' with { type: 'json' };
import a15 from './data/next20-editorial/015-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-749205b0.json' with { type: 'json' };
import a16 from './data/next20-editorial/016-the-clash-london-calling-7d75cf05.json' with { type: 'json' };
import a17 from './data/next20-editorial/017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087.json' with { type: 'json' };
import a18 from './data/next20-editorial/018-bob-dylan-highway-61-revisited-bd0599b4.json' with { type: 'json' };
import a19 from './data/next20-editorial/019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a.json' with { type: 'json' };
import a20 from './data/next20-editorial/020-radiohead-kid-a-ce842ff2.json' with { type: 'json' };
import a21 from './data/next20-editorial/021-bruce-springsteen-born-to-run-21f663bb.json' with { type: 'json' };
import type { TrackEncyclopediaAlbumEntry, TrackEncyclopediaEntry } from './types';

type EditorialEntry = {
  discNumber: number; trackNumber: number; trackTitle: string;
  description: string; question?: string; claimIds: string[];
  sourceContext?: string; sourceLabels?: Partial<Record<string, string>>;
};
type EditorialAlbum = {
  albumId: string; editionNumber: number; contentHash: string; scope: string;
  entries: EditorialEntry[]; sourceLabel?: string; sourceContext?: string;
  retainPilotGuidance?: boolean;
};
const editions: EditorialAlbum[] = [
  { ...rumours, sourceLabel: 'Ken Caillat · MusicRadar', sourceContext: 'Recording account', retainPilotGuidance: true },
  { ...kindOfBlue, sourceLabel: 'Bill Evans’s liner notes, via Wikipedia', sourceContext: 'Form guide', retainPilotGuidance: true },
  a1, a2, a3, a4, a5, a6, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18, a19, a20, a21,
];

export function resolveEditorialAlbum(album: TrackEncyclopediaAlbumEntry | null | undefined) {
  if (!album) return undefined;
  const candidates = editions.filter(e => e.albumId === album.albumId &&
    e.editionNumber === album.editionNumber && e.contentHash === album.contentHash);
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function resolveTrackEditorial(
  album: TrackEncyclopediaAlbumEntry | null | undefined,
  track: Pick<TrackEncyclopediaEntry, 'albumId' | 'discNumber' | 'trackNumber' | 'trackTitle'> | undefined,
) {
  if (!album || !track || track.albumId !== album.albumId) return undefined;
  const data = resolveEditorialAlbum(album);
  if (!data) return undefined;
  const matches = album.trackEntries.filter(t => t.albumId === track.albumId &&
    t.discNumber === track.discNumber && t.trackNumber === track.trackNumber && t.trackTitle === track.trackTitle);
  if (matches.length !== 1 || matches[0].evidenceLevel !== 'documented') return undefined;
  const notes = data.entries.filter(e => e.discNumber === track.discNumber &&
    e.trackNumber === track.trackNumber && e.trackTitle === track.trackTitle);
  if (notes.length !== 1) return undefined;
  const note = notes[0];
  const facts = note.claimIds.map(id => matches[0].verifiedFacts.find(f => f.claimId === id));
  if (!facts.length || facts.some(f => !f || !f.sourceRefs.length)) return undefined;
  const sources = [...new Map(facts.flatMap(f => f!.sourceRefs).map(s => [s.url, s])).values()]
    .map(source => ({ ...source, label: note.sourceLabels?.[source.url] ?? data.sourceLabel }));
  // A missing per-source credit must never inherit an unrelated track's attribution.
  if (sources.some(source => !source.label)) return undefined;
  return { ...note, sources, scope: data.scope, sourceLabel: data.sourceLabel,
    sourceContext: note.sourceContext ?? data.sourceContext };
}
