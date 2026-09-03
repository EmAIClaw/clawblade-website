// Collect the rank-16 London Calling source artifacts from three fetched sources:
//   - Wikipedia "London Calling" (track annotations, Vanilla Tapes mapping, themes)
//   - The Ringer "The Siren Sound of the Clash's 'London Calling,' 40 Years Later"
//     (Elizabeth Nelson, Dec 17 2019) — track-by-track prose
//   - Rolling Stone "The Clash Serve 'Vanilla'" (Austin Scaggs, Aug 3 2004) — demo notes
// Mirrors scripts/collect-rank15-public-enemy-evidence.mjs core logic, scoped to
// three canonical URLs, using http-fetch + pandoc HTML extraction (the same
// trusted albumvault-http-collector path used by ranks 9/10/11/13/14/15).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '016-the-clash-london-calling-7d75cf05';
const COLLECTOR_RUN_ID = 'rank16-london-calling-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank16-london-calling-source-collection.json';

// Three canonical sources. Each documented track maps to one source and one
// verbatim excerpt (a contiguous substring of the pandoc-extracted text).
const SOURCES = {
  wikipedia: {
    canonicalUrl: 'https://en.wikipedia.org/wiki/London_Calling',
  },
  ringer: {
    canonicalUrl: 'https://www.theringer.com/2019/12/17/music/the-clash-london-calling-40th-anniversary',
  },
  rollingstone: {
    canonicalUrl: 'https://www.rollingstone.com/music/music-news/the-clash-serve-vanilla-248698/',
  },
};

// Each documented track: { n, disc, title, source, excerpt }.
// Excerpts are verbatim contiguous substrings of the pandoc-extracted text.
const tracks = [
  // ── Disc 1 (19 tracks) ────────────────────────────────────────────────
  { n: 1, disc: 1, title: 'London Calling', source: 'wikipedia',
    excerpt: '"London Calling", the album\'s title track and opener, was partially influenced by the March 1979 accident at a nuclear reactor at Three Mile Island in Pennsylvania.' },
  { n: 2, disc: 1, title: 'Brand New Cadillac', source: 'wikipedia',
    excerpt: 'The first track recorded for London Calling was "Brand New Cadillac", which the Clash had originally used as a warm-up song before recording.' },
  { n: 3, disc: 1, title: 'Jimmy Jazz', source: 'wikipedia',
    excerpt: 'an underworld criminal named Jimmy Jazz' },
  { n: 4, disc: 1, title: 'Hateful', source: 'ringer',
    excerpt: 'the Bo Diddley–meets-Bowie drug panic “Hateful.”' },
  { n: 5, disc: 1, title: "Rudie Can't Fail", source: 'wikipedia',
    excerpt: '"Rudie Can\'t Fail" chronicles the life of a fun-loving young man who is criticised for his inability to act like a responsible adult.' },
  { n: 6, disc: 1, title: 'Spanish Bombs', source: 'wikipedia',
    excerpt: 'the lingering effects of the Spanish Civil War ("Spanish Bombs")' },
  { n: 7, disc: 1, title: 'The Right Profile', source: 'ringer',
    excerpt: '“The Right Profile,” Strummer’s wry and sad eulogy to Clift, is a rollicking anthem for a doomed figure who not coincidentally resembled Guy Stevens.' },
  { n: 8, disc: 1, title: 'Lost In the Supermarket', source: 'wikipedia',
    excerpt: 'Strummer wrote "Lost in the Supermarket" after imagining Jones\' childhood growing up in a basement with his mother and grandmother.' },
  { n: 9, disc: 1, title: 'Clampdown', source: 'wikipedia',
    excerpt: '"Clampdown" began as an instrumental track called "Working and Waiting".' },
  { n: 10, disc: 1, title: 'The Guns of Brixton', source: 'wikipedia',
    excerpt: '"The Guns of Brixton" was the first of bassist Paul Simonon\'s compositions the band would record for an album, and the first to have him sing lead.' },
  { n: 11, disc: 1, title: "Wrong 'Em Boyo", source: 'wikipedia',
    excerpt: '"Wrong \'Em Boyo"   Clive Alphonso; originally performed by the Rulers; including "Stagger Lee"' },
  { n: 12, disc: 1, title: 'Death or Glory', source: 'wikipedia',
    excerpt: 'on "Death or Glory", Strummer examines his life in retrospect and acknowledges the complications and responsibilities of adulthood.' },
  { n: 13, disc: 1, title: 'Koka Kola', source: 'ringer',
    excerpt: 'The blink-and-you’ll-miss-it gem “Koka Kola” is an act of comic revenge against the encroaching advertising world, in the style of early Who, and its future colonization of both our whims and habits.' },
  { n: 14, disc: 1, title: 'The Card Cheat', source: 'wikipedia',
    excerpt: 'While working on "The Card Cheat", the band recorded each part twice to create a "sound as big as possible".' },
  { n: 15, disc: 1, title: "Lover's Rock", source: 'wikipedia',
    excerpt: '"Lover\'s Rock" advocates safe sex and planning.' },
  { n: 16, disc: 1, title: 'Four Horsemen', source: 'ringer',
    excerpt: '“Four Horsemen” is a straightforward reaffirmation of Joe, Topper Headon, Paul Simonon, and Mick: the men making the music happen.' },
  { n: 17, disc: 1, title: "I'm Not Down", source: 'ringer',
    excerpt: '“I’m Not Down” is the brilliant Jones-sung final word on all the misery and magic and possibility of the new great depression: “I’ve been beaten up / I’ve been thrown around / But I’m not down.”' },
  { n: 18, disc: 1, title: 'Revolution Rock', source: 'ringer',
    excerpt: 'a transporting cover of the Danny Ray and Jackie Edwards reggae anthem “Revolution Rock,”' },
  { n: 19, disc: 1, title: 'Train In Vain', source: 'wikipedia',
    excerpt: 'The final track, "Train in Vain", was originally excluded from the back cover\'s track listing.' },

  // ── Disc 2 — The Vanilla Tapes (13 documented) ────────────────────────
  { n: 3, disc: 2, title: "Paul's Tune (Vanilla Studios Demo Version)", source: 'wikipedia',
    excerpt: 'the instrumental track titled "Paul\'s Tune" would eventually be recorded for London Calling under the title "The Guns of Brixton"' },
  { n: 6, disc: 2, title: 'Koka Kola, Advertising & Cocaine (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: '"Koka Kola, Advertising & Cocaine" (Early version of "Koka Kola")' },
  { n: 7, disc: 2, title: 'Death or Glory (Vanilla Studios Demo Version)', source: 'rollingstone',
    excerpt: 'early versions of “London Calling” (with alternate lyrics) and “Death or Glory.”' },
  { n: 9, disc: 2, title: 'Lonesome Me (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: 'the country-inflected "Lonesome Me."' },
  { n: 10, disc: 2, title: 'The Police Walked in 4 Jazz (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: '"The Police Walked in 4 Jazz" (Instrumental, early version of "Jimmy Jazz")' },
  { n: 12, disc: 2, title: 'Up-Toon (Instrumental) [Vanilla Studios Demo Version]', source: 'wikipedia',
    excerpt: 'the instrumental tracked titled "Up-Toon" would ultimately be released as "The Right Profile"' },
  { n: 13, disc: 2, title: 'Walking the Slidewalk (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: '"Walking the Slidewalk" (Instrumental, does not appear on "London Calling")' },
  { n: 14, disc: 2, title: 'Where You Gonna Go (Soweto) [Vanilla Studios Demo Version]', source: 'wikipedia',
    excerpt: 'Sonny Okosun\'s "Where You Gonna Go (Soweto)"' },
  { n: 15, disc: 2, title: 'The Man In Me (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: 'a reggae version of Bob Dylan\'s "The Man in Me"' },
  { n: 16, disc: 2, title: 'Remote Control (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: '"Remote Control" (Does not appear on "London Calling")' },
  { n: 17, disc: 2, title: 'Working and Waiting (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: '"Clampdown" began as an instrumental track called "Working and Waiting".' },
  { n: 18, disc: 2, title: 'Heart and Mind (Vanilla Studios Demo Version)', source: 'wikipedia',
    excerpt: 'never-officially-released Clash tunes like "Heart and Mind" (described by rock journalist Pat Gilbert as "a rocker")' },
  { n: 20, disc: 2, title: 'London Calling (Vanilla Studios Demo Version)', source: 'rollingstone',
    excerpt: 'early versions of “London Calling” (with alternate lyrics)' },
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
    const extracted = extractHtml(decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1'));
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
        factIndex: 0,
        refIndex: 0,
        retainedExtract: item.excerpt,
        section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
      })),
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId}`);
    console.log(`  retainedCharacters=${retainedText.length} fetchedCharacters=${normalized.length} completeSource=${completeSource}`);
    for (const item of located) {
      console.log(`  ${item.title}: [${item.start - start}, ${item.end - start})`);
    }
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
  const decompress = {
    gzip: gunzipSync,
    'x-gzip': gunzipSync,
    deflate: inflateSync,
    br: brotliDecompressSync,
    zstd: zstdDecompressSync,
  }[encoding];
  if (!decompress) throw new Error(`Unsupported content encoding: ${contentEncoding}`);
  try {
    return decompress(bytes);
  } catch {
    return bytes;
  }
}

function extractHtml(html) {
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}
