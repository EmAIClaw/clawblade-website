#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { computeReviewSubjectHash } from '../src/track-encyclopedia/review-artifacts.mjs';
import { readSourceArtifacts, validateSourceReference } from '../src/track-encyclopedia/source-artifacts.mjs';

const [albumId, outputPath] = process.argv.slice(2);
if (!albumId || !outputPath) throw new Error('Usage: prepare-track-encyclopedia-review.mjs <albumId> <outputPath>');
const dataDir = path.resolve('src/data/track-encyclopedia');
const authoringPath = path.join(dataDir, 'authoring', `${albumId}.json`);
const doc = JSON.parse(await readFile(authoringPath, 'utf8'));
const entry = doc.entries?.[albumId];
if (!entry) throw new Error(`Missing authoring entry ${albumId}.`);
const sourceStore = await readSourceArtifacts(path.join(dataDir, 'source-artifacts'));
const referenced = {};
for (const track of entry.trackEntries ?? []) {
  for (const fact of track.verifiedFacts ?? []) {
    if (!fact.claimId) throw new Error(`Missing claimId for ${track.trackTitle}.`);
    if (fact.semanticReview) throw new Error(`Candidate ${fact.claimId} already has semanticReview; prepare only unreviewed candidates.`);
    for (const ref of fact.sourceRefs ?? []) {
      const artifact = sourceStore[ref.artifactId];
      if (!artifact) throw new Error(`Missing source artifact ${ref.artifactId} for ${fact.claimId}.`);
      validateSourceReference(ref, artifact);
      referenced[artifact.artifactId] = artifact;
    }
  }
}
const candidateContentHash = computeReviewSubjectHash(entry);
const reviewInput = {
  schemaVersion: 1,
  albumId,
  editionNumber: entry.editionNumber,
  candidateContentHash,
  candidate: {
    albumId,
    editionNumber: entry.editionNumber,
    generationMetadata: entry.generationMetadata,
    trackEntries: entry.trackEntries,
  },
  sourceArtifacts: referenced,
};
await writeFile(outputPath, `${JSON.stringify(reviewInput, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ outputPath, albumId, editionNumber: entry.editionNumber, candidateContentHash, claims: entry.trackEntries.reduce((n, track) => n + (track.verifiedFacts?.length ?? 0), 0), sourceArtifacts: Object.keys(referenced).length }));
