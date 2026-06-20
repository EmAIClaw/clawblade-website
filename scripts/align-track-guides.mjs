import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'src/data/catalog.generated.json');
const encyclopediaPath = path.join(root, 'src/data/encyclopedia.generated.json');

function normalizeTitle(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function fallbackGuide(album, track) {
  return {
    trackTitle: track.title,
    guide: `${track.title} sits within ${album.title}'s album arc. Listen for how the arrangement, dynamics, vocal or instrumental choices, and placement in the sequence shape the record's overall emotional momentum.`,
    focus: 'Generated alignment note — needs curated review',
    source: null
  };
}

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const encyclopedia = JSON.parse(await readFile(encyclopediaPath, 'utf8'));
let changedAlbums = 0;
let generatedGuides = 0;
let reorderedGuides = 0;
let removedExtras = 0;

for (const album of catalog.albums ?? []) {
  const entry = encyclopedia.entries?.[album.id];
  if (!entry || !Array.isArray(album.tracks)) continue;

  const guides = Array.isArray(entry.trackGuide) ? entry.trackGuide : [];
  const exact = new Map();
  const normalized = new Map();
  for (const guide of guides) {
    if (!guide?.trackTitle) continue;
    if (!exact.has(guide.trackTitle)) exact.set(guide.trackTitle, guide);
    const key = normalizeTitle(guide.trackTitle);
    if (key && !normalized.has(key)) normalized.set(key, guide);
  }

  const nextGuides = album.tracks.map((track) => {
    const exactGuide = exact.get(track.title);
    if (exactGuide) return { ...exactGuide, trackTitle: track.title };

    const normalizedGuide = normalized.get(normalizeTitle(track.title));
    if (normalizedGuide) {
      return { ...normalizedGuide, trackTitle: track.title };
    }

    generatedGuides += 1;
    return fallbackGuide(album, track);
  });

  const oldTitles = guides.map((guide) => guide.trackTitle);
  const newTitles = nextGuides.map((guide) => guide.trackTitle);
  if (JSON.stringify(oldTitles) !== JSON.stringify(newTitles)) {
    changedAlbums += 1;
    if (oldTitles.length === newTitles.length) reorderedGuides += 1;
    if (oldTitles.length > newTitles.length) removedExtras += oldTitles.length - newTitles.length;
    entry.trackGuide = nextGuides;
    entry.relevance = String(entry.relevance ?? '')
      .replace(/Track-specific source summaries: \d+\./, `Track-specific source summaries: ${nextGuides.length}.`);
  }
}

encyclopedia.metadata = {
  ...(encyclopedia.metadata ?? {}),
  lastAlignedAt: new Date().toISOString(),
  alignmentNote: 'trackGuide arrays are ordered to mirror catalog.generated.json track arrays'
};

await writeFile(encyclopediaPath, JSON.stringify(encyclopedia, null, 2) + '\n');
console.log(JSON.stringify({ changedAlbums, generatedGuides, reorderedGuides, removedExtras }, null, 2));
