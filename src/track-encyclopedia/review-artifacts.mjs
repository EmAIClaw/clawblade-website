import { createHash } from 'node:crypto';
import { link, mkdir, open, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { canonicalStringify } from './hash.mjs';
import { canonicalizeSourceUrl } from './canonical-url.mjs';

const HASH = /^[a-f0-9]{64}$/;
const DECISIONS = new Set(['supported', 'unsupported', 'uncertain']);
const REVIEW_FIELDS = new Set(['schemaVersion', 'albumId', 'editionNumber', 'candidateContentHash', 'reviewer', 'reviewedAt', 'decisions', 'recordId', 'recordHash']);
const REVIEWER_FIELDS = new Set(['identity', 'runId', 'process']);
const DECISION_FIELDS = new Set(['decisionId', 'claimId', 'artifactIds', 'sourceUrls', 'decision', 'rationale']);
// Preserved immutable history: rank-4 edition 2 predates strict canonical URL
// storage. Its replacement review is canonical; only these exact old bytes are
// accepted as a legacy read exception.
const LEGACY_NONCANONICAL_URL_RECORDS = new Set(['87624e3843e1ebed2bb3a7ada898329c2ff03e1350d18946421a267bba363e38']);

export function computeReviewSubjectHash(entry) {
  const tracks = structuredClone(entry?.trackEntries ?? []);
  for (const track of tracks) {
    for (const fact of track.verifiedFacts ?? []) delete fact.semanticReview;
  }
  return createHash('sha256').update(canonicalStringify({
    albumId: entry?.albumId,
    editionNumber: entry?.editionNumber,
    trackEntries: tracks,
  })).digest('hex');
}

export function computeReviewArtifactHash(record) {
  return createHash('sha256').update(canonicalStringify(reviewHashDomain(record))).digest('hex');
}

export function createReviewArtifact(input) {
  const record = {
    schemaVersion: 1,
    albumId: input.albumId,
    editionNumber: input.editionNumber,
    candidateContentHash: input.candidateContentHash,
    reviewer: input.reviewer,
    reviewedAt: input.reviewedAt,
    decisions: input.decisions,
  };
  record.recordId = computeReviewArtifactHash(record);
  record.recordHash = record.recordId;
  validateReviewArtifact(record);
  return record;
}

export function validateReviewArtifact(record) {
  if (!record || typeof record !== 'object') throw new Error('Review artifact is required.');
  assertKnownFields(record, REVIEW_FIELDS, 'Review artifact');
  if (record.schemaVersion !== 1) throw new Error('Review artifact schemaVersion must be 1.');
  if (!HASH.test(record.recordId ?? '') || !HASH.test(record.recordHash ?? '')) throw new Error('Review artifact requires safe content-addressed recordId and recordHash.');
  if (record.recordId !== record.recordHash || computeReviewArtifactHash(record) !== record.recordId) throw new Error(`Review artifact hash mismatch for ${record.recordId}.`);
  if (typeof record.albumId !== 'string' || !record.albumId.trim()) throw new Error('Review artifact requires albumId.');
  if (!Number.isInteger(record.editionNumber) || record.editionNumber < 1) throw new Error('Review artifact requires editionNumber >= 1.');
  if (!HASH.test(record.candidateContentHash ?? '')) throw new Error('Review artifact requires a 64-character candidate content hash.');
  if (!record.reviewer || typeof record.reviewer.identity !== 'string' || !record.reviewer.identity.trim() || typeof record.reviewer.runId !== 'string' || !record.reviewer.runId.trim() || typeof record.reviewer.process !== 'string' || !record.reviewer.process.trim()) throw new Error('Review artifact requires reviewer identity, runId, and process.');
  assertKnownFields(record.reviewer, REVIEWER_FIELDS, 'Review artifact reviewer');
  if (record.reviewer.identity !== 'codex-independent-evidence-reviewer' || record.reviewer.process !== 'codex exec --sandbox read-only') throw new Error('Review artifact reviewer identity/process is not trusted by this lifecycle.');
  if (typeof record.reviewedAt !== 'string' || Number.isNaN(Date.parse(record.reviewedAt))) throw new Error('Review artifact requires a valid reviewedAt timestamp.');
  if (!Array.isArray(record.decisions) || record.decisions.length === 0) throw new Error('Review artifact requires reviewed claim decisions.');
  const decisionIds = new Set();
  const claimIds = new Set();
  for (const decision of record.decisions) {
    if (!decision || typeof decision !== 'object') throw new Error('Review artifact decision must be an object.');
    assertKnownFields(decision, DECISION_FIELDS, 'Review artifact decision');
    for (const field of ['decisionId', 'claimId', 'rationale']) if (typeof decision[field] !== 'string' || !decision[field].trim()) throw new Error(`Review artifact decision requires ${field}.`);
    if (decisionIds.has(decision.decisionId)) throw new Error(`Duplicate review decisionId ${decision.decisionId}.`);
    if (claimIds.has(decision.claimId)) throw new Error(`Duplicate review claimId ${decision.claimId}.`);
    decisionIds.add(decision.decisionId); claimIds.add(decision.claimId);
    if (!DECISIONS.has(decision.decision)) throw new Error('Review decision must be supported, unsupported, or uncertain.');
    if (!Array.isArray(decision.artifactIds) || decision.artifactIds.length === 0 || decision.artifactIds.some((id) => !HASH.test(id))) throw new Error('Review decision requires source artifact references.');
    if (!Array.isArray(decision.sourceUrls) || decision.sourceUrls.length === 0 || decision.sourceUrls.some((value) => typeof value !== 'string' || !value.startsWith('https://'))) throw new Error('Review decision requires sourceUrls.');
    if (!LEGACY_NONCANONICAL_URL_RECORDS.has(record.recordId) && decision.sourceUrls.some((value) => canonicalizeSourceUrl(value) !== value)) throw new Error('Review decision sourceUrls must be canonical HTTPS URLs.');
  }
  return true;
}

export function validateSemanticReviewBinding({ entry, fact, sourceArtifacts, reviewArtifacts }) {
  const link = fact?.semanticReview;
  if (!link || typeof link.recordId !== 'string' || typeof link.decisionId !== 'string') throw new Error(`Claim ${fact?.claimId ?? '(missing claimId)'} semanticReview must reference a real review artifact record and decision.`);
  if (!fact.claimId || typeof fact.claimId !== 'string') throw new Error('Evidence-bearing claim requires a stable claimId.');
  const record = reviewArtifacts?.[link.recordId];
  if (!record) throw new Error(`Missing semantic review record ${link.recordId}.`);
  validateReviewArtifact(record);
  if (record.albumId !== entry.albumId || record.editionNumber !== entry.editionNumber) throw new Error('Semantic review record album/edition binding mismatch.');
  const expectedCandidateHash = computeReviewSubjectHash(entry);
  if (record.candidateContentHash !== expectedCandidateHash) throw new Error('Semantic review record has a stale or mismatched candidate content hash.');
  const decision = record.decisions.find((item) => item.decisionId === link.decisionId);
  if (!decision || decision.claimId !== fact.claimId || link.decisionId !== fact.claimId) throw new Error(`Semantic review claim/decision binding mismatch for ${fact.claimId}.`);
  if (decision.decision !== 'supported') throw new Error(`Semantic review decision for ${fact.claimId} is ${decision.decision}; only supported claims are completion-eligible.`);
  const authorIdentity = entry.generationMetadata?.generator;
  if (authorIdentity && record.reviewer.identity === authorIdentity) throw new Error('Reviewer separation failed: reviewer identity matches authoring generator.');
  const claimArtifactIds = new Set((fact.sourceRefs ?? []).map((ref) => ref.artifactId));
  if (decision.artifactIds.length !== claimArtifactIds.size || decision.artifactIds.some((id) => !claimArtifactIds.has(id))) throw new Error(`Semantic review source artifact binding mismatch for ${fact.claimId}.`);
  const claimUrls = new Set((fact.sourceRefs ?? []).map((ref) => canonicalizeSourceUrl(ref.url)));
  const decisionUrls = new Set(decision.sourceUrls.map((url) => canonicalizeSourceUrl(url)));
  if (decisionUrls.size !== claimUrls.size || [...decisionUrls].some((url) => !claimUrls.has(url))) throw new Error(`Semantic review canonical source URL binding mismatch for ${fact.claimId}.`);
  for (const artifactId of decision.artifactIds) {
    const artifact = sourceArtifacts?.[artifactId];
    if (!artifact) throw new Error(`Semantic review references missing source artifact ${artifactId}.`);
    if (artifact.collector?.identity === record.reviewer.identity) throw new Error('Reviewer separation failed: reviewer identity matches source collector.');
  }
  return { approved: true, record, decision };
}

export function reviewArtifactPath(directory, recordId) {
  assertHash(recordId);
  const root = path.resolve(directory);
  const filePath = path.resolve(root, `${recordId}.json`);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('Unsafe review artifact path rejected.');
  return filePath;
}

export async function writeReviewArtifact(directory, record) {
  validateReviewArtifact(record);
  return writeImmutable(reviewArtifactPath(directory, record.recordId), `${canonicalStringify(record)}\n`, `review artifact ${record.recordId}`);
}

export async function readReviewArtifacts(directory) {
  const records = {};
  let names = [];
  try { names = await readdir(directory); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  for (const name of names.filter((value) => value.endsWith('.json')).sort()) {
    const recordId = name.slice(0, -5);
    assertHash(recordId);
    const text = await readFile(reviewArtifactPath(directory, recordId), 'utf8');
    const record = JSON.parse(text);
    if (text !== `${canonicalStringify(record)}\n`) throw new Error(`Review artifact ${name} bytes are not canonical immutable JSON.`);
    validateReviewArtifact(record);
    if (record.recordId !== recordId) throw new Error(`Review artifact filename/key mismatch for ${name}.`);
    records[recordId] = record;
  }
  return records;
}

function reviewHashDomain(record) {
  return {
    schemaVersion: record.schemaVersion ?? 1,
    albumId: record.albumId,
    editionNumber: record.editionNumber,
    candidateContentHash: record.candidateContentHash,
    reviewer: record.reviewer,
    reviewedAt: record.reviewedAt,
    decisions: record.decisions,
  };
}

function assertHash(value) {
  if (!HASH.test(value ?? '')) throw new Error(`Unsafe review artifact hash/path rejected: ${value}`);
}

function assertKnownFields(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} contains unknown unhashed field "${key}".`);
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
