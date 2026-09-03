// Collect the rank-26 Patti Smith — Horses source artifacts from fetched sources.
// The New York Times' 50th-anniversary oral history contains track-specific
// first-person testimony from Patti Smith and her band for all eight catalog
// tracks. Excerpts are verbatim contiguous substrings of the pandoc-extracted
// page body and are retained with character offsets.
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '026-patti-smith-horses-2807d0f1';
const COLLECTOR_RUN_ID = 'rank26-horses-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank26-horses-source-collection.json';

const SOURCES = {
  album: {
    canonicalUrl: 'https://www.nytimes.com/interactive/2025/11/07/arts/music/patti-smith-horses-anniversary.html',
    fetchUrl: 'https://web.archive.org/web/20251110153406/https://www.nytimes.com/interactive/2025/11/07/arts/music/patti-smith-horses-anniversary.html',
    collectionMethod: 'archive-http-fetch',
    snapshotTimestamp: '20251110153406',
  },
};

const tracks = [
  { n: 1, disc: 1, title: 'Gloria', source: 'album',
    excerpt: 'Patti Smith We had “Land.” Then one day we were in the practice room, making a set list, and I said, “I’d love it if we had another song that had simple chords.” I wanted something I could riff off of. And Lenny said, “Well, there’s ‘Gloria.’” And I was like, “Is that a good one?” And he said, “It’s the best.” It freed me up in a certain way to do a song like “Gloria,” and not be hung up with the fact that it was written from a male point of view.' },
  { n: 2, disc: 1, title: 'Redondo Beach', source: 'album',
    excerpt: 'Side 1 Redondo Beach [] [] Patti Smith I wrote it at the Chelsea Hotel. I had a rare argument with my sister and she disappeared, I think she went to Coney Island. But I got this frightened feeling that something had happened to her. I wrote it as a poem and I used to read it in poetry readings. And then with Richard [Sohl] and Lenny, it evolved as a little reggae song.' },
  { n: 3, disc: 1, title: 'Birdland', source: 'album',
    excerpt: 'Patti Smith I was completely green. I had never worked with a producer. If John couldn’t win, he would step back and challenge me. “OK, you want to improvise ‘Birdland’? You want to wing it? Then really do it.”' },
  { n: 4, disc: 1, title: 'Free Money', source: 'album',
    excerpt: 'Side 1 Free Money [] [] Patti Smith So many people think it’s a love song. I wrote it as [] “Oh baby,” as if perhaps it is, but it was really for my mother. My family struggled financially, sometimes to the point of not having enough food on the table.' },
  { n: 5, disc: 1, title: 'Kimberly', source: 'album',
    excerpt: 'Lenny Kaye Patti’s remembering the birth of her sister Kimberly. I believe it started like a Booker T. & the M.G.’s kind of song.' },
  { n: 6, disc: 1, title: 'Break It Up', source: 'album',
    excerpt: 'Side 2 Break It Up [] [] Patti Smith The song is a homage to poetry, to Jim [Morrison], to dreaming, but it also is a little document of my friendship with Tom [Verlaine] and our process together.' },
  { n: 7, disc: 1, title: 'Land', source: 'album',
    excerpt: 'Patti Smith The word “land” was from “Land of 1000 Dances” [the 1962 Chris Kenner song]. I loved “A Thousand and One Nights” and the idea of Scheherazade telling story after story.' },
  { n: 8, disc: 1, title: 'Elegie', source: 'album',
    excerpt: 'Side 2 Elegie [] [] Jay Dee Daugherty The music was written by Allen Lanier, who was a skilled musician, and who actually knew things like, you know, scales and notes. [] Chords. [] Patti Smith It really was my dream to have Chet Baker play at the end, sort of for Jimi. But we couldn’t afford him. It was $5,000, but we didn’t have it. I think our whole budget was $20,000.' },
];

const results = [];
for (const [sourceKey, source] of Object.entries(SOURCES)) {
  const sourceTracks = tracks.filter((t) => t.source === sourceKey);
  const canonicalUrl = source.canonicalUrl;
  const fetchUrl = source.fetchUrl ?? canonicalUrl;
  try {
    const response = await fetch(fetchUrl, {
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
      collectionMethod: source.collectionMethod ?? 'http-fetch',
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
      fetchUrl,
      finalUrl: artifact.finalUrl,
      snapshotTimestamp: source.snapshotTimestamp ?? null,
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
    if (html.startsWith('<div', i)) {
      depth += 1;
      i += 4;
    } else if (html.startsWith('</div>', i)) {
      depth -= 1;
      i += 6;
      if (depth === 0) return html.slice(divOpen, i);
    } else {
      i += 1;
    }
  }
  return null;
}
