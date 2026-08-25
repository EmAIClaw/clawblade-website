// Focused RED/GREEN tests for offline evidence and independent review provenance.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const failures = [];
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`  ✗ ${name}: ${error.message}`);
  }
}

async function sourceApi() {
  return await import('../src/track-encyclopedia/source-artifacts.mjs');
}
async function reviewApi() {
  return await import('../src/track-encyclopedia/review-artifacts.mjs');
}
async function validationApi() {
  return await import('../src/track-encyclopedia/validation.mjs');
}

const canonicalUrl = 'https://example.com/interviews/album-track-by-track';
const fetchedText = 'Opening context identifies the producer and the recording session. The producer says Track One used a prepared piano during the bridge. Following context explains when and where the overdub was completed. Closing context identifies the next song and interview section.';
const excerptOne = 'The producer says Track One used a prepared piano during the bridge.';
const excerptTwo = 'Following context explains when and where the overdub was completed.';

async function makeSource(overrides = {}) {
  const { createSourceArtifact } = await sourceApi();
  return createSourceArtifact({
    canonicalUrl,
    finalUrl: canonicalUrl,
    retrievedAt: '2026-08-25T12:00:00.000Z',
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    collector: { identity: 'albumvault-http-collector', version: '1.0.0', runId: 'collector-run-1' },
    fetchedResponseSha256: 'b'.repeat(64),
    normalizationVersion: 'nfkc-whitespace-v1',
    retainedText: fetchedText,
    window: { kind: 'character-offsets', start: 100, end: 100 + fetchedText.length, fetchedTextLength: 1000, completeSource: false },
    collectionMethod: 'http-fetch',
    ...overrides,
  });
}

function makeClaim(artifact, overrides = {}) {
  return {
    claimId: 'test-album:1:1:fact-1',
    claim: 'The producer says Track One used a prepared piano during the bridge.',
    sourceRefs: [{
      label: 'Example interview', title: 'Album track by track', url: canonicalUrl,
      extract: excerptOne, extractType: 'verbatim', evidenceStatus: 'retrieved',
      artifactId: artifact.artifactId,
      section: { kind: 'character-offsets', start: fetchedText.indexOf(excerptOne), end: fetchedText.indexOf(excerptOne) + excerptOne.length },
    }],
    semanticReview: { recordId: 'pending', decisionId: 'test-album:1:1:fact-1' },
    ...overrides,
  };
}

function makeEntry(fact, overrides = {}) {
  return {
    albumId: 'test-album', editionNumber: 1, published: false, contentHash: 'pending',
    changeNote: 'Provenance test',
    generationMetadata: { generatedAt: '2026-08-25T00:00:00Z', generator: 'authoring-generator', model: null },
    reviewMetadata: { reviewedAt: '2026-08-25T12:10:00Z', reviewer: 'independent-reviewer', notes: 'fixture' },
    trackEntries: [{
      albumId: 'test-album', discNumber: 1, trackNumber: 1, trackTitle: 'Track One', evidenceLevel: 'documented',
      verifiedFacts: [fact], musicalCharacter: '', albumContext: '', listeningNotes: '', limitations: [],
    }],
    ...overrides,
  };
}

async function makeReviewedFixture({ decision = 'supported', authorIdentity = 'authoring-generator', candidateHash = null, claimId = null } = {}) {
  const source = await makeSource();
  const fact = makeClaim(source);
  const entry = makeEntry(fact);
  entry.generationMetadata.generator = authorIdentity;
  const { computeReviewSubjectHash, createReviewArtifact } = await reviewApi();
  const reviewSubjectHash = candidateHash ?? computeReviewSubjectHash(entry);
  const record = createReviewArtifact({
    albumId: entry.albumId,
    editionNumber: entry.editionNumber,
    candidateContentHash: reviewSubjectHash,
    reviewer: { identity: 'codex-independent-evidence-reviewer', runId: 'review-run-1', process: 'codex exec --sandbox read-only' },
    reviewedAt: '2026-08-25T12:10:00.000Z',
    decisions: [{
      decisionId: claimId ?? fact.claimId,
      claimId: claimId ?? fact.claimId,
      artifactIds: [source.artifactId],
      sourceUrls: [canonicalUrl],
      decision,
      rationale: 'The retained fetched context explicitly states the narrow production claim.',
    }],
  });
  fact.semanticReview = { recordId: record.recordId, decisionId: fact.claimId };
  entry.reviewMetadata = { reviewedAt: record.reviewedAt, reviewer: record.reviewer.identity, notes: `Imported immutable independent review ${record.recordId}.` };
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  return { source, fact, entry, record };
}

await test('source artifacts are deterministic and deduplicate identical fetched source identity/content', async () => {
  const first = await makeSource();
  const second = await makeSource();
  assert.equal(first.artifactId, second.artifactId);
  assert.deepEqual(first, second);
});

await test('tampered source artifact hash fails closed', async () => {
  const { validateSourceArtifact } = await sourceApi();
  const artifact = await makeSource();
  artifact.retainedText += ' tampered';
  assert.throws(() => validateSourceArtifact(artifact), /hash|tamper|mismatch/i);
});

await test('self-derived or authored-excerpt collection fails closed', async () => {
  await assert.rejects(
    () => makeSource({ collectionMethod: 'authored-excerpt' }),
    /fetch|self-derived|authored|collector/i,
  );
});

await test('excerpt-only retained text without surrounding context fails closed', async () => {
  const { validateSourceArtifact } = await sourceApi();
  const artifact = await makeSource({
    retainedText: excerptOne,
    window: { kind: 'character-offsets', start: 0, end: excerptOne.length, fetchedTextLength: 1000, completeSource: false },
  });
  assert.throws(() => validateSourceArtifact(artifact, { excerpt: excerptOne }), /context|surround/i);
});

await test('complete-source equality is the only narrow no-context exception', async () => {
  const { validateSourceArtifact } = await sourceApi();
  const artifact = await makeSource({
    retainedText: excerptOne,
    window: { kind: 'complete-source', start: 0, end: excerptOne.length, fetchedTextLength: excerptOne.length, completeSource: true },
  });
  assert.doesNotThrow(() => validateSourceArtifact(artifact, { excerpt: excerptOne }));
});

await test('claim URL mismatch against source artifact fails closed', async () => {
  const { validateSourceReference } = await sourceApi();
  const artifact = await makeSource();
  const ref = makeClaim(artifact).sourceRefs[0];
  ref.url = 'https://example.org/different';
  assert.throws(() => validateSourceReference(ref, artifact), /URL|canonical/i);
});

await test('source artifact canonical and final URLs must both remain HTTPS', async () => {
  await assert.rejects(() => makeSource({ finalUrl: 'http://example.com/interviews/album-track-by-track' }), /HTTPS|finalUrl/i);
});

await test('source artifact rejects null contentEncoding alias bytes', async () => {
  const { validateSourceArtifact } = await sourceApi();
  const source = await makeSource();
  assert.throws(() => validateSourceArtifact({ ...source, contentEncoding: null }), /contentEncoding|omitted/i);
});

await test('exact retained excerpt and declared offsets are enforced', async () => {
  const { validateSourceReference } = await sourceApi();
  const artifact = await makeSource();
  const ref = makeClaim(artifact).sourceRefs[0];
  ref.section.start += 1;
  assert.throws(() => validateSourceReference(ref, artifact), /offset|exact|section/i);
});

await test('context validation uses the declared duplicate-excerpt occurrence', async () => {
  const { validateSourceReference } = await sourceApi();
  const repeatedText = `${excerptOne} Middle context is deliberately long enough to contain a second occurrence after more than twenty-four characters. ${excerptOne} Closing context remains available after the second occurrence.`;
  const artifact = await makeSource({
    retainedText: repeatedText,
    window: { kind: 'character-offsets', start: 100, end: 100 + repeatedText.length, fetchedTextLength: 1000, completeSource: false },
  });
  const ref = makeClaim(artifact).sourceRefs[0];
  ref.section = { kind: 'character-offsets', start: 0, end: excerptOne.length };
  assert.throws(() => validateSourceReference(ref, artifact), /context.*declared|surrounding context/i);
});

await test('one genuine shared track-by-track artifact supports distinct claim excerpts', async () => {
  const { validateSourceReference } = await sourceApi();
  const artifact = await makeSource();
  const first = makeClaim(artifact).sourceRefs[0];
  const secondStart = fetchedText.indexOf(excerptTwo);
  const second = { ...first, extract: excerptTwo, section: { kind: 'character-offsets', start: secondStart, end: secondStart + excerptTwo.length } };
  assert.doesNotThrow(() => validateSourceReference(first, artifact));
  assert.doesNotThrow(() => validateSourceReference(second, artifact));
  assert.equal(first.artifactId, second.artifactId);
});

await test('source artifact write rejects path traversal', async () => {
  const { writeSourceArtifact } = await sourceApi();
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-source-path-'));
  const artifact = await makeSource();
  artifact.artifactId = '../escape';
  await assert.rejects(() => writeSourceArtifact(dir, artifact), /path|unsafe|hash/i);
});

await test('source artifact immutable collision fails closed', async () => {
  const { sourceArtifactPath, writeSourceArtifact } = await sourceApi();
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-source-collision-'));
  const artifact = await makeSource();
  await writeSourceArtifact(dir, artifact);
  await writeFile(sourceArtifactPath(dir, artifact.artifactId), '{"collision":true}\n');
  await assert.rejects(() => writeSourceArtifact(dir, artifact), /collision|immutable|bytes/i);
});

await test('typed semantic-review strings cannot self-approve', async () => {
  const { validateEntry } = await validationApi();
  const artifact = await makeSource();
  const fact = makeClaim(artifact, { semanticReview: { reviewer: 'independent evidence audit', reviewedAt: '2026-08-25', decision: 'supported' } });
  const entry = makeEntry(fact);
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [artifact.artifactId]: artifact }, reviewArtifacts: {} }), /record|review artifact|semanticReview/i);
});

await test('missing semantic review record fails closed in normal entry validation', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry } = await makeReviewedFixture();
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: {} }), /missing|review record/i);
});

await test('tampered semantic review record hash fails closed', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture();
  record.decisions[0].rationale += ' tampered';
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }), /hash|tamper|mismatch/i);
});

await test('stale review candidate content hash fails closed', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture({ candidateHash: 'a'.repeat(64) });
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }), /candidate|stale|content hash/i);
});

await test('review claim binding mismatch fails closed', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture({ claimId: 'different-claim-id' });
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }), /claim|decision/i);
});

await test('reviewer identity matching authoring generator fails closed', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture({ authorIdentity: 'codex-independent-evidence-reviewer' });
  assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }), /separation|same|reviewer|generator/i);
});

await test('collector identity cannot impersonate the trusted reviewer', async () => {
  await assert.rejects(
    () => makeSource({ collector: { identity: 'codex-independent-evidence-reviewer', version: '1.0.0', runId: 'forged-collector' } }),
    /collector|trusted|identity/i,
  );
});

for (const decision of ['unsupported', 'uncertain']) {
  await test(`${decision} review decision fails completion validation`, async () => {
    const { validateEntry } = await validationApi();
    const { source, entry, record } = await makeReviewedFixture({ decision });
    assert.throws(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }), new RegExp(decision, 'i'));
  });
}

await test('review artifact write rejects path traversal', async () => {
  const { writeReviewArtifact } = await reviewApi();
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-review-path-'));
  const { record } = await makeReviewedFixture();
  record.recordId = '../escape';
  await assert.rejects(() => writeReviewArtifact(dir, record), /path|unsafe|hash/i);
});

await test('review artifact immutable collision fails closed', async () => {
  const { reviewArtifactPath, writeReviewArtifact } = await reviewApi();
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-review-collision-'));
  const { record } = await makeReviewedFixture();
  await writeReviewArtifact(dir, record);
  await writeFile(reviewArtifactPath(dir, record.recordId), '{"collision":true}\n');
  await assert.rejects(() => writeReviewArtifact(dir, record), /collision|immutable|bytes/i);
});

await test('duplicate candidate claimIds fail closed even when one review decision exists', async () => {
  const { validateEntry } = await validationApi();
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  const { source, entry, record } = await makeReviewedFixture();
  entry.trackEntries[0].verifiedFacts.push(structuredClone(entry.trackEntries[0].verifiedFacts[0]));
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  assert.throws(
    () => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }),
    /duplicate.*claimId/i,
  );
});

await test('claimIds must include their album and exact track identity', async () => {
  const { validateEntry } = await validationApi();
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  const { source, entry, record } = await makeReviewedFixture();
  entry.trackEntries[0].verifiedFacts[0].claimId = 'other-album:1:1:fact-1';
  entry.trackEntries[0].verifiedFacts[0].semanticReview.decisionId = 'other-album:1:1:fact-1';
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  assert.throws(
    () => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }),
    /globally unique stable identity|claim/i,
  );
});

await test('review decision claim set must exactly match candidate claims', async () => {
  const { validateEntry } = await validationApi();
  const { createReviewArtifact } = await reviewApi();
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  const { source, entry, record } = await makeReviewedFixture();
  const extraRecord = createReviewArtifact({
    ...record,
    decisions: [...record.decisions, {
      ...record.decisions[0],
      decisionId: 'test-album:1:99:fact-1',
      claimId: 'test-album:1:99:fact-1',
      rationale: 'An extra decision that is not present in the candidate.',
    }],
  });
  entry.trackEntries[0].verifiedFacts[0].semanticReview.recordId = extraRecord.recordId;
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  assert.throws(
    () => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [extraRecord.recordId]: extraRecord } }),
    /claim set|exactly match/i,
  );
});

await test('non-canonical authored source URLs fail closed before review binding', async () => {
  const { validateEntry } = await validationApi();
  const { createReviewArtifact, computeReviewSubjectHash } = await reviewApi();
  const { computeTrackEncyclopediaContentHash } = await import('../src/track-encyclopedia/hash.mjs');
  const source = await makeSource();
  const fact = makeClaim(source);
  fact.sourceRefs[0].url = `${canonicalUrl}/`;
  const entry = makeEntry(fact);
  const record = createReviewArtifact({
    albumId: entry.albumId,
    editionNumber: entry.editionNumber,
    candidateContentHash: computeReviewSubjectHash(entry),
    reviewer: { identity: 'codex-independent-evidence-reviewer', runId: 'canonical-url-review', process: 'codex exec --sandbox read-only' },
    reviewedAt: '2026-08-25T12:10:00.000Z',
    decisions: [{
      decisionId: fact.claimId,
      claimId: fact.claimId,
      artifactIds: [source.artifactId],
      sourceUrls: [canonicalUrl],
      decision: 'supported',
      rationale: 'Canonical review URL cannot excuse a non-canonical authored source URL.',
    }],
  });
  fact.semanticReview = { recordId: record.recordId, decisionId: fact.claimId };
  entry.reviewMetadata = { reviewedAt: record.reviewedAt, reviewer: record.reviewer.identity, notes: `Imported immutable independent review ${record.recordId}.` };
  entry.contentHash = computeTrackEncyclopediaContentHash(entry);
  assert.throws(
    () => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }),
    /source ref URL must be canonical|source reference URL must be canonical/i,
  );
});

await test('Wayback canonical URLs preserve the embedded original scheme slashes', async () => {
  const { canonicalizeSourceUrl } = await import('../src/track-encyclopedia/canonical-url.mjs');
  const replay = 'https://web.archive.org/web/20240625090857id_/https://www.musicradar.com/news/fleetwood-mac-rumours-interview-track-by-track';
  assert.equal(canonicalizeSourceUrl(replay), replay);
});

await test('new immutable review records reject non-canonical source URLs', async () => {
  const { createReviewArtifact } = await reviewApi();
  const { record } = await makeReviewedFixture();
  assert.throws(
    () => createReviewArtifact({
      ...record,
      decisions: record.decisions.map((decision) => ({ ...decision, sourceUrls: [`${canonicalUrl}/`] })),
    }),
    /canonical HTTPS URLs/i,
  );
});

await test('source and review artifacts reject unknown unhashed fields', async () => {
  const { validateSourceArtifact } = await sourceApi();
  const { validateReviewArtifact } = await reviewApi();
  const { source, record } = await makeReviewedFixture();
  assert.throws(() => validateSourceArtifact({ ...source, injected: 'not hashed' }), /unknown|unhashed/i);
  assert.throws(() => validateReviewArtifact({ ...record, injected: 'not hashed' }), /unknown|unhashed/i);
});

await test('artifact readers reject non-canonical immutable JSON bytes', async () => {
  const { readSourceArtifacts, sourceArtifactPath } = await sourceApi();
  const { readReviewArtifacts, reviewArtifactPath } = await reviewApi();
  const { source, record } = await makeReviewedFixture();
  const sourceDir = await mkdtemp(path.join(tmpdir(), 'albumvault-source-canonical-'));
  const reviewDir = await mkdtemp(path.join(tmpdir(), 'albumvault-review-canonical-'));
  await writeFile(sourceArtifactPath(sourceDir, source.artifactId), `${JSON.stringify(source, null, 2)}\n`);
  await writeFile(reviewArtifactPath(reviewDir, record.recordId), `${JSON.stringify(record, null, 2)}\n`);
  await assert.rejects(() => readSourceArtifacts(sourceDir), /canonical immutable JSON/i);
  await assert.rejects(() => readReviewArtifacts(reviewDir), /canonical immutable JSON/i);
});

await test('entry review metadata must match its immutable review record', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture();
  entry.reviewMetadata.reviewer = 'forged-reviewer';
  assert.throws(
    () => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }),
    /reviewMetadata|immutable review record/i,
  );
});

await test('valid source and independent supported review pass normal entry validation', async () => {
  const { validateEntry } = await validationApi();
  const { source, entry, record } = await makeReviewedFixture();
  assert.doesNotThrow(() => validateEntry(entry, { sourceArtifacts: { [source.artifactId]: source }, reviewArtifacts: { [record.recordId]: record } }));
});

await test('normal album-edition validation is wired fail-closed to artifact stores', async () => {
  const root = process.cwd();
  const sourceData = path.join(root, 'src/data/track-encyclopedia');
  const dir = await mkdtemp(path.join(tmpdir(), 'albumvault-provenance-build-'));
  await mkdir(path.join(dir, 'authoring'), { recursive: true });
  await cp(path.join(sourceData, 'pilot-entries.json'), path.join(dir, 'pilot-entries.json'));
  await cp(path.join(sourceData, 'evidence-snapshots.json'), path.join(dir, 'evidence-snapshots.json'));
  await cp(path.join(root, 'src/data/catalog.generated.json'), path.join(dir, 'catalog.generated.json'));
  await cp(
    path.join(sourceData, 'authoring/007-fleetwood-mac-rumours-bc57e04c.json'),
    path.join(dir, 'authoring/007-fleetwood-mac-rumours-bc57e04c.json'),
  );
  const { validateAlbumEdition } = await import('./build-track-encyclopedia.mjs');
  await assert.rejects(
    () => validateAlbumEdition({ dataDir: dir, albumId: '007-fleetwood-mac-rumours-bc57e04c' }),
    /artifactId|source artifact|review artifact/i,
  );
});

console.log(`\nProvenance tests: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) process.exit(1);
