import { createHash } from 'node:crypto';
import { link, mkdir, open, readFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { canonicalStringify, normalizeEvidenceText } from './hash.mjs';
import { canonicalizeSourceUrl } from './canonical-url.mjs';

const ARTIFACT_ID = /^[a-f0-9]{64}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ALLOWED_METHODS = new Set(['http-fetch', 'pdf-fetch', 'archive-http-fetch']);
const MIN_CONTEXT_CHARS = 24;
const SOURCE_ARTIFACT_FIELDS = new Set(['schemaVersion', 'canonicalUrl', 'finalUrl', 'retrievedAt', 'httpStatus', 'contentType', 'contentEncoding', 'collector', 'collectionMethod', 'fetchedResponseSha256', 'normalizationVersion', 'retainedText', 'window', 'artifactId', 'artifactSha256']);
const COLLECTOR_FIELDS = new Set(['identity', 'version', 'runId']);
const WINDOW_FIELDS = new Set(['kind', 'start', 'end', 'fetchedTextLength', 'completeSource', 'pages']);

export function computeSourceArtifactHash(artifact) {
  return createHash('sha256').update(canonicalStringify(sourceArtifactHashDomain(artifact))).digest('hex');
}

export function createSourceArtifact(input) {
  const artifact = {
    schemaVersion: 1,
    canonicalUrl: canonicalizeSourceUrl(input.canonicalUrl),
    finalUrl: canonicalizeSourceUrl(input.finalUrl),
    retrievedAt: input.retrievedAt,
    httpStatus: input.httpStatus,
    contentType: input.contentType,
    collector: input.collector,
    collectionMethod: input.collectionMethod,
    fetchedResponseSha256: input.fetchedResponseSha256,
    normalizationVersion: input.normalizationVersion,
    retainedText: normalizeEvidenceText(input.retainedText),
    window: input.window,
  };
  if (input.contentEncoding != null) artifact.contentEncoding = input.contentEncoding;
  artifact.artifactId = computeSourceArtifactHash(artifact);
  artifact.artifactSha256 = artifact.artifactId;
  validateSourceArtifact(artifact);
  return artifact;
}

export function validateSourceArtifact(artifact, { excerpt = null } = {}) {
  if (!artifact || typeof artifact !== 'object') throw new Error('Source artifact is required.');
  assertKnownFields(artifact, SOURCE_ARTIFACT_FIELDS, 'Source artifact');
  if (artifact.schemaVersion !== 1) throw new Error('Source artifact schemaVersion must be 1.');
  if (!ARTIFACT_ID.test(artifact.artifactId ?? '')) throw new Error('Source artifact has an unsafe or invalid content-addressed artifactId.');
  if (!SHA256.test(artifact.artifactSha256 ?? '')) throw new Error('Source artifact requires artifactSha256.');
  if (artifact.artifactId !== artifact.artifactSha256 || computeSourceArtifactHash(artifact) !== artifact.artifactId) {
    throw new Error(`Source artifact hash mismatch for ${artifact.artifactId}.`);
  }
  if (!ALLOWED_METHODS.has(artifact.collectionMethod)) {
    throw new Error('Source artifact must come from an actual HTTP/PDF fetch; authored or self-derived excerpts are forbidden.');
  }
  for (const field of ['canonicalUrl', 'finalUrl']) {
    let parsed;
    try { parsed = new URL(artifact[field]); } catch { parsed = null; }
    if (!artifact[field] || parsed?.protocol !== 'https:' || canonicalizeSourceUrl(artifact[field]) !== artifact[field]) {
      throw new Error(`Source artifact ${field} must be a canonical HTTPS URL.`);
    }
  }
  if (typeof artifact.retrievedAt !== 'string' || Number.isNaN(Date.parse(artifact.retrievedAt))) throw new Error('Source artifact requires a valid retrieval timestamp.');
  if (!Number.isInteger(artifact.httpStatus) || artifact.httpStatus < 200 || artifact.httpStatus >= 400) throw new Error('Source artifact requires a successful HTTP status.');
  if (typeof artifact.contentType !== 'string' || artifact.contentType.trim() === '') throw new Error('Source artifact requires contentType.');
  if (Object.hasOwn(artifact, 'contentEncoding') && (typeof artifact.contentEncoding !== 'string' || !artifact.contentEncoding.trim())) throw new Error('Source artifact contentEncoding must be omitted or a non-empty string.');
  if (!artifact.collector || typeof artifact.collector.identity !== 'string' || !artifact.collector.identity.trim() || typeof artifact.collector.version !== 'string' || !artifact.collector.version.trim() || typeof artifact.collector.runId !== 'string' || !artifact.collector.runId.trim()) {
    throw new Error('Source artifact requires collector identity, version, and runId.');
  }
  assertKnownFields(artifact.collector, COLLECTOR_FIELDS, 'Source artifact collector');
  if (artifact.collector.identity !== 'albumvault-http-collector' || artifact.collector.version !== '1.0.0') throw new Error('Source artifact collector identity/version is not trusted by this lifecycle.');
  if (!SHA256.test(artifact.fetchedResponseSha256 ?? '')) throw new Error('Source artifact requires fetched response SHA-256.');
  if (artifact.normalizationVersion !== 'nfkc-whitespace-v1') throw new Error('Unsupported source artifact normalization version.');
  if (!artifact.retainedText || artifact.retainedText !== normalizeEvidenceText(artifact.retainedText)) throw new Error('Source artifact retainedText must be non-empty normalized fetched content.');
  validateWindow(artifact.window, artifact.retainedText.length);
  if (excerpt != null) validateContextForExcerpt(artifact, excerpt);
  return true;
}

export function validateSourceReference(ref, artifact, { allowLegacyNonCanonicalSourceUrls = false } = {}) {
  validateSourceArtifact(artifact);
  if (!ref || typeof ref !== 'object') throw new Error('Source reference is required.');
  if (ref.artifactId !== artifact.artifactId) throw new Error('Source reference artifactId does not match source artifact.');
  if (!allowLegacyNonCanonicalSourceUrls && canonicalizeSourceUrl(ref.url) !== ref.url) throw new Error('Source reference URL must be canonical.');
  if (canonicalizeSourceUrl(ref.url) !== artifact.canonicalUrl) throw new Error('Source reference canonical URL does not match source artifact canonical URL.');
  if (ref.extractType !== 'verbatim' || !ref.extract) throw new Error('Source reference requires a verbatim exact extract.');
  const normalizedExtract = normalizeEvidenceText(ref.extract);
  const section = ref.section;
  if (!section || section.kind !== 'character-offsets' || !Number.isInteger(section.start) || !Number.isInteger(section.end)) throw new Error('Source reference requires declared character offsets.');
  if (section.start < 0 || section.end <= section.start || section.end > artifact.retainedText.length) throw new Error('Source reference section offsets are outside retained source context.');
  if (artifact.retainedText.slice(section.start, section.end) !== normalizedExtract) throw new Error('Source reference exact excerpt does not match declared retained-text offsets.');
  validateContextForOffsets(artifact, section.start, section.end);
  return true;
}

export function sourceArtifactPath(directory, artifactId) {
  assertArtifactId(artifactId);
  const root = path.resolve(directory);
  const filePath = path.resolve(root, `${artifactId}.json`);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('Unsafe source artifact path rejected.');
  return filePath;
}

export async function writeSourceArtifact(directory, artifact) {
  validateSourceArtifact(artifact);
  return writeImmutable(sourceArtifactPath(directory, artifact.artifactId), `${canonicalStringify(artifact)}\n`, `source artifact ${artifact.artifactId}`);
}

export async function readSourceArtifacts(directory) {
  const artifacts = {};
  let names = [];
  try { names = await readdir(directory); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  for (const name of names.filter((value) => value.endsWith('.json')).sort()) {
    const artifactId = name.slice(0, -5);
    assertArtifactId(artifactId);
    const text = await readFile(sourceArtifactPath(directory, artifactId), 'utf8');
    const artifact = JSON.parse(text);
    if (text !== `${canonicalStringify(artifact)}\n`) throw new Error(`Source artifact ${name} bytes are not canonical immutable JSON.`);
    validateSourceArtifact(artifact);
    if (artifact.artifactId !== artifactId) throw new Error(`Source artifact filename/key mismatch for ${name}.`);
    artifacts[artifactId] = artifact;
  }
  return artifacts;
}

function sourceArtifactHashDomain(artifact) {
  const domain = {
    schemaVersion: artifact.schemaVersion ?? 1,
    canonicalUrl: artifact.canonicalUrl,
    finalUrl: artifact.finalUrl,
    retrievedAt: artifact.retrievedAt,
    httpStatus: artifact.httpStatus,
    contentType: artifact.contentType,
    collector: artifact.collector,
    collectionMethod: artifact.collectionMethod,
    fetchedResponseSha256: artifact.fetchedResponseSha256,
    normalizationVersion: artifact.normalizationVersion,
    retainedText: normalizeEvidenceText(artifact.retainedText),
    window: artifact.window,
  };
  if (artifact.contentEncoding) domain.contentEncoding = artifact.contentEncoding;
  return domain;
}

function validateWindow(window, retainedLength) {
  if (!window || typeof window !== 'object') throw new Error('Source artifact requires retained context window metadata.');
  assertKnownFields(window, WINDOW_FIELDS, 'Source artifact window');
  if (!['character-offsets', 'pdf-pages', 'complete-source'].includes(window.kind)) throw new Error('Source artifact has unsupported context window kind.');
  if (!Number.isInteger(window.start) || !Number.isInteger(window.end) || !Number.isInteger(window.fetchedTextLength)) throw new Error('Source artifact window requires integer offsets and fetchedTextLength.');
  if (window.start < 0 || window.end < window.start || window.fetchedTextLength < window.end) throw new Error('Source artifact window offsets are invalid.');
  if (window.end - window.start !== retainedLength) throw new Error('Source artifact retained context length does not match window offsets.');
  if (window.completeSource === true && (window.start !== 0 || window.end !== window.fetchedTextLength || retainedLength !== window.fetchedTextLength)) throw new Error('Complete-source exception metadata is inconsistent.');
  if (window.completeSource !== true && window.kind === 'complete-source') throw new Error('complete-source window must explicitly record completeSource=true.');
  if (window.kind === 'pdf-pages' && (!Array.isArray(window.pages) || window.pages.length === 0)) throw new Error('PDF source artifact must identify retained pages.');
}

function assertKnownFields(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unknown unhashed field "${key}".`);
}

function validateContextForExcerpt(artifact, excerpt) {
  const normalizedExcerpt = normalizeEvidenceText(excerpt);
  const index = artifact.retainedText.indexOf(normalizedExcerpt);
  if (index < 0) throw new Error('Exact excerpt is not contained in retained fetched source context.');
  if (artifact.window.completeSource === true) return;
  const before = index;
  const after = artifact.retainedText.length - index - normalizedExcerpt.length;
  if (before < MIN_CONTEXT_CHARS || after < MIN_CONTEXT_CHARS) throw new Error('Retained source artifact lacks meaningful surrounding context for excerpt.');
}

function validateContextForOffsets(artifact, start, end) {
  if (artifact.window.completeSource === true) return;
  if (start < MIN_CONTEXT_CHARS || artifact.retainedText.length - end < MIN_CONTEXT_CHARS) {
    throw new Error('Retained source artifact lacks meaningful surrounding context at the declared excerpt offsets.');
  }
}

function assertArtifactId(artifactId) {
  if (!ARTIFACT_ID.test(artifactId ?? '')) throw new Error(`Unsafe source artifact hash/path rejected: ${artifactId}`);
}

async function writeImmutable(filePath, text, label) {
  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing === text) return false;
    throw new Error(`Immutable ${label} collision; existing bytes do not match.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const handle = await open(tempPath, 'wx');
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  try { await link(tempPath, filePath); } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await readFile(filePath, 'utf8');
    if (existing !== text) throw new Error(`Immutable ${label} collision; concurrently created bytes do not match.`);
    return false;
  } finally { await rm(tempPath, { force: true }); }
  return true;
}
