import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const encyclopediaPath = path.join(root, "src/data/encyclopedia.generated.json");
const discoveryPath = path.join(root, "src/data/discovery.enhancements.json");

const utilityThemes = new Set([
  "Static reference",
  "Source-backed facts",
  "Track sequence"
]);

const handCuratedDiscoveryIds = new Set([
  "008-prince-and-the-revolution-purple-rain-e947342e",
  "038-frank-ocean-blonde-ef1630f4",
  "047-bob-marley-and-the-wailers-legend-e2c8278d",
  "074-curtis-mayfield-superfly-510928e7",
  "092-the-stooges-fun-house-9896fe5c",
  "093-drake-take-care-2901930a",
  "107-new-order-substance-6d4ec0bb",
  "114-the-cure-disintegration-6776240e",
  "116-eagles-hotel-california-9e650795",
  "126-queen-a-night-at-the-opera-2045d295",
  "129-portishead-dummy-db05d3e2",
  "139-pixies-doolittle-c1a0d67b",
  "143-blondie-parallel-lines-d5e00f60",
  "156-the-police-synchronicity-e8507abf",
  "157-pearl-jam-ten-4e010abd",
  "159-pulp-different-class-47b7d265",
  "161-buddy-holly-20-golden-greats-83b1a203",
  "193-pavement-slanted-and-enchanted-b504cf59",
  "194-sade-diamond-life-94eccc39",
  "201-eagles-eagles-2d9c67f1",
  "212-tlc-crazysexycool-ac12332d",
  "217-dixie-chicks-fly-b6577223",
  "222-patsy-cline-showcase-830924eb",
  "240-sade-love-deluxe-65bfff6a"
]);

const curatedArtistContexts = {
  "008-prince-and-the-revolution-purple-rain-e947342e":
    "By 1984, Prince had already become one of pop's most gifted provocateurs, but Purple Rain is where his private Minneapolis universe became mass culture. With the Revolution, he expanded from funk auteur into bandleader, movie star, guitar hero, and pop architect without giving up his eccentric charge.",
  "093-drake-take-care-2901930a":
    "Drake entered Take Care as a new kind of rap star: commercially dominant, emotionally porous, and fluent in both mixtape introspection and pop-scale hooks. The album captures him turning Toronto atmosphere, R&B vulnerability, and rap status anxiety into a durable mainstream language.",
  "107-new-order-substance-6d4ec0bb":
    "New Order formed from the aftermath of Joy Division, carrying post-punk gravity into a decade increasingly shaped by sequencers, clubs, and electronic rhythm. Substance collects the singles where that transformation becomes clearest: grief converted into movement.",
  "116-eagles-hotel-california-9e650795":
    "By Hotel California, Eagles had moved beyond easygoing country-rock into a darker, more exacting version of Los Angeles studio rock. The band had the confidence of superstars and the unease of people beginning to distrust the paradise they helped sell.",
  "126-queen-a-night-at-the-opera-2045d295":
    "Queen arrived at A Night at the Opera as a band determined to make virtuosity theatrical rather than dutiful. Freddie Mercury, Brian May, Roger Taylor, and John Deacon each brought distinct songwriting identities, which is why the album feels like a variety show with rock power at its core.",
  "129-portishead-dummy-db05d3e2":
    "Portishead emerged from Bristol's post-rave, hip-hop, dub, and sound-system culture, but Dummy turned those ingredients inward. Geoff Barrow, Beth Gibbons, and Adrian Utley made sampling and noir atmosphere feel less like style than emotional weather.",
  "139-pixies-doolittle-c1a0d67b":
    "Pixies were already a cult force by Doolittle, with Black Francis's surreal writing, Kim Deal's melodic gravity, and a band language built on sudden contrasts. The album catches them tightening their chaos into songs that could reshape alternative rock.",
  "143-blondie-parallel-lines-d5e00f60":
    "Blondie came out of New York's punk and new-wave scene, but Parallel Lines shows how naturally they could absorb disco, girl-group pop, and radio craft. Debbie Harry's cool delivery gave the band glamour without making it feel obedient.",
  "159-pulp-different-class-47b7d265":
    "Pulp had spent years as outsiders before Different Class made Jarvis Cocker's observational pop a national language. Their late arrival matters: the songs sound like they are being sung by someone who has watched every party from the corner before stepping into the light.",
  "193-pavement-slanted-and-enchanted-b504cf59":
    "Pavement arrived with an anti-heroic version of rock intelligence: loose, funny, evasive, and secretly full of hooks. Slanted and Enchanted made the band's rough edges feel like an argument for a different kind of ambition.",
  "194-sade-diamond-life-94eccc39":
    "Sade entered the 1980s pop landscape with unusual restraint: a band built around jazz-soul poise, quiet rhythmic confidence, and Sade Adu's controlled emotional temperature. Diamond Life made understatement feel like its own form of glamour.",
  "201-eagles-eagles-2d9c67f1":
    "On their debut, Eagles were still close to the country-rock currents surrounding Linda Ronstadt, Jackson Browne, and the Los Angeles singer-songwriter scene. The group identity is already clear: harmonies first, road imagery second, polish everywhere.",
  "212-tlc-crazysexycool-ac12332d":
    "TLC entered CrazySexyCool as a group with three sharply defined public personas and enough musical range to make them feel like a full pop ecosystem. Tionne Watkins, Lisa Lopes, and Rozonda Thomas made humor, sensuality, risk, and independence part of the same R&B language.",
  "217-dixie-chicks-fly-b6577223":
    "The Dixie Chicks reached Fly with instrumental credibility, radio momentum, and a point of view that felt livelier than the country-pop machinery around them. Their blend of bluegrass skill, harmony singing, and character-driven songs gave the album its personality.",
  "240-sade-love-deluxe-65bfff6a":
    "By Love Deluxe, Sade had refined a language of patience, elegance, and deep feeling. The band did not chase early-1990s trends; instead, they made quiet storm and soul feel darker, roomier, and more cinematic."
};

const soundByGenre = [
  {
    test: /hip-hop|rap/i,
    sound:
      "Rhythm and voice carry the argument: drums, samples, bass pressure, vocal cadence, and the tension between storytelling and swagger."
  },
  {
    test: /r&b|soul/i,
    sound:
      "The emotional center is in the voice, but the details live in groove, harmony, bass movement, and how the arrangement frames intimacy."
  },
  {
    test: /jazz/i,
    sound:
      "Listen for ensemble conversation: tone, space, improvisational decisions, and how rhythm players shape the room around the lead voices."
  },
  {
    test: /country/i,
    sound:
      "Songwriting and phrasing sit up front, with guitars, fiddle, pedal steel, or close harmony shaping the emotional plainness."
  },
  {
    test: /electronic|dance/i,
    sound:
      "Texture and repetition do much of the storytelling: drum programming, bass movement, atmosphere, and slow changes inside loops."
  },
  {
    test: /reggae/i,
    sound:
      "Bass and rhythm guitar carry the body of the music, while vocal phrasing, organ bubbles, and space create the sense of lift."
  },
  {
    test: /alternative|punk|rock|metal/i,
    sound:
      "The album's force comes through guitar texture, rhythm-section pressure, vocal attitude, and the way loudness or restraint shapes momentum."
  }
];

function firstSentence(text = "") {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^(.+?[.!?])\s/);
  return match?.[1] ?? cleaned;
}

function compact(text = "", limit = 360) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= limit) return cleaned;
  const clipped = cleaned.slice(0, limit).replace(/\s+\S*$/, "");
  return `${clipped}.`;
}

function cleanThemes(entry, album) {
  const values = new Set();
  if (album.genre) values.add(album.genre);
  for (const theme of entry?.themes ?? []) {
    if (!theme || utilityThemes.has(theme)) continue;
    const cleaned = theme.replace(/\s+/g, " ").trim();
    if (cleaned.length > 38) continue;
    values.add(cleaned[0].toUpperCase() + cleaned.slice(1));
  }
  values.add(`${Math.floor(album.year / 10) * 10}s`);
  return Array.from(values).slice(0, 6);
}

function inferSound(album, entry) {
  const haystack = `${album.genre ?? ""} ${(entry?.themes ?? []).join(" ")}`;
  return soundByGenre.find(({ test }) => test.test(haystack))?.sound ??
    "Listen for the album's production choices, vocal character, sequencing, and how repeated ideas change meaning across the record.";
}

function chooseStartHere(album, entry) {
  const guideByTitle = new Map((entry?.trackGuide ?? []).map((guide) => [guide.trackTitle, guide]));
  const scored = album.tracks.map((track, index) => {
    const guide = guideByTitle.get(track.title);
    let score = 0;
    if (index === 0) score += 18;
    if (track.title.toLowerCase().includes(album.title.toLowerCase().slice(0, 8))) score += 24;
    score += Math.min((guide?.guide?.length ?? 0) / 20, 25);
    if (guide?.focus) score += 8;
    if (!guide?._generated) score += 5;
    return { track, guide, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.track.trackNumber - b.track.trackNumber)
    .map(({ track, guide }) => ({
      trackTitle: track.title,
      note: compact(
        guide?.guide
          ? firstSentence(guide.guide)
          : `Use this track to locate the album's core mood, arrangement style, and sequencing logic.`,
        240
      )
    }));
}

function discoveryTags(album, entry) {
  const tags = cleanThemes(entry, album).filter(Boolean);
  if ((entry?.trackGuide ?? []).length > 14) tags.push("deep catalog listen");
  if ((entry?.trackGuide ?? []).length <= 9) tags.push("compact listen");
  if (album.rank <= 50) tags.push("canon gateway");
  tags.push("album discovery");
  tags.push(`rank ${album.rank}`);
  return Array.from(new Set(tags)).slice(0, 5);
}

function albumMatches(a, b, entryA, entryB) {
  let score = 0;
  if (a.genre && b.genre && a.genre === b.genre) score += 3;
  const themesA = new Set(cleanThemes(entryA, a).map((theme) => theme.toLowerCase()));
  for (const theme of cleanThemes(entryB, b)) {
    if (themesA.has(theme.toLowerCase())) score += 1;
  }
  if (Math.abs(a.year - b.year) <= 5) score += 1;
  return score;
}

function ifYouLike(album, entry, albums, encyclopedia) {
  return albums
    .filter((candidate) => candidate.id !== album.id)
    .map((candidate) => ({
      album: candidate,
      score: albumMatches(album, candidate, entry, encyclopedia.entries?.[candidate.id])
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.album.rank - b.album.rank)
    .slice(0, 3)
    .map(({ album: candidate }) => `${candidate.artist}'s ${candidate.title}`);
}

function makeListenFor(album, entry) {
  const notes = (entry?.listeningNotes ?? [])
    .filter((note) => !/No confident|metadata-only|source was matched/i.test(note))
    .map((note) => note.replace(/^Listen for\s+/i, "Listen for "));
  const additions = [
    inferSound(album, entry),
    "How the opening tracks teach you the album's rules before the later songs complicate them.",
    "Which details feel immediate on first listen and which ones only appear after repetition."
  ];
  return Array.from(new Set([...notes, ...additions])).slice(0, 3).map((item) => compact(item, 220));
}

function makeDiscovery(album, entry, albums, encyclopedia) {
  const artistContext = entry?.artistInfo?.summary
    ? compact(entry.artistInfo.summary, 520)
    : curatedArtistContexts[album.id] ?? `${album.artist} is the artist behind ${album.title}, a ${album.year} entry in this CD canon. This page needs a deeper artist-source match, but the listening guide below gives you a practical way into the record.`;
  const albumSummary = firstSentence(entry?.albumInfo?.summary) || firstSentence(entry?.context);
  const fallbackSummary = `${album.title} by ${album.artist} is a ${album.year} album in the AlbumVault canon, ranked #${album.rank} of ${albums.length}.`;

  return {
    artistContext,
    summary: compact(albumSummary || fallbackSummary, 360),
    whyItMatters: compact(
      entry?.relevance && !/^AlbumVault ranks it/i.test(entry.relevance)
        ? entry.relevance
        : `${album.title} matters here because it opens a specific doorway into ${album.artist}'s sound, era, and influence. Its rank at #${album.rank} makes it a strong discovery candidate, but the real value is hearing how the songs work as a sequence.`,
      420
    ),
    sound: inferSound(album, entry),
    startHere: chooseStartHere(album, entry),
    listenFor: makeListenFor(album, entry),
    ifYouLike: ifYouLike(album, entry, albums, encyclopedia),
    discoveryTags: discoveryTags(album, entry)
  };
}

function mergeDiscovery(existing, generated) {
  return {
    ...generated,
    ...existing,
    artistContext: existing.artistContext || generated.artistContext,
    startHere: existing.startHere?.length ? existing.startHere : generated.startHere,
    listenFor: existing.listenFor?.length ? existing.listenFor : generated.listenFor,
    ifYouLike: existing.ifYouLike?.length ? existing.ifYouLike : generated.ifYouLike,
    discoveryTags: existing.discoveryTags?.length >= 3 ? existing.discoveryTags : generated.discoveryTags
  };
}

async function main() {
  const [catalog, encyclopedia, current] = await Promise.all([
    readFile(catalogPath, "utf8").then(JSON.parse),
    readFile(encyclopediaPath, "utf8").then(JSON.parse),
    readFile(discoveryPath, "utf8").then(JSON.parse)
  ]);

  const entries = {};
  for (const album of catalog.albums) {
    const existing = handCuratedDiscoveryIds.has(album.id)
      ? current.entries?.[album.id]?.discovery ?? {}
      : {};
    const trackTitles = new Set(album.tracks.map((track) => track.title));
    if (
      existing.startHere?.length &&
      existing.startHere.some((pick) => !trackTitles.has(pick.trackTitle))
    ) {
      existing.startHere = [];
    }
    const generated = makeDiscovery(album, encyclopedia.entries?.[album.id], catalog.albums, encyclopedia);
    entries[album.id] = {
      discovery: mergeDiscovery(existing, generated)
    };
  }

  const next = {
    metadata: {
      ...current.metadata,
      version: (current.metadata?.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
      entryCount: Object.keys(entries).length,
      curatedOverrideCount: handCuratedDiscoveryIds.size,
      generatedBaselineCount: Object.keys(entries).length - handCuratedDiscoveryIds.size
    },
    entries
  };

  await writeFile(discoveryPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Updated ${discoveryPath}`);
  console.log(`Discovery entries: ${Object.keys(entries).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
