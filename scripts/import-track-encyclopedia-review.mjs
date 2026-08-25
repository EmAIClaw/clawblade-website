#!/usr/bin/env node
// Imports decisions produced by a separate read-only reviewer. This script never
// authors or infers approval decisions; it only validates, stores, and binds them.
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { computeTrackEncyclopediaContentHash } from '../src/track-encyclopedia/hash.mjs';
import { createReviewArtifact, computeReviewSubjectHash, readReviewArtifacts, writeReviewArtifact } from '../src/track-encyclopedia/review-artifacts.mjs';
import { readSourceArtifacts } from '../src/track-encyclopedia/source-artifacts.mjs';
import { validateEntry } from '../src/track-encyclopedia/validation.mjs';
import { canonicalizeSourceUrl } from '../src/track-encyclopedia/canonical-url.mjs';

const [albumId, reviewerOutputPath] = process.argv.slice(2);
if (!albumId || !reviewerOutputPath) throw new Error('Usage: import-track-encyclopedia-review.mjs <albumId> <reviewerOutputPath>');
const dataDir = path.resolve('src/data/track-encyclopedia');
const authoringPath = path.join(dataDir, 'authoring', `${albumId}.json`);
const reviewDir = path.join(dataDir, 'review-artifacts');
const doc = JSON.parse(await readFile(authoringPath, 'utf8'));
const entry = doc.entries?.[albumId];
if (!entry) throw new Error(`Missing authoring entry ${albumId}.`);
const raw = JSON.parse(await readFile(reviewerOutputPath, 'utf8'));
if (raw.schemaVersion !== 1 || raw.albumId !== albumId || raw.editionNumber !== entry.editionNumber) throw new Error('Reviewer output candidate identity mismatch.');
const candidateContentHash = computeReviewSubjectHash(entry);
if (raw.candidateContentHash !== candidateContentHash) throw new Error('Reviewer output candidate hash is stale or mismatched.');
if (raw.reviewer?.identity === entry.generationMetadata?.generator) throw new Error('Reviewer identity matches authoring generator.');
const facts = new Map();
for (const track of entry.trackEntries ?? []) for (const fact of track.verifiedFacts ?? []) {
  if (!fact.claimId || facts.has(fact.claimId)) throw new Error(`Missing or duplicate candidate claimId ${fact.claimId ?? ''}.`);
  facts.set(fact.claimId, fact);
}
if (!Array.isArray(raw.decisions) || raw.decisions.length !== facts.size) throw new Error('Reviewer output must decide every candidate claim exactly once.');
for (const decision of raw.decisions) {
  const fact = facts.get(decision.claimId);
  if (!fact || decision.decisionId !== decision.claimId) throw new Error(`Reviewer decision binding mismatch for ${decision.claimId}.`);
  const artifactIds = [...new Set((fact.sourceRefs ?? []).map((ref) => ref.artifactId))];
  const sourceUrls = [...new Set((fact.sourceRefs ?? []).map((ref) => canonicalizeSourceUrl(ref.url)))];
  const reviewerSourceUrls = [...new Set((decision.sourceUrls ?? []).map(canonicalizeSourceUrl))];
  if (JSON.stringify(decision.artifactIds) !== JSON.stringify(artifactIds) || JSON.stringify(reviewerSourceUrls) !== JSON.stringify(sourceUrls)) throw new Error(`Reviewer source binding mismatch for ${decision.claimId}.`);
  decision.sourceUrls = reviewerSourceUrls;
}
const record = createReviewArtifact(raw);
for (const fact of facts.values()) fact.semanticReview = { recordId: record.recordId, decisionId: fact.claimId };
entry.reviewMetadata = { reviewedAt: record.reviewedAt, reviewer: record.reviewer.identity, notes: `Imported immutable independent review ${record.recordId}.` };
entry.contentHash = computeTrackEncyclopediaContentHash(entry);
const sourceArtifacts = await readSourceArtifacts(path.join(dataDir, 'source-artifacts'));
const existingReviews = await readReviewArtifacts(reviewDir);
validateEntry(entry, { sourceArtifacts, reviewArtifacts: { ...existingReviews, [record.recordId]: record } });
await writeReviewArtifact(reviewDir, record);
const tempPath = `${authoringPath}.${process.pid}.tmp`;
await writeFile(tempPath, `${JSON.stringify(doc, null, 2)}\n`, { flag: 'wx' });
await rename(tempPath, authoringPath);
console.log(JSON.stringify({ albumId, editionNumber: entry.editionNumber, recordId: record.recordId, candidateContentHash, contentHash: entry.contentHash, decisions: record.decisions.length }));
