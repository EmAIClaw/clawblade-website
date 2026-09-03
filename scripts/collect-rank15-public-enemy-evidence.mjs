// Collect the rank-15 Public Enemy source artifacts from two Chuck D primary
// sources: AllHipHop's "Class Of '88" track-by-track commentary (15 tracks) and
// uDiscover Music's Chuck D interview (the "Countdown To Armageddon" intro).
// Mirrors scripts/collect-rank14-exile-evidence.mjs core logic, scoped to two
// canonical URLs, using http-fetch + pandoc HTML extraction (the same trusted
// albumvault-http-collector path used by ranks 9/10/11/13/14).
import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const ALBUM_ID = '015-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-749205b0';
const COLLECTOR_RUN_ID = 'rank15-public-enemy-http-collector-20260903';
const CONTEXT_RADIUS = 500;
const dataDir = path.resolve('src/data/track-encyclopedia');
const artifactDir = path.join(dataDir, 'source-artifacts');
const reportPath = process.argv[2] || 'reports/rank15-public-enemy-source-collection.json';

// Two canonical sources. Each track maps to one source and one verbatim excerpt.
const SOURCES = {
  allhiphop: {
    canonicalUrl: 'https://allhiphop.com/reviews-music/class-of-88-public-enemys-it-takes-a-nation-of-millions-to-hold-us-back/',
  },
  udiscover: {
    canonicalUrl: 'https://www.udiscovermusic.com/stories/chuck-d-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-interview/',
    // The interview is Q&A without per-answer "Chuck D:" prefixes, so the
    // speaker attribution lives in the byline and intro. Retain the complete
    // source so the reviewer can verify Chuck D is the interviewee.
    completeSource: true,
  },
};

// Each track: { n, title, source, excerpt } — excerpt is verbatim from the
// pandoc-extracted article text.
const tracks = [
  {
    n: 1, title: 'Countdown to Armageddon', source: 'udiscover',
    excerpt: 'You hear that on the beginning of “Countdown To Armageddon.” It starts with audio from a London concert. We called it the ‘London Invasion’ when we went over there with the Def Jam Tour.',
  },
  {
    n: 2, title: 'Bring the Noise', source: 'allhiphop',
    excerpt: 'Chuck D.: “Bring The Noise” was originally a song for the Less Than Zero soundtrack for Def Jam [Records] and when it came down to it, it was really our second B-sided street hit.',
  },
  {
    n: 3, title: "Don't Believe the Hype", source: 'allhiphop',
    excerpt: 'Chuck D.: “Don’t Believe The Hype” actually was made before “Bring The Noise” for the Less Than Zero soundtrack. We actually thought it was rather slow so we put it in the can.',
  },
  {
    n: 4, title: "Cold Lampin' with Flavor", source: 'allhiphop',
    excerpt: 'Chuck D.: “Cold Lampin’ With Flavor” was something that Flavor had in his mind all the time and it was an outlet we made that was fast, crazy, and quick enough and Flavor stepped up to the task. It took about a year to write and put everything up in one nutshell.',
  },
  {
    n: 5, title: 'Terminator X to the Edge of Panic', source: 'allhiphop',
    excerpt: '“Terminator X To The Edge Of Panic” Produced By The Bomb Squad Chuck D.: Myself and Terminator was trying to make a record that was indicative of the speed of the instrumentals and also the aspect of the DJ. So Terminator actually contributed parts; we just took “Rebel [Without A Pause]” and ran it backwards.',
  },
  {
    n: 6, title: 'Mind Terrorist', source: 'allhiphop',
    excerpt: 'Chuck D.: “Mind Terrorist” was just an instrumental that we wanted to break up in between songs. It introduced instrumentals, and introduced concerts.',
  },
  {
    n: 7, title: 'Louder Than a Bomb', source: 'allhiphop',
    excerpt: 'Chuck D.: “Louder Than A Bomb” was one of those records we never performed live because there were records that were faster and similar.',
  },
  {
    n: 8, title: 'Caught, Can We Get a Witness?', source: 'allhiphop',
    excerpt: 'Chuck D.: “Caught, Can We Get A Witness” was a record we found a couple of samples that set the rhythm and we wanted to present a court room scene of going court because we were sampling and it all really became true (Laughs).',
  },
  {
    n: 9, title: "Show 'Em Whatcha Got", source: 'allhiphop',
    excerpt: '“Show Em Whatcha Got” Produced By The Bomb Squad Chuck D.: Actually “Show Em Whatcha Got” was the first song on the album. Back then you had A-sides and B-sides as far as cassettes and records were concerned. At the last minute Hank flipped the sides and said “Nah this should be the B-side.”',
  },
  {
    n: 10, title: 'She Watch Channel Zero?!', source: 'allhiphop',
    excerpt: 'Chuck D.: “She Watch Channel Zero?!” was our second record that we actually took some Rock aspects and got down with it. We actually took a Slayer sample (“Angel Of Death”) because Slayer was distributed by Def Jam and I said “Well music is music.”',
  },
  {
    n: 11, title: 'Night of the Living Baseheads', source: 'allhiphop',
    excerpt: '“Night Of The Living Baseheads” Produced By The Bomb Squad Chuck D.: We were attacking drug dealers and the drug trade at that time. We wanted to make drugs appear nasty to young people.',
  },
  {
    n: 12, title: 'Black Steel in the Hour of Chaos', source: 'allhiphop',
    excerpt: 'Chuck D.: “Black Steel” is the other side of that. If you going to be jailed, be jailed for your beliefs for fighting for all the people. I was jailed because I didn’t believe in the war and my thing was I deserve to be free.',
  },
  {
    n: 13, title: 'Security of the First World', source: 'allhiphop',
    excerpt: '“Security Of The First World” Produced By The Bomb Squad Chuck D.: An instrumental that signifies the strength, intelligence of the S1W’s.',
  },
  {
    n: 14, title: 'Rebel Without a Pause', source: 'allhiphop',
    excerpt: 'Chuck D.: “Rebel Without A Pause” is our breakthrough single that was broke by Lady B. in Philadelphia and Chuck Chillout in New York.',
  },
  {
    n: 15, title: 'Prophets of Rage', source: 'allhiphop',
    excerpt: 'Chuck D.: “Prophets Of Rage” I wrote while being in traffic on the Kosciusko going into the city from Queens into Brooklyn.',
  },
  {
    n: 16, title: 'Party for Your Right to Fight', source: 'allhiphop',
    excerpt: '“Party For Your Right To Fight” Produced By The Bomb Squad Chuck D.: A total quirky song; we wanted to make a song that was reverse opposite of “Fight For Your Right To Party” by The Beastie Boys who are our great friends.',
  },
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
    if (source.completeSource) {
      start = 0;
      end = normalized.length;
    }
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
