#!/usr/bin/env node
// Generate rank-24 authoring and source artifacts for The Beatles — Sgt. Pepper's Lonely Hearts Club Band.
// Source artifacts are live HTTP fetches of Beatles Bible song pages, with exact offsets verified inside retained fetched text.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { computeTrackEncyclopediaContentHash, normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '024-the-beatles-sgt-pepper-s-lonely-hearts-club-band-dad95673';
const CHECKED_AT = '2026-09-03';
const GENERATED_AT = '2026-09-03T00:00:00.000Z';
const COLLECTOR_RUN_ID = 'rank24-sgt-pepper-http-collector-20260903';
const CONTEXT_RADIUS = 900;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = path.resolve('reports/rank24-sgt-pepper-source-collection.json');

const tracks = [
  {
    disc: 1,
    n: 1,
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    url: 'https://www.beatlesbible.com/songs/sgt-peppers-lonely-hearts-club-band/',
    pageTitle: "Sgt Pepper's Lonely Hearts Club Band (song) – song facts, recording info and more! | The Beatles Bible",
    claim: "The Beatles Bible states that on 6 March 1967 the Beatles added the title track's imaginary-audience sounds and orchestra-tuning noise.",
    excerpt: 'On 6 March they added the sounds of the imaginary audience and the noise of an orchestra tuning up',
  },
  {
    disc: 1,
    n: 2,
    title: 'With a Little Help From My Friends',
    url: 'https://www.beatlesbible.com/songs/with-a-little-help-from-my-friends/',
    pageTitle: 'With A Little Help From My Friends – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that “With A Little Help From My Friends” was sung by Ringo Starr.',
    excerpt: 'was sung by Ringo Starr',
  },
  {
    disc: 1,
    n: 3,
    title: 'Lucy In the Sky with Diamonds',
    url: 'https://www.beatlesbible.com/songs/lucy-in-the-sky-with-diamonds/',
    pageTitle: 'Lucy In The Sky With Diamonds – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that “Lucy In The Sky With Diamonds” took its name from a drawing by four-year-old Julian Lennon of a schoolfriend.',
    excerpt: '‘Lucy In The Sky With Diamonds’ in fact took its name from a drawing of a schoolfriend by the four-year-old Julian Lennon.',
  },
  {
    disc: 1,
    n: 4,
    title: 'Getting Better',
    url: 'https://www.beatlesbible.com/songs/getting-better/',
    pageTitle: 'Getting Better – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that the idea for “Getting Better” came from a favourite phrase of Jimmie Nicol, the Beatles’ 1964 stand-in drummer.',
    excerpt: 'the idea for ‘Getting Better’ came from a favourite phrase of Jimmie Nicol',
  },
  {
    disc: 1,
    n: 5,
    title: 'Fixing a Hole',
    url: 'https://www.beatlesbible.com/songs/fixing-a-hole/',
    pageTitle: 'Fixing A Hole – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that the Beatles used Regent Sound Studio for “Fixing A Hole” because Abbey Road was unavailable.',
    excerpt: 'The Beatles used Regent Sound Studio in London as Abbey Road was unavailable.',
  },
  {
    disc: 1,
    n: 6,
    title: "She's Leaving Home",
    url: 'https://www.beatlesbible.com/songs/shes-leaving-home/',
    pageTitle: "She's Leaving Home – song facts, recording info and more! | The Beatles Bible",
    claim: 'For “She’s Leaving Home”, The Beatles Bible states that Paul McCartney read about 17-year-old Melanie Coe in February 1967.',
    excerpt: 'In February 1967, Paul McCartney read about Melanie Coe, a 17-year-old A-level schoolgirl from Stamford Hill, north London.',
  },
  {
    disc: 1,
    n: 7,
    title: 'Being For the Benefit of Mr. Kite!',
    url: 'https://www.beatlesbible.com/songs/being-for-the-benefit-of-mr-kite/',
    pageTitle: 'Being For The Benefit Of Mr Kite! – facts, song background, recording info and more | The Beatles Bible',
    claim: 'The Beatles Bible states that John Lennon bought the framed 1843 Victorian circus poster used as inspiration for “Being For The Benefit Of Mr Kite!”',
    excerpt: 'There he bought a framed Victorian circus poster from 1843.',
  },
  {
    disc: 1,
    n: 8,
    title: 'Within You Without You',
    url: 'https://www.beatlesbible.com/songs/within-you-without-you/',
    pageTitle: 'Within You Without You – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that “Within You Without You” was composed on a harmonium following a dinner party.',
    excerpt: '‘Within You Without You’ was composed on a harmonium following a dinner party',
  },
  {
    disc: 1,
    n: 9,
    title: "When I'm Sixty-Four",
    url: 'https://www.beatlesbible.com/songs/when-im-sixty-four/',
    pageTitle: "When I'm Sixty-Four – song facts, recording info and more! | The Beatles Bible",
    claim: 'The Beatles Bible states that Paul McCartney composed “When I’m Sixty-Four” on the family piano at 20 Forthlin Road when he was about 15.',
    excerpt: 'Paul McCartney had composed it on the family piano at 20 Forthlin Road, Liverpool “when I was about 15”.',
  },
  {
    disc: 1,
    n: 10,
    title: 'Lovely Rita',
    url: 'https://www.beatlesbible.com/songs/lovely-rita/',
    pageTitle: 'Lovely Rita – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible describes “Lovely Rita” as an affectionate tale of a female traffic warden that was originally written as an anti-authority satire.',
    excerpt: 'affectionate tale of a female traffic warden, was originally written as an anti-authority satire.',
  },
  {
    disc: 1,
    n: 11,
    title: 'Good Morning Good Morning',
    url: 'https://www.beatlesbible.com/songs/good-morning-good-morning/',
    pageTitle: 'Good Morning Good Morning – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that “Good Morning Good Morning” was inspired by a Kellogg’s commercial John Lennon heard while writing with the television on.',
    excerpt: '‘Good Morning Good Morning’ was inspired by a Kellogg’s commercial he heard while working with the television playing in the background.',
  },
  {
    disc: 1,
    n: 12,
    title: "Sgt. Pepper's Lonely Hearts Club Band (Reprise)",
    url: 'https://www.beatlesbible.com/songs/sgt-peppers-lonely-hearts-club-band-reprise/',
    pageTitle: "Sgt Pepper's Lonely Hearts Club Band (Reprise) – song facts, recording info and more! | The Beatles Bible",
    claim: 'The Beatles Bible states that “Sgt Pepper (Reprise)” was recorded on 1 April 1967 in Abbey Road’s Studio One.',
    excerpt: '‘Sgt Pepper (Reprise)’ was recorded on Saturday 1 April 1967 in Abbey Road’s vast studio one.',
  },
  {
    disc: 1,
    n: 13,
    title: 'A Day In the Life',
    url: 'https://www.beatlesbible.com/songs/a-day-in-the-life/',
    pageTitle: 'A Day In The Life – song facts, recording info and more! | The Beatles Bible',
    claim: 'The Beatles Bible states that the “Woke up, fell out of bed” middle section of “A Day In The Life” was an unfinished song fragment written by Paul McCartney.',
    excerpt: 'The middle section (“Woke up, fell out of bed”) was an unfinished song fragment written by Paul McCartney',
  },
];

await mkdir('reports', { recursive: true });
const byUrl = new Map();
for (const track of tracks) {
  const key = canonicalizeSourceUrl(track.url);
  if (!byUrl.has(key)) byUrl.set(key, []);
  byUrl.get(key).push(track);
}

const collection = [];
const sourceRefs = new Map();
for (const [canonicalUrl, sourceTracks] of byUrl.entries()) {
  const response = await fetch(canonicalUrl, { headers: { 'user-agent': 'albumvault-http-collector/1.0.0' } });
  const body = await response.text();
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${canonicalUrl}`);
  const fetchedResponseSha256 = createHash('sha256').update(body).digest('hex');
  const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
  const contentEncoding = response.headers.get('content-encoding') || undefined;
  const normalized = htmlToText(body);
  const located = [];
  for (const track of sourceTracks) {
    const span = locate(normalized, normalizeEvidenceText(track.excerpt));
    if (!span) throw new Error(`Exact excerpt missing from fetched response for ${track.title}: ${track.excerpt}`);
    located.push({ ...track, ...span });
  }
  let start = Math.max(0, Math.min(...located.map((item) => item.start)) - CONTEXT_RADIUS);
  let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + CONTEXT_RADIUS);
  while (start < end && normalized[start] === ' ') start += 1;
  while (end > start && normalized[end - 1] === ' ') end -= 1;
  const retainedText = normalized.slice(start, end);
  const completeSource = start === 0 && end === normalized.length;
  const artifact = createSourceArtifact({
    canonicalUrl,
    finalUrl: canonicalizeSourceUrl(response.url),
    retrievedAt: new Date().toISOString(),
    httpStatus: response.status,
    contentType,
    contentEncoding,
    collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: COLLECTOR_RUN_ID },
    collectionMethod: 'http-fetch',
    fetchedResponseSha256,
    normalizationVersion: 'nfkc-whitespace-v1',
    retainedText,
    window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
  });
  await writeSourceArtifact(artifactDir, artifact);
  collection.push({ canonicalUrl, finalUrl: artifact.finalUrl, artifactId: artifact.artifactId, fetchedResponseSha256, contentType, retainedCharacters: retainedText.length, fetchedCharacters: normalized.length, claims: located.map((item) => ({ trackTitle: item.title, section: { kind: 'character-offsets', start: item.start - start, end: item.end - start }, extract: retainedText.slice(item.start - start, item.end - start) })) });
  for (const item of located) {
    const extract = retainedText.slice(item.start - start, item.end - start);
    sourceRefs.set(`${item.disc}:${item.n}`, {
      label: 'The Beatles Bible song article',
      title: item.pageTitle,
      url: canonicalUrl,
      sourceIdentity: `beatlesbible.com|${item.title}`,
      extractType: 'verbatim',
      evidenceStatus: 'retrieved',
      checkedAt: CHECKED_AT,
      extract,
      artifactId: artifact.artifactId,
      section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
    });
  }
}

const trackEntries = tracks.map((track) => {
  const ref = sourceRefs.get(`${track.disc}:${track.n}`);
  return {
    albumId: ALBUM_ID,
    discNumber: track.disc,
    trackNumber: track.n,
    trackTitle: track.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{ claimId: `${ALBUM_ID}:${track.disc}:${track.n}:fact-1`, claim: track.claim, sourceRefs: [ref] }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One narrow source-bound statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: ref.label, title: ref.title, url: ref.url }],
  };
});

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all thirteen Sgt. Pepper catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: { generatedAt: GENERATED_AT, generator: 'codex-rank24-track-encyclopedia-author', model: 'gpt-5-codex' },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
entry.contentHash = computeTrackEncyclopediaContentHash(entry);
const doc = { metadata: { version: '1.0.0-candidate', generatedAt: GENERATED_AT, albumCount: 1 }, entries: { [ALBUM_ID]: entry } };
await writeFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), `${JSON.stringify(doc, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, albumId: ALBUM_ID, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results: collection }, null, 2)}\n`);
console.log(JSON.stringify({ albumId: ALBUM_ID, tracks: trackEntries.length, sourceArtifacts: collection.length, contentHash: entry.contentHash, reportPath }, null, 2));

function htmlToText(html) {
  return normalizeEvidenceText(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"'));
}

function locate(sourceText, excerpt) {
  let start = sourceText.indexOf(excerpt);
  if (start >= 0) return { start, end: start + excerpt.length };
  const sourceComparable = comparable(sourceText);
  const excerptComparable = comparable(excerpt);
  start = sourceComparable.indexOf(excerptComparable);
  if (start >= 0) return { start, end: start + excerpt.length };
  return null;
}

function comparable(text) {
  return normalizeEvidenceText(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}
