// Collect rank-23 The Velvet Underground & Nico source artifacts from fetched
// source bodies. All retained excerpts are contiguous substrings of the
// normalized pandoc-extracted responses and are stored with exact offsets.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '023-the-velvet-underground-the-velvet-underground-and-nico-0913adef';
const COLLECTOR_RUN_ID = 'rank23-velvet-underground-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank23-velvet-underground-source-collection.json';

const SOURCES = {
  sunday: { canonicalUrl: 'https://en.wikipedia.org/wiki/Sunday_Morning_(The_Velvet_Underground_song)' },
  waiting: { canonicalUrl: 'https://en.wikipedia.org/wiki/I%27m_Waiting_for_the_Man' },
  femme: { canonicalUrl: 'https://en.wikipedia.org/wiki/Femme_Fatale_(The_Velvet_Underground_song)' },
  venus: { canonicalUrl: 'https://en.wikipedia.org/wiki/Venus_in_Furs_(song)' },
  run: { canonicalUrl: 'https://en.wikipedia.org/wiki/Run_Run_Run_(The_Velvet_Underground_song)' },
  parties: { canonicalUrl: 'https://en.wikipedia.org/wiki/All_Tomorrow%27s_Parties' },
  heroin: { canonicalUrl: 'https://en.wikipedia.org/wiki/Heroin_(The_Velvet_Underground_song)' },
  there: { canonicalUrl: 'https://en.wikipedia.org/wiki/There_She_Goes_Again' },
  mirror: { canonicalUrl: 'https://en.wikipedia.org/wiki/I%27ll_Be_Your_Mirror' },
  blackangel: { canonicalUrl: 'https://en.wikipedia.org/wiki/The_Black_Angel%27s_Death_Song' },
  european: { canonicalUrl: 'https://en.wikipedia.org/wiki/European_Son' },
};

const tracks = [
  { n: 1, disc: 1, title: 'Sunday Morning', source: 'sunday', excerpt: 'In late 1966, "Sunday Morning" was the final song to be recorded for The Velvet Underground & Nico. It was requested by Tom Wilson, who thought the album needed another song with lead vocals by Nico with the potential to be a successful single.' },
  { n: 2, disc: 1, title: "I'm Waiting for the Man", source: 'waiting', excerpt: 'The lyrics describe a man\'s efforts to obtain heroin.' },
  { n: 3, disc: 1, title: 'Femme Fatale', source: 'femme', excerpt: 'At the request of Andy Warhol, band frontman Lou Reed wrote the song about Warhol superstar Edie Sedgwick.' },
  { n: 4, disc: 1, title: 'Venus In Furs', source: 'venus', excerpt: 'Inspired by the novel of the same name by Leopold von Sacher-Masoch, the song includes sexual themes of sadomasochism and bondage.' },
  { n: 5, disc: 1, title: 'Run Run Run', source: 'run', excerpt: 'The song was written on the back of an envelope by Lou Reed while he and the band were on their way to a gig at the Café Bizarre.' },
  { n: 6, disc: 1, title: "All Tomorrow's Parties", source: 'parties', excerpt: 'Inspiration for the song came from Reed\'s observation of Andy Warhol\'s clique—according to Reed, the song is "a very apt description of certain people at the Factory at the time.' },
  { n: 7, disc: 1, title: 'Heroin', source: 'heroin', excerpt: 'Written by Lou Reed in 1964, the song, which overtly depicts heroin usage and its effects, is one of the band\'s most celebrated compositions.' },
  { n: 8, disc: 1, title: 'There She Goes Again', source: 'there', excerpt: 'The syncopated guitar riff is taken from the 1962 Marvin Gaye song "Hitch Hike".' },
  { n: 9, disc: 1, title: "I'll Be Your Mirror", source: 'mirror', excerpt: 'Lou Reed wrote the song for Nico, who provides lead vocals.' },
  { n: 10, disc: 1, title: "The Black Angel's Death Song", source: 'blackangel', excerpt: 'The music is dominated by the piercing sound of John Cale\'s electric viola, creating dissonance throughout the song.' },
  { n: 11, disc: 1, title: 'European Son', source: 'european', excerpt: '"European Son" is dedicated to poet Delmore Schwartz, who had been Lou Reed\'s advisor at Syracuse University.' },
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
    const normalized = normalizeEvidenceText(extractHtml(html).text);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    for (const track of sourceTracks) {
      const authoredExcerpt = normalizeEvidenceText(track.excerpt);
      const span = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
      if (!span) {
        const titleIdx = normalized.toLowerCase().indexOf(track.title.toLowerCase().slice(0, 16));
        const diagnostic = titleIdx >= 0 ? normalized.slice(Math.max(0, titleIdx - 250), Math.min(normalized.length, titleIdx + 700)) : normalized.slice(0, 900);
        throw new Error(`Exact excerpt missing from fetched response: ${track.title}; nearby=${JSON.stringify(diagnostic)}`);
      }
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
      window: { kind: completeSource ? 'complete-source' : 'character-offsets', start, end, fetchedTextLength: normalized.length, completeSource },
    });
    await writeSourceArtifact(artifactDir, artifact);

    results.push({
      canonicalUrl,
      fetchUrl: canonicalUrl,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      created: true,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: located.map((item) => ({
        albumId: ALBUM_ID,
        trackTitle: item.title,
        discNumber: item.disc,
        trackNumber: item.n,
        factIndex: 0,
        refIndex: 0,
        retainedExtract: item.excerpt,
        section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
      })),
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId}`);
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
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―−]/g, '-').replace(/…/g, '.').replace(/\s+/g, ' ');
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
  return { text: temp.stdout };
}
function extractParserOutputFragment(html) {
  const marker = 'mw-parser-output';
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const divOpen = html.lastIndexOf('<div', idx);
  if (divOpen < 0) return null;
  let depth = 0;
  for (let i = divOpen; i < html.length;) {
    if (html.startsWith('<div', i)) { depth += 1; i += 4; }
    else if (html.startsWith('</div>', i)) { depth -= 1; i += 6; if (depth === 0) return html.slice(divOpen, i); }
    else i += 1;
  }
  return null;
}
