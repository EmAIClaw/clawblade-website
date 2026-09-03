// Collect rank-28 Voodoo source artifacts from fetched source bodies.
// Sources are scoped to track-specific Wikipedia song/album pages with verbatim
// excerpts located mechanically in pandoc-extracted fetched HTML.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '028-d-angelo-voodoo-b6406009';
const COLLECTOR_RUN_ID = 'rank28-voodoo-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank28-voodoo-source-collection.json';

const SOURCES = {
  album: { canonicalUrl: 'https://en.wikipedia.org/wiki/Voodoo_(D%27Angelo_album)' },
  devilsPie: { canonicalUrl: 'https://en.wikipedia.org/wiki/Devil%27s_Pie' },
  root: { canonicalUrl: 'https://en.wikipedia.org/wiki/The_Root' },
  untitled: { canonicalUrl: 'https://en.wikipedia.org/wiki/Untitled_(How_Does_It_Feel)' },
  feel: { canonicalUrl: "https://en.wikipedia.org/wiki/Feel_Like_Makin'_Love_(Roberta_Flack_song)" },
};

const tracks = [
  { n: 1, disc: 1, title: 'Playa Playa', source: 'album',
    excerpt: 'On his bass playing in the song, Pino Palladino recalled "I was thinking about Stevie Wonder in the choruses and P-Funk in the verses".' },
  { n: 2, disc: 1, title: "Devil's Pie", source: 'devilsPie',
    excerpt: 'DJ Premier originally made the track for Canibus but later offered it to D\'Angelo after Canibus rejected the song.' },
  { n: 3, disc: 1, title: 'Left and Right (feat. Redman & Method Man)', source: 'album',
    excerpt: '"Left & Right" is a funky party jam featuring rappers Method Man and Redman, who exchange verses as D\'Angelo sings the song\'s verses and chorus.' },
  { n: 4, disc: 1, title: 'The Line', source: 'album',
    excerpt: 'The introspective track "The Line" has a downtempo, spiritual sound with lyrics about dealing with some unnamed adversity.' },
  { n: 5, disc: 1, title: 'Send It On', source: 'album',
    excerpt: 'Co-written by D\'Angelo\'s former girlfriend, singer Angie Stone, "Send It On" contains lyrics concerning themes of honesty and faith in love, and features jazz trumpeter Roy Hargrove on flugelhorn.' },
  { n: 6, disc: 1, title: 'Chicken Grease', source: 'album',
    excerpt: '"Chicken Grease" is named after a technical term that musician Prince used for his guitarist to play a 9th minor chord while playing 16th notes.' },
  { n: 7, disc: 1, title: "One Mo'Gin", source: 'album',
    excerpt: 'Titled after a southern colloquial conflation of the terms "One More Time" and "Again", the mid-tempo ballad "One Mo\'Gin" has its narrator reminiscing about a former lover.' },
  { n: 8, disc: 1, title: 'The Root', source: 'root',
    excerpt: 'Charlie Hunter simultaneously plays a bass line and guitar solo for the song.' },
  { n: 9, disc: 1, title: 'Spanish Joint', source: 'album',
    excerpt: 'Co-written by Roy Hargrove, "Spanish Joint" is a salsa-infused, high tempo track about karma.' },
  { n: 10, disc: 1, title: "Feel Like Makin' Love", source: 'feel',
    excerpt: 'It was initially planned as a duet with R&B singer Lauryn Hill.' },
  { n: 11, disc: 1, title: "Greatdayndamornin' / Booty", source: 'album',
    excerpt: '"Greatdayndamornin\' / Booty\'" features double rimshots placed behind the beat by Questlove.' },
  { n: 12, disc: 1, title: 'Untitled (How Does It Feel)', source: 'untitled',
    excerpt: '"Untitled (How Does It Feel)" was originally intended as a tribute to influential musician Prince.' },
  { n: 13, disc: 1, title: 'Africa', source: 'album',
    excerpt: '"Africa" was originally written in honor of D\'Angelo\'s son, Michael Archer Jr.,' },
];

const results = [];
for (const [sourceKey, source] of Object.entries(SOURCES)) {
  const sourceTracks = tracks.filter((t) => t.source === sourceKey);
  const canonicalUrl = source.canonicalUrl;
  try {
    const response = await fetch(canonicalUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.1',
      },
      signal: AbortSignal.timeout(45000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentEncoding = response.headers.get('content-encoding');
    const fetchedResponseSha256 = createHash('sha256').update(bytes).digest('hex');
    const decodedBytes = decodeResponseBytes(bytes, contentEncoding);
    const html = decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1');
    const extracted = extractHtml(html);
    const normalized = normalizeEvidenceText(extracted.text);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    for (const track of sourceTracks) {
      const authoredExcerpt = normalizeEvidenceText(track.excerpt);
      const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
      if (!span) throw new Error(`Exact excerpt missing from fetched response: ${track.title}`);
      located.push({ ...track, excerpt: span.excerpt, start: span.start, end: span.end });
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
      window: {
        kind: completeSource ? 'complete-source' : 'character-offsets',
        start,
        end,
        fetchedTextLength: normalized.length,
        completeSource,
      },
    });
    const created = await writeSourceArtifact(artifactDir, artifact);

    results.push({
      canonicalUrl,
      fetchUrl: canonicalUrl,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      created,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: located.map((item) => ({
        albumId: ALBUM_ID,
        trackTitle: item.title,
        factIndex: 0,
        refIndex: 0,
        retainedExtract: item.excerpt,
        section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
      })),
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId}`);
    console.log(`  retainedCharacters=${retainedText.length} fetchedCharacters=${normalized.length} completeSource=${completeSource}`);
    for (const item of located) console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
  } catch (error) {
    results.push({ canonicalUrl, status: 'inaccessible', error: error.message });
    console.error(`FAILED ${canonicalUrl}: ${error.message}`);
  }
}

await writeFile(reportPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId: COLLECTOR_RUN_ID, collectedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`report: ${reportPath}`);
console.log(`collected=${results.filter((item) => item.status === 'collected').length} inaccessible=${results.filter((item) => item.status !== 'collected').length}`);
if (results.some((item) => item.status !== 'collected')) process.exitCode = 2;

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
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '.');
}

function decodeResponseBytes(bytes, contentEncoding) {
  const encoding = (contentEncoding ?? '').split(',')[0].trim().toLowerCase();
  if (!encoding || encoding === 'identity') return bytes;
  const decompress = { gzip: gunzipSync, 'x-gzip': gunzipSync, deflate: inflateSync, br: brotliDecompressSync, zstd: zstdDecompressSync }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try { return decompress(bytes); } catch { return bytes; }
}

function extractHtml(html) {
  const fragment = extractParserOutputFragment(html) ?? html;
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: fragment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

function extractParserOutputFragment(html) {
  const marker = 'class="mw-content-ltr mw-parser-output"';
  let idx = html.indexOf(marker);
  if (idx < 0) idx = html.indexOf('mw-parser-output');
  if (idx < 0) return null;
  const divOpen = html.lastIndexOf('<div', idx);
  if (divOpen < 0) return null;
  let depth = 0;
  let i = divOpen;
  while (i < html.length) {
    if (html.startsWith('<div', i)) { depth += 1; i += 4; }
    else if (html.startsWith('</div>', i)) { depth -= 1; i += 6; if (depth === 0) return html.slice(divOpen, i); }
    else { i += 1; }
  }
  return null;
}
