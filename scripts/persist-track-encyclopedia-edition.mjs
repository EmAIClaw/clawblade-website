#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { EditionStore } from '../src/track-encyclopedia/editions.mjs';
import { readReviewArtifacts } from '../src/track-encyclopedia/review-artifacts.mjs';
import { readSourceArtifacts } from '../src/track-encyclopedia/source-artifacts.mjs';
import { validateEntry } from '../src/track-encyclopedia/validation.mjs';
import { canonicalStringify } from '../src/track-encyclopedia/hash.mjs';

const [albumId] = process.argv.slice(2);
if (!albumId) throw new Error('Usage: persist-track-encyclopedia-edition.mjs <albumId>');
const dataDir = path.resolve('src/data/track-encyclopedia');
const doc = JSON.parse(await readFile(path.join(dataDir, 'authoring', `${albumId}.json`), 'utf8'));
const entry = doc.entries?.[albumId];
if (!entry) throw new Error(`Missing authoring entry ${albumId}.`);
const snapshotDoc = JSON.parse(await readFile(path.join(dataDir, 'evidence-snapshots.json'), 'utf8'));
const evidenceSnapshots = snapshotDoc.snapshots ?? {};
const sourceArtifacts = await readSourceArtifacts(path.join(dataDir, 'source-artifacts'));
const reviewArtifacts = await readReviewArtifacts(path.join(dataDir, 'review-artifacts'));
validateEntry(entry, { sourceArtifacts, reviewArtifacts });
const store = await EditionStore.openWithLegacyHistory(dataDir, { evidenceSnapshots, sourceArtifacts, reviewArtifacts });
const existing = store.getEdition(albumId, entry.editionNumber);
if (!existing) store.upsert(entry);
else if (canonicalStringify(existing) !== canonicalStringify(entry)) throw new Error(`Immutable edition ${entry.editionNumber} content or metadata collision for ${albumId}; create a new edition.`);
await store.persist(albumId, entry.editionNumber);
console.log(JSON.stringify({ albumId, editionNumber: entry.editionNumber, published: entry.published, contentHash: entry.contentHash, alreadyPresent: Boolean(existing) }));
