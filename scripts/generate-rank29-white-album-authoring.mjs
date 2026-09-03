// Generate rank-29 authoring and source artifact for The Beatles — The Beatles (White Album).
// Uses the fetched/pandoc-extracted Wikipedia album article Songs section as a
// single source artifact. Each track retains one narrow, track-specific verbatim
// claim with exact offsets into the retained source context.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '029-the-beatles-the-beatles-white-album-29eb84d8';
const CHECKED_AT = '2026-09-03';
const COLLECTOR_RUN_ID = 'rank29-white-album-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = 'reports/rank29-white-album-source-collection.json';
const SOURCE = {
  canonicalUrl: 'https://en.wikipedia.org/wiki/The_Beatles_(album)',
  label: 'Wikipedia The Beatles album article',
  title: 'The Beatles (album) - Wikipedia',
  identity: 'en.wikipedia.org|The Beatles album article',
};

const documented = [
  { disc: 1, n: 1, title: 'Back In the U.S.S.R.', claim: 'Wikipedia states that "Back in the U.S.S.R." uses a field recording of a jet aeroplane taking off and landing at the start and intermittently throughout the track.', excerpt: 'A field recording of a jet aeroplane taking off and landing was used at the start of the track, and intermittently throughout it.' },
  { disc: 1, n: 2, title: 'Dear Prudence', claim: 'Wikipedia states that Lennon wrote "Dear Prudence" about Prudence Farrow, Mia Farrow\'s sister, who rarely left her room during the Rishikesh meditation stay.', excerpt: 'Lennon wrote the track about Mia Farrow\'s sister Prudence Farrow, who rarely left her room during the stay in commitment to the meditation.' },
  { disc: 1, n: 3, title: 'Glass Onion', claim: 'Wikipedia states that "Glass Onion" was the first backing track recorded as a full band after Ringo Starr\'s brief departure.', excerpt: '"Glass Onion" was the first backing track recorded as a full band after Starr\'s brief departure.' },
  { disc: 1, n: 4, title: 'Ob-La-Di, Ob-La-Da', claim: 'Wikipedia states that Jimmy Scott suggested the title "Ob-La-Di, Ob-La-Da" and played bongos on the initial take.', excerpt: 'Jimmy Scott, a friend of McCartney, suggested the title and played bongos on the initial take.' },
  { disc: 1, n: 5, title: 'Wild Honey Pie', claim: 'Wikipedia states that McCartney recorded "Wild Honey Pie" on 20 August at the end of the "Mother Nature\'s Son" session.', excerpt: 'McCartney recorded "Wild Honey Pie" on 20 August at the end of the session for "Mother Nature\'s Son".' },
  { disc: 1, n: 6, title: 'The Continuing Story of Bungalow Bill', claim: 'Wikipedia states that "The Continuing Story of Bungalow Bill" was written by Lennon after an American visitor to Rishikesh left for a tiger-hunting trip.', excerpt: '"The Continuing Story of Bungalow Bill" was written by Lennon after an American visitor to Rishikesh left for a few weeks to hunt tigers.' },
  { disc: 1, n: 7, title: 'While My Guitar Gently Weeps', claim: 'Wikipedia states that Harrison invited Eric Clapton to play on "While My Guitar Gently Weeps" after being unhappy with the group\'s first attempt at the track.', excerpt: 'He was unhappy with the group\'s first attempt to record the track, and so invited his friend Eric Clapton to come and play on it.' },
  { disc: 1, n: 8, title: 'Happiness Is a Warm Gun', claim: 'Wikipedia states that the basic backing track for "Happiness Is a Warm Gun" ran to 95 takes because of its irregular time signatures and style changes.', excerpt: 'The basic backing track ran to 95 takes, due to the irregular time signatures and variations in style throughout the song.' },
  { disc: 1, n: 9, title: 'Martha My Dear', claim: 'Wikipedia states that McCartney took the title "Martha My Dear" from his Old English Sheepdog, while the lyrics are otherwise unrelated.', excerpt: 'McCartney took the title of "Martha My Dear" from his Old English Sheepdog, but the lyrics are otherwise unrelated.' },
  { disc: 1, n: 10, title: "I'm So Tired", claim: 'Wikipedia states that Lennon wrote "I\'m So Tired" in India while having difficulty sleeping.', excerpt: '"I\'m So Tired" was written in India when Lennon was having difficulty sleeping.' },
  { disc: 1, n: 11, title: 'Blackbird', claim: 'Wikipedia states that the birdsong on "Blackbird" came from the Abbey Road sound effects collection.', excerpt: 'The birdsong on the track was taken from the Abbey Road sound effects collection, and was recorded on one of the first EMI portable tape recorders.' },
  { disc: 1, n: 12, title: 'Piggies', claim: 'Wikipedia states that Harrison wrote "Piggies" as an attack on greed and materialism in modern society.', excerpt: 'Harrison wrote "Piggies" as an attack on greed and materialism in modern society.' },
  { disc: 1, n: 13, title: 'Rocky Raccoon', claim: 'Wikipedia states that "Rocky Raccoon" evolved from a jam session with McCartney, Lennon and Donovan in Rishikesh.', excerpt: '"Rocky Raccoon" evolved from a jam session with McCartney, Lennon and Donovan in Rishikesh.' },
  { disc: 1, n: 14, title: "Don't Pass Me By", claim: 'Wikipedia states that "Don\'t Pass Me By" was Ringo Starr\'s first solo composition for the Beatles.', excerpt: '"Don\'t Pass Me By" was Starr\'s first solo composition for the band;' },
  { disc: 1, n: 15, title: "Why Don't We Do It In the Road?", claim: 'Wikipedia states that McCartney wrote "Why Don\'t We Do It in the Road?" in India after seeing two monkeys copulating in the street.', excerpt: 'McCartney wrote "Why Don\'t We Do It in the Road?" in India after he saw two monkeys copulating in the street and wondered why humans were too civilised to do the same.' },
  { disc: 1, n: 16, title: 'I Will', claim: 'Wikipedia states that during takes for "I Will", McCartney, Lennon and Starr broke off to busk other songs.', excerpt: 'In between numerous takes, the three Beatles broke off to busk some other songs.' },
  { disc: 1, n: 17, title: 'Julia', claim: 'Wikipedia states that "Julia" is the only Beatles song on which Lennon performs alone.', excerpt: 'This is the only Beatles song on which Lennon performs alone.' },
  { disc: 2, n: 1, title: 'Birthday', claim: 'Wikipedia states that McCartney described the authorship of "Birthday" as "50-50 John and me, made up on the spot and recorded all on the same evening."', excerpt: 'According to McCartney, the authorship of "Birthday" was "50–50 John and me, made up on the spot and recorded all on the same evening".' },
  { disc: 2, n: 2, title: 'Yer Blues', claim: 'Wikipedia states that the backing track for "Yer Blues" was recorded in a small room next to the Studio 2 control room.', excerpt: 'The backing track was recorded in a small room next to the Studio 2 control room.' },
  { disc: 2, n: 3, title: "Mother Nature's Son", claim: 'Wikipedia states that McCartney wrote "Mother Nature\'s Son" in India and worked on it apart from the other Beatles.', excerpt: 'McCartney wrote "Mother Nature\'s Son" in India, and worked on it in isolation from the other members of the band.' },
  { disc: 2, n: 4, title: "Everybody's Got Something to Hide Except Me and My Monkey", claim: 'Wikipedia states that the final mix of "Everybody\'s Got Something to Hide Except Me and My Monkey" was sped up by mixing the tape at 43 hertz instead of the usual 50.', excerpt: 'The final mix was sped up by mixing the tape running at 43 hertz instead of the usual 50.' },
  { disc: 2, n: 5, title: 'Sexy Sadie', claim: 'Wikipedia states that Lennon wrote "Sexy Sadie" as "Maharishi" shortly after deciding to leave Rishikesh.', excerpt: '"Sexy Sadie" was written as "Maharishi" by Lennon shortly after he decided to leave Rishikesh.' },
  { disc: 2, n: 6, title: 'Helter Skelter', claim: 'Wikipedia states that McCartney wrote "Helter Skelter" and that it was initially recorded in July as a blues number.', excerpt: '"Helter Skelter" was written by McCartney and was initially recorded in July as a blues number.' },
  { disc: 2, n: 7, title: 'Long, Long, Long', claim: 'Wikipedia states that the rattling effect at the end of "Long, Long, Long" was created by a note making a wine bottle on the Leslie speaker resonate.', excerpt: 'an "eerie rattling" effect at the end was created by a note causing a wine bottle on top of the organ\'s Leslie speaker to resonate.' },
  { disc: 2, n: 8, title: 'Revolution 1', claim: 'Wikipedia states that "Revolution 1" was the first track recorded for the White Album, with backing-track sessions starting on 30 May.', excerpt: '"Revolution 1" was the first track recorded for the album, with sessions for the backing track starting on 30 May.' },
  { disc: 2, n: 9, title: 'Honey Pie', claim: 'Wikipedia states that McCartney wrote "Honey Pie" as a pastiche of 1920s flapper dance style.', excerpt: 'McCartney wrote "Honey Pie" as a pastiche of the 1920s\' flapper dance style.' },
  { disc: 2, n: 10, title: 'Savoy Truffle', claim: 'Wikipedia states that "Savoy Truffle" was named after one of the chocolates in a box of Mackintosh\'s Good News that Eric Clapton enjoyed eating.', excerpt: '"Savoy Truffle" was named after one of the types of chocolate found in a box of Mackintosh\'s Good News, which Clapton enjoyed eating.' },
  { disc: 2, n: 11, title: 'Cry Baby Cry', claim: 'Wikipedia states that Lennon began writing "Cry Baby Cry" in late 1967 and partly derived the lyrics from an old television commercial tagline.', excerpt: 'Lennon began writing "Cry Baby Cry" in late 1967 and the lyrics were partly derived from the tagline of an old television commercial.' },
  { disc: 2, n: 12, title: 'Revolution 9', claim: 'Wikipedia states that "Revolution 9" evolved from overdubs from the "Revolution 1" coda, with Lennon, Harrison and Ono adding tape collages and spoken-word extracts.', excerpt: '"Revolution 9" evolved from the overdubs from the "Revolution 1" coda. Lennon, Harrison and Ono added further tape collages and spoken word extracts, in the style of Karlheinz Stockhausen.' },
  { disc: 2, n: 13, title: 'Good Night', claim: 'Wikipedia states that Lennon wrote "Good Night" as a lullaby for Julian and wanted Ringo Starr to sing it.', excerpt: 'Lennon wrote "Good Night" as a lullaby for his son Julian, and wanted Starr to sing it.' },
];

const response = await fetch(SOURCE.canonicalUrl, {
  redirect: 'follow',
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
    accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
  },
  signal: AbortSignal.timeout(45000),
});
const bytes = Buffer.from(await response.arrayBuffer());
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const contentType = response.headers.get('content-type') || 'application/octet-stream';
const contentEncoding = response.headers.get('content-encoding');
const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
const extracted = extractHtml(decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1'));
const normalized = normalizeEvidenceText(extracted.text);
if (!normalized) throw new Error('Fetched response produced no extractable text.');

const located = [];
for (const track of documented) {
  const span = locateExactOrTypographyEquivalent(normalized, normalizeEvidenceText(track.excerpt));
  if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title} :: ${track.excerpt}`);
  located.push({ ...track, excerpt: span.excerpt, start: span.start, end: span.end });
}
let start = Math.max(0, Math.min(...located.map((item) => item.start)) - CONTEXT_RADIUS);
let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + CONTEXT_RADIUS);
while (start < end && normalized[start] === ' ') start += 1;
while (end > start && normalized[end - 1] === ' ') end -= 1;
const retainedText = normalized.slice(start, end);
const completeSource = start === 0 && end === normalized.length;
const artifact = createSourceArtifact({
  canonicalUrl: SOURCE.canonicalUrl,
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

const trackEntries = located.map((t) => {
  const sourceRef = {
    label: SOURCE.label,
    title: SOURCE.title,
    url: canonicalizeSourceUrl(SOURCE.canonicalUrl),
    sourceIdentity: SOURCE.identity,
    extractType: 'verbatim',
    evidenceStatus: 'retrieved',
    checkedAt: CHECKED_AT,
    extract: t.excerpt,
    artifactId: artifact.artifactId,
    section: { kind: 'character-offsets', start: t.start - start, end: t.end - start },
  };
  return {
    albumId: ALBUM_ID,
    discNumber: t.disc,
    trackNumber: t.n,
    trackTitle: t.title,
    evidenceLevel: 'documented',
    verifiedFacts: [{ claimId: `${ALBUM_ID}:${t.disc}:${t.n}:fact-1`, claim: t.claim, sourceRefs: [sourceRef] }],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
    limitations: ['One attributed recording/songwriting statement retained; no musical analysis, lyric interpretation, or complete session reconstruction is claimed.'],
    sourceRefs: [{ label: SOURCE.label, title: SOURCE.title, url: canonicalizeSourceUrl(SOURCE.canonicalUrl) }],
  };
}).sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);

const entry = {
  albumId: ALBUM_ID,
  editionNumber: 1,
  published: false,
  changeNote: 'Complete all thirty The Beatles (White Album) catalog tracks with track-specific evidence and independent semantic review.',
  trackEntries,
  generationMetadata: { generatedAt: '2026-09-03T00:00:00.000Z', generator: 'codex-rank29-track-encyclopedia-author', model: 'gpt-5-codex' },
  reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  contentHash: '',
};
const doc = { metadata: { version: '1.0.0-candidate', generatedAt: '2026-09-03T00:00:00.000Z', albumCount: 1 }, entries: { [ALBUM_ID]: entry } };
await writeFile(path.join(dataDir, 'authoring', `${ALBUM_ID}.json`), `${JSON.stringify(doc, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results: [{ canonicalUrl: SOURCE.canonicalUrl, finalUrl: artifact.finalUrl, status: 'collected', artifactId: artifact.artifactId, fetchedResponseSha256, contentType, retainedCharacters: retainedText.length, fetchedCharacters: normalized.length, claims: located.map((item) => ({ albumId: ALBUM_ID, trackTitle: item.title, factIndex: 0, refIndex: 0, retainedExtract: item.excerpt, section: { kind: 'character-offsets', start: item.start - start, end: item.end - start } })) }] }, null, 2)}\n`);
console.log(JSON.stringify({ albumId: ALBUM_ID, tracks: trackEntries.length, sourceArtifact: artifact.artifactId, fetchedResponseSha256, retainedCharacters: retainedText.length, fetchedCharacters: normalized.length, reportPath }, null, 2));

function locateExactOrTypographyEquivalent(sourceText, authoredExcerpt) {
  const exactStart = sourceText.indexOf(authoredExcerpt);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + authoredExcerpt.length, excerpt: sourceText.slice(exactStart, exactStart + authoredExcerpt.length) };
  const sourceComparable = comparableTypography(sourceText);
  const excerptComparable = comparableTypography(authoredExcerpt);
  const startIdx = sourceComparable.indexOf(excerptComparable);
  if (startIdx < 0) return null;
  return { start: startIdx, end: startIdx + authoredExcerpt.length, excerpt: sourceText.slice(startIdx, startIdx + authoredExcerpt.length) };
}
function comparableTypography(text) {
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '.').replace(/\u00a0/g, ' ');
}
function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}
function extractHtml(html) {
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout };
}
