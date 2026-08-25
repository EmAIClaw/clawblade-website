#!/usr/bin/env node
// Fetch current authoring sources and retain bounded, mechanically derived context.
// This collector never accepts authored text as source content; excerpts are used only
// to locate exact spans inside independently fetched HTTP/PDF responses.
import { createHash, randomUUID } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { brotliDecompressSync, gunzipSync, inflateSync, zstdDecompressSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';
import { normalizeEvidenceText } from '../src/track-encyclopedia/hash.mjs';
import { createSourceArtifact, readSourceArtifacts, writeSourceArtifact } from '../src/track-encyclopedia/source-artifacts.mjs';

const root = process.cwd();
const dataDir = path.join(root, 'src/data/track-encyclopedia');
const authoringDir = path.join(dataDir, 'authoring');
const artifactDir = path.join(dataDir, 'source-artifacts');
const resultPath = process.argv[2] || path.join(tmpdir(), 'albumvault-source-collection.json');
const retryReportPath = process.argv[3] || null;
const overridePath = process.argv[4] || null;
const fetchOverrides = overridePath ? JSON.parse(await readFile(overridePath, 'utf8')).overrides ?? {} : {};
const retryUrls = retryReportPath
  ? new Set(JSON.parse(await readFile(retryReportPath, 'utf8')).results.filter((item) => item.status !== 'collected').map((item) => item.canonicalUrl))
  : null;
const collectorRunId = `item1-${randomUUID()}`;
const contextRadius = 500;
const existingArtifacts = Object.values(await readSourceArtifacts(artifactDir));

const claimsByUrl = new Map();
for (const name of (await readdir(authoringDir)).filter((value) => value.endsWith('.json')).sort()) {
  const doc = JSON.parse(await readFile(path.join(authoringDir, name), 'utf8'));
  for (const [albumId, entry] of Object.entries(doc.entries ?? {})) {
    for (const track of entry.trackEntries ?? []) {
      for (let factIndex = 0; factIndex < (track.verifiedFacts ?? []).length; factIndex += 1) {
        const fact = track.verifiedFacts[factIndex];
        for (let refIndex = 0; refIndex < (fact.sourceRefs ?? []).length; refIndex += 1) {
          const ref = fact.sourceRefs[refIndex];
          const canonicalUrl = canonicalizeSourceUrl(ref.url);
          if (!claimsByUrl.has(canonicalUrl)) claimsByUrl.set(canonicalUrl, []);
          claimsByUrl.get(canonicalUrl).push({ albumId, trackTitle: track.trackTitle, factIndex, refIndex, extract: ref.extract });
        }
      }
    }
  }
}

const results = [];
for (const [canonicalUrl, claims] of [...claimsByUrl.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  if (retryUrls && !retryUrls.has(canonicalUrl)) continue;
  try {
    const override = fetchOverrides[canonicalUrl] ?? null;
    const fetchUrl = override?.fetchUrl ?? canonicalUrl;
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
    const isPdf = /application\/pdf/i.test(contentType) || canonicalUrl.toLowerCase().endsWith('.pdf');
    const extracted = isPdf ? await extractPdf(decodedBytes) : extractHtml(decodedBytes.toString(isUtf8(decodedBytes) ? 'utf8' : 'latin1'));
    const normalized = normalizeEvidenceText(extracted.text);
    if (!normalized) throw new Error('Fetched response produced no extractable text.');

    const located = [];
    const missing = [];
    for (const claim of claims) {
      const authoredExcerpt = normalizeEvidenceText(claim.extract);
      const locatedSpan = locateExactOrTypographyEquivalent(normalized, authoredExcerpt);
      if (!locatedSpan) missing.push({ albumId: claim.albumId, trackTitle: claim.trackTitle, excerpt: claim.extract });
      else located.push({ ...claim, excerpt: locatedSpan.excerpt, start: locatedSpan.start, end: locatedSpan.end });
    }
    if (missing.length > 0) throw new Error(`Exact excerpts missing from fetched response: ${missing.map((item) => `${item.albumId}/${item.trackTitle}`).join(', ')}`);

    let start = Math.max(0, Math.min(...located.map((item) => item.start)) - contextRadius);
    let end = Math.min(normalized.length, Math.max(...located.map((item) => item.end)) + contextRadius);
    while (start < end && normalized[start] === ' ') start += 1;
    while (end > start && normalized[end - 1] === ' ') end -= 1;
    const retainedText = normalized.slice(start, end);
    const completeSource = start === 0 && end === normalized.length;
    let artifact = createSourceArtifact({
      canonicalUrl,
      finalUrl: canonicalizeSourceUrl(response.url),
      retrievedAt: new Date().toISOString(),
      httpStatus: response.status,
      contentType,
      contentEncoding,
      collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: collectorRunId },
      collectionMethod: override?.collectionMethod ?? (isPdf ? 'pdf-fetch' : 'http-fetch'),
      fetchedResponseSha256,
      normalizationVersion: 'nfkc-whitespace-v1',
      retainedText,
      window: {
        kind: isPdf ? 'pdf-pages' : (completeSource ? 'complete-source' : 'character-offsets'),
        start,
        end,
        fetchedTextLength: normalized.length,
        completeSource,
        ...(isPdf ? { pages: extracted.pages } : {}),
      },
    });
    const reusable = existingArtifacts.find((item) =>
      item.canonicalUrl === artifact.canonicalUrl &&
      item.finalUrl === artifact.finalUrl &&
      item.fetchedResponseSha256 === artifact.fetchedResponseSha256 &&
      item.normalizationVersion === artifact.normalizationVersion &&
      item.retainedText === artifact.retainedText &&
      JSON.stringify(item.window) === JSON.stringify(artifact.window)
    );
    if (reusable) artifact = reusable;
    const created = reusable ? false : await writeSourceArtifact(artifactDir, artifact);
    if (!reusable) existingArtifacts.push(artifact);
    results.push({
      canonicalUrl,
      fetchUrl,
      finalUrl: artifact.finalUrl,
      status: 'collected',
      artifactId: artifact.artifactId,
      created,
      fetchedResponseSha256,
      contentType,
      retainedCharacters: retainedText.length,
      fetchedCharacters: normalized.length,
      claims: located.map((item) => ({
        albumId: item.albumId,
        trackTitle: item.trackTitle,
        factIndex: item.factIndex,
        refIndex: item.refIndex,
        retainedExtract: item.excerpt,
        section: { kind: 'character-offsets', start: item.start - start, end: item.end - start },
      })),
    });
    console.log(`collected ${canonicalUrl} -> ${artifact.artifactId} (${claims.length} claim(s))`);
  } catch (error) {
    results.push({ canonicalUrl, status: 'inaccessible', error: error.message, claims: claims.map(({ albumId, trackTitle, factIndex, refIndex }) => ({ albumId, trackTitle, factIndex, refIndex })) });
    console.error(`FAILED ${canonicalUrl}: ${error.message}`);
  }
}

await writeFile(resultPath, `${JSON.stringify({ schemaVersion: 1, collectorRunId, collectedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`collection report: ${resultPath}`);
console.log(`collected=${results.filter((item) => item.status === 'collected').length} inaccessible=${results.filter((item) => item.status !== 'collected').length}`);
if (results.some((item) => item.status !== 'collected')) process.exitCode = 2;

function locateExactOrTypographyEquivalent(sourceText, authoredExcerpt) {
  const exactStart = sourceText.indexOf(authoredExcerpt);
  if (exactStart >= 0) return { start: exactStart, end: exactStart + authoredExcerpt.length, excerpt: sourceText.slice(exactStart, exactStart + authoredExcerpt.length) };
  const sourceComparable = comparableTypography(sourceText);
  const excerptComparable = comparableTypography(authoredExcerpt);
  const start = sourceComparable.indexOf(excerptComparable);
  if (start < 0) return null;
  return { start, end: start + authoredExcerpt.length, excerpt: sourceText.slice(start, start + authoredExcerpt.length) };
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
    // Node fetch normally returns a decoded body while retaining the response's
    // content-encoding header. In that case the fetched bytes are already ready
    // for text/PDF extraction and must not be decompressed a second time.
    return bytes;
  }
}

function extractHtml(html) {
  const temp = spawnSync('pandoc', ['--from=html', '--to=plain', '--wrap=none'], { input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (temp.status !== 0) throw new Error(`pandoc HTML extraction failed: ${temp.stderr || `exit ${temp.status}`}`);
  return { text: temp.stdout, pages: [] };
}

async function extractPdf(bytes) {
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-pdf-'));
  const pdfPath = path.join(dir, 'source.pdf');
  const swiftPath = path.join(dir, 'extract.swift');
  try {
    await writeFile(pdfPath, bytes);
    await writeFile(swiftPath, `import Foundation\nimport PDFKit\nlet url = URL(fileURLWithPath: CommandLine.arguments[1])\nguard let pdf = PDFDocument(url: url) else { exit(2) }\nfor index in 0..<pdf.pageCount {\n  print("\\n[[PAGE \\(index + 1)]]\\n")\n  print(pdf.page(at: index)?.string ?? "")\n}\n`);
    const result = spawnSync('swift', [swiftPath, pdfPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`PDFKit extraction failed: ${result.stderr || `exit ${result.status}`}`);
    const pages = [...result.stdout.matchAll(/\[\[PAGE (\d+)\]\]/g)].map((match) => Number(match[1]));
    return { text: result.stdout, pages };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
