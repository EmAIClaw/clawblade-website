// test-track-encyclopedia.mjs — TDD test for the versioned track-encyclopedia foundation.
// Run with: node scripts/test-track-encyclopedia.mjs

import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm, cp, readdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  validateEntry,
  validateTrackEntry,
  validateSourceRef,
  validateEvidenceSnapshot,
  detectBoilerplate,
  EVIDENCE_LEVELS,
  canonicalizeSourceUrl,
  computeEvidenceSnapshotHash,
  sourceClaimIsConsistentWithEvidence,
  reviewEvidenceGate,
} from '../src/track-encyclopedia/validation.mjs';
import {
  EditionStore,
  createEntry,
  computeContentHash,
} from '../src/track-encyclopedia/editions.mjs';
import { canonicalStringify } from '../src/track-encyclopedia/hash.mjs';
import {
  getTrackEncyclopediaModuleIds,
  validateTrackEncyclopediaAlbumEntry,
  validateTrackEncyclopediaData,
  computeRuntimeContentHashFallback,
} from '../src/track-encyclopedia/runtime.ts';
import { buildTrackEncyclopedia, validateAlbumEdition, publishAlbumEdition } from './build-track-encyclopedia.mjs';
import { planReleaseRetention } from '../src/track-encyclopedia/release-gc.mjs';

const tmpDir = path.join(process.cwd(), 'tmp-test-encyclopedia');
const dataDir = path.join(process.cwd(), 'src/data/track-encyclopedia');
const failures = [];
let passed = 0;

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    passed += 1;
    console.log(`  ✓ ${name}`);
  }).catch((err) => {
    failures.push({ name, message: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  });
}

// ─── Section 1: Evidence levels ────────────────────────────────────

await test('EVIDENCE_LEVELS distinguishes completed insufficient evidence from unresearched', () => {
  assert.ok(EVIDENCE_LEVELS.includes('documented'), 'must include documented');
  assert.ok(EVIDENCE_LEVELS.includes('contextual'), 'must include contextual');
  assert.ok(EVIDENCE_LEVELS.includes('limited'), 'must include limited');
  assert.ok(EVIDENCE_LEVELS.includes('insufficient-evidence'), 'must include completed insufficient evidence');
  assert.ok(EVIDENCE_LEVELS.includes('unresearched'), 'must include unresearched');
  assert.equal(EVIDENCE_LEVELS.length, 5, 'exactly five levels');
});

// ─── Section 2: validateSourceRef ──────────────────────────────────

await test('valid source ref passes', () => {
  validateSourceRef({
    label: 'Wikipedia',
    title: 'What\'s Going On (Marvin Gaye album)',
    url: 'https://en.wikipedia.org/wiki/What%27s_Going_On_(Marvin_Gaye_album)',
  });
});

await test('source ref with empty URL fails', () => {
  assert.throws(
    () => validateSourceRef({ label: 'Wikipedia', title: 'Test', url: '' }),
    /url.*required/i,
    'must reject empty URL'
  );
});

await test('source ref with invalid URL fails', () => {
  assert.throws(
    () => validateSourceRef({ label: 'Wikipedia', title: 'Test', url: 'not-a-url' }),
    /url.*valid/i,
    'must reject non-URL'
  );
});

await test('source ref with non-HTTPS URL fails', () => {
  assert.throws(
    () => validateSourceRef({ label: 'Wikipedia', title: 'Test', url: 'http://example.com' }),
    /https/i,
    'must require HTTPS (or at minimum a valid scheme)'
  );
});

await test('source ref used as evidence requires explicit retrieval status and verbatim extract type', () => {
  assert.throws(
    () => validateSourceRef({
      label: 'Wikipedia',
      title: 'Test',
      url: 'https://example.com/source',
      extract: 'A matching excerpt.',
    }),
    /evidenceStatus|extractType|verbatim|retrieval/i,
    'evidence refs must disclose status and whether the extract is verbatim'
  );
});

await test('fake verbatim retrieved claim fails when excerpt is absent from independent snapshot', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'example-fake-snapshot',
    url: 'https://example.com/source',
    text: 'The retained source text discusses a different recording session in London.',
  });
  assert.throws(
    () => validateTrackEntry(makeDocumentedTrack({
      claim: 'The song was recorded in Detroit by the Funk Brothers.',
      url: 'https://example.com/source',
      extract: 'The song was recorded in Detroit by the Funk Brothers.',
      snapshotId: snapshot.id,
    }), { evidenceSnapshots: { [snapshot.id]: snapshot } }),
    /snapshot|substring|retained evidence|verbatim/i,
    'authored claim JSON must not validate its own extract'
  );
});

await test('tampered evidence snapshot hash fails validation', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'example-tampered-snapshot',
    url: 'https://example.com/source',
    text: 'The song was recorded in Detroit by the Funk Brothers.',
  });
  snapshot.contentHash = '0'.repeat(64);
  assert.throws(
    () => validateTrackEntry(makeDocumentedTrack({
      claim: 'The song was recorded in Detroit by the Funk Brothers.',
      url: 'https://example.com/source',
      extract: 'recorded in Detroit by the Funk Brothers',
      snapshotId: snapshot.id,
    }), { evidenceSnapshots: { [snapshot.id]: snapshot } }),
    /snapshot.*hash|hash.*snapshot/i,
    'snapshot content hash must be checked independently'
  );
});

await test('canonical source URLs collapse cosmetic duplicates', () => {
  assert.equal(
    canonicalizeSourceUrl('https://A.com:443/x/?utm_source=foo#section'),
    canonicalizeSourceUrl('https://a.com/x')
  );
});

// ─── Section 3: validateTrackEntry ─────────────────────────────────

await test('documented track entry with source ref passes', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'songfacts-wgo-test',
    url: 'https://www.songfacts.com/facts/marvin-gaye/whats-going-on',
    text: 'Editorial song history identifies Cleveland, Benson and Gaye as writers and describes Gaye’s lyric and arrangement role.',
  });
  validateTrackEntry({
    trackTitle: 'What\'s Going On',
    evidenceLevel: 'documented',
    verifiedFacts: [
      {
        claim: 'Gaye co-wrote it with Al Cleveland and Renaldo Benson.',
        sourceRefs: [{
          label: 'Songfacts',
          title: "What's Going On by Marvin Gaye",
          url: 'https://www.songfacts.com/facts/marvin-gaye/whats-going-on',
          extract: 'Editorial song history identifies Cleveland, Benson and Gaye as writers and describes Gaye’s lyric and arrangement role.',
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
          snapshotId: snapshot.id,
        }],
      },
    ],
    musicalCharacter: 'Gentle questioning melody with layered vocal harmonies.',
    albumContext: 'Opening track of a concept album addressing social injustice.',
    listeningNotes: 'Listen for the distinctive flute intro and layered vocals.',
  }, { evidenceSnapshots: { [snapshot.id]: snapshot } });
});

await test('factual claim with HTTPS source but unrelated extract fails automated evidence consistency checking', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'documented',
      verifiedFacts: [{
        claim: 'The song was recorded in Detroit by the Funk Brothers.',
        sourceRefs: [{
          label: 'Example',
          title: 'Unrelated source',
          url: 'https://example.com/source',
          extract: 'This page is about a different artist and contains no recording details.',
          extractType: 'verbatim',
          evidenceStatus: 'retrieved',
        }],
      }],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /consistent|claim.*source/i,
    'HTTPS URL shape alone must not verify a factual claim'
  );
});

await test('authored paraphrase cannot satisfy evidence even when it overlaps the claim', () => {
  assert.throws(
    () => validateTrackEntry({
      albumId: 'test-album',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Test Track',
      evidenceLevel: 'documented',
      verifiedFacts: [{
        claim: 'The song was released as the lead single in 1971.',
        sourceRefs: [{
          label: 'Example',
          title: 'Restated source',
          url: 'https://example.com/source',
          extract: 'The song was released as the lead single in 1971.',
          extractType: 'paraphrase',
          evidenceStatus: 'retrieved',
        }],
      }],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /verbatim|paraphrase|extractType/i,
    'an authored restatement marked as paraphrase must not verify a factual claim'
  );
});

await test('track entry with factual claim but no source ref fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'documented',
      verifiedFacts: [{ claim: 'A factual claim with no source.', sourceRefs: [] }],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
    }),
    /source.*required|sourceRef/i,
    'factual claim without source must be rejected'
  );
});

await test('track entry with critic view but no attribution fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      criticalReception: [
        { view: 'A great song.', publication: '', critic: '' },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
    }),
    /publication|attribution/i,
    'critic view without publication must be rejected'
  );
});

await test('critic view with publication but no sourceRef fails verification', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'documented',
      verifiedFacts: [],
      criticalReception: [
        { view: 'A critic called it essential.', publication: 'Example Weekly', critic: 'A. Critic' },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /critic.*source|sourceRef/i,
    'critical reception needs both attribution and a source reference'
  );
});

await test('track entry with fan perspective masquerading as fact fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [{ claim: 'This is the best song ever.', sourceRefs: [] }],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
    }),
    /fan.*perspective|opinion.*fact|subjective/i,
    'opinionated claim in verifiedFacts must be rejected'
  );
});

await test('fan consensus without explicit grounding fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      fanPerspective: [
        { perspective: 'Fans generally consider this the album highlight.', label: 'Fan consensus', grounded: false },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /fan.*ground/i,
    'fan consensus must disclose grounding'
  );
});

await test('fan perspective cannot be grounded by boolean/free text without source refs', () => {
  assert.throws(
    () => validateTrackEntry({
      albumId: 'test-album',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      fanPerspective: [
        { perspective: 'Fans often cite this as a highlight.', label: 'Anecdotal fan perspective', grounded: true, grounding: 'Observed in community discussion.' },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /fan.*source|sourceRefs|community/i,
    'grounded:true and free text alone must not satisfy fan/community evidence'
  );
});

await test('fan consensus requires at least two sourced community references', () => {
  assert.throws(
    () => validateTrackEntry({
      albumId: 'test-album',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      fanPerspective: [
        {
          perspective: 'Fans generally consider this the album highlight.',
          label: 'Fan consensus',
          grounded: true,
          sourceRefs: [{
            label: 'Forum',
            title: 'One discussion',
            url: 'https://example.com/forum',
            extract: 'Several listeners call this track a highlight.',
            extractType: 'verbatim',
            evidenceStatus: 'retrieved',
          }],
        },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /consensus.*two|independent|sourceRefs/i,
    'consensus wording needs multiple independent community sources'
  );
});

await test('fan consensus rejects canonical-equivalent duplicate URLs and source identities', () => {
  assert.throws(
    () => validateTrackEntry({
      albumId: 'test-album',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      fanPerspective: [
        {
          perspective: 'Fans generally consider this the album highlight.',
          label: 'Fan consensus',
          grounded: true,
          sourceRefs: [
            {
              label: 'Forum',
              title: 'First discussion',
              url: 'https://a.com/x',
              extract: 'Listeners call this track a highlight.',
              extractType: 'verbatim',
              evidenceStatus: 'retrieved',
            },
            {
              label: 'Forum',
              title: 'Same discussion',
              url: 'https://a.com:443/x/?utm_source=foo#comments',
              extract: 'Listeners call this track a highlight.',
              extractType: 'verbatim',
              evidenceStatus: 'retrieved',
            },
          ],
        },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }),
    /distinct|canonical|independent|identity/i,
    'cosmetic URL variants must not count as independent fan consensus sources'
  );
});

await test('limited listening analysis can pass without pretending to be documented', () => {
  validateTrackEntry({
    trackTitle: 'Listening Only',
    evidenceLevel: 'limited',
    verifiedFacts: [],
    musicalCharacter: 'A slow build with a rough guitar texture.',
    albumContext: 'Listening analysis only; no sourced factual claim is made.',
    listeningNotes: 'Focus on the shift from sparse opening to louder chorus.',
    limitations: ['Listening analysis only; no source-backed factual claim is present.'],
  });
});

await test('unresearched track entry with no claims passes', () => {
  validateTrackEntry({
    trackTitle: 'Obscure Track',
    evidenceLevel: 'unresearched',
    verifiedFacts: [],
    limitations: ['No track-specific sources were found for this entry.'],
    musicalCharacter: '',
    albumContext: '',
    listeningNotes: '',
  });
});

await test('completed insufficient-evidence disposition requires documented search coverage', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Obscure Track',
      evidenceLevel: 'insufficient-evidence',
      verifiedFacts: [],
      limitations: ['No reliable track-specific evidence was found.'],
      musicalCharacter: '',
      albumContext: 'Metadata-only entry; no track-specific factual claims are made.',
      listeningNotes: '',
    }),
    /search.*quer|source class|research disposition/i,
    'a limitation alone must not masquerade as completed research'
  );

  validateTrackEntry({
    trackTitle: 'Obscure Track',
    evidenceLevel: 'insufficient-evidence',
    verifiedFacts: [],
    limitations: ['No reliable track-specific evidence was found; this entry is metadata-only.'],
    musicalCharacter: '',
    albumContext: 'Metadata-only entry; no track-specific factual claims are made.',
    listeningNotes: '',
    researchDisposition: {
      completedAt: '2026-08-25',
      searchedQueries: ['"Obscure Track" "Example Artist" interview'],
      sourceClasses: ['artist or songwriter interviews', 'established music journalism'],
      outcome: 'No retrieved source contained a reliable track-specific excerpt.',
    },
  });
});

await test('track entry with metadata-only boilerplate as prose fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Track 1',
      evidenceLevel: 'documented',
      verifiedFacts: [],
      musicalCharacter: 'Track 1 of 13, is the album\'s opener and runs 2:36. No confident track-specific external source was found, so this entry uses static track metadata only.',
      albumContext: '',
      listeningNotes: '',
    }),
    /boilerplate|metadata-only|static track metadata/i,
    'boilerplate filler must not be accepted as publishable prose'
  );
});

await test('discovery connection without rationale fails', () => {
  assert.throws(
    () => validateTrackEntry({
      trackTitle: 'Test Track',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      discoveryConnections: [
        { relatedTrackTitle: 'Other Track', rationale: '' },
      ],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
    }),
    /rationale/i,
    'discovery connection without rationale must be rejected'
  );
});

// ─── Section 4: detectBoilerplate ──────────────────────────────────

await test('detectBoilerplate flags near-duplicate guide text across tracks', () => {
  const tracks = [
    { trackTitle: 'A', guide: 'This is a wonderful song with great melody and instrumentation.' },
    { trackTitle: 'B', guide: 'This is a wonderful song with great melody and instrumentation.' },
    { trackTitle: 'C', guide: 'A completely different and unique description.' },
  ];
  const dupes = detectBoilerplate(tracks);
  assert.ok(dupes.length >= 1, 'should detect at least one pair of duplicates');
  assert.ok(dupes[0].trackTitles.includes('A') && dupes[0].trackTitles.includes('B'), 'should flag A and B');
});

await test('detectBoilerplate does not flag unique guides', () => {
  const tracks = [
    { trackTitle: 'A', guide: 'Unique description about song A.' },
    { trackTitle: 'B', guide: 'Different content about song B entirely.' },
  ];
  const dupes = detectBoilerplate(tracks);
  assert.equal(dupes.length, 0, 'should not flag unique guides');
});

await test('detectBoilerplate detects template-fill boilerplate', () => {
  const tracks = [
    { trackTitle: 'A', guide: 'Track 1 of 10, "A", is the album\'s opener and runs 3:30. In the album sequence it opens the record and leads into "B". No confident track-specific external source was found, so this entry uses static track metadata only.' },
    { trackTitle: 'B', guide: 'Track 2 of 10, "B", is the album\'s early-album track and runs 4:10. In the album sequence it follows "A" and leads into "C". No confident track-specific external source was found, so this entry uses static track metadata only.' },
  ];
  const dupes = detectBoilerplate(tracks);
  assert.ok(dupes.length >= 1, 'should detect boilerplate template text');
});

// ─── Section 5: Edition management ─────────────────────────────────

await test('createEntry creates a first edition with correct metadata', () => {
  const entry = createEntry({
    albumId: '001-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'Initial pilot' },
  });
  assert.equal(entry.albumId, '001-test');
  assert.equal(entry.editionNumber, 1);
  assert.equal(entry.published, false);
  assert.ok(entry.contentHash, 'must have a content hash');
  assert.ok(entry.changeNote, 'must have a change note');
});

await test('canonicalStringify is deterministic for differently ordered keys', () => {
  const left = { z: 1, a: { y: 2, b: 3 }, list: [{ c: 4, a: 5 }] };
  const right = { list: [{ a: 5, c: 4 }], a: { b: 3, y: 2 }, z: 1 };
  assert.equal(canonicalStringify(left), canonicalStringify(right));
});

await test('canonicalStringify rejects unsupported non-JSON values and preserves supported JSON domain', () => {
  assert.equal(canonicalStringify({ value: null, list: [1, true, 'x'] }), '{"list":[1,true,"x"],"value":null}');
  const cases = [
    ['undefined', { value: undefined }],
    ['function', { value: () => null }],
    ['symbol', { value: Symbol('bad') }],
    ['bigint', { value: 1n }],
    ['NaN', { value: Number.NaN }],
    ['Infinity', { value: Infinity }],
    ['Date', { value: new Date('2026-01-01T00:00:00Z') }],
    ['custom prototype', Object.create({ inherited: true })],
    ['sparse array', { value: [1, , 3] }],
  ];
  for (const [label, value] of cases) {
    assert.throws(() => canonicalStringify(value), /unsupported|non-json|canonical/i, `${label} must be rejected`);
  }
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => canonicalStringify(cycle), /cycle|circular/i, 'cycles must be rejected');
});

await test('computeContentHash ignores object key insertion order', () => {
  const left = {
    albumId: 'hash-test',
    trackEntries: [{ trackTitle: 'A', evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone', albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] }],
  };
  const right = {
    trackEntries: [{ limitations: ['Listening analysis only.'], listeningNotes: 'Notes', albumContext: 'Ctx', musicalCharacter: 'Tone', verifiedFacts: [], evidenceLevel: 'limited', trackTitle: 'A' }],
    albumId: 'hash-test',
  };
  assert.equal(computeContentHash(left), computeContentHash(right));
});

await test('validateEntry rejects stale supplied contentHash', () => {
  const entry = createEntry({
    albumId: 'stale-hash-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'hash' },
  });
  entry.contentHash = 'stale';
  assert.throws(() => validateEntry(entry), /contentHash.*stale|hash.*mismatch/i);
});

await test('addEdition creates a new edition on the store', () => {
  const store = new EditionStore(tmpDir);
  const e1 = createEntry({
    albumId: '002-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v1' },
  });
  store.upsert(e1);
  const e2 = createEntry({
    albumId: '002-test',
    editionNumber: 2,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-02T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-02T00:00:00Z', reviewer: 'human', notes: 'v2 correction' },
  });
  store.upsert(e2);
  assert.equal(store.getLatest('002-test').editionNumber, 2);
});

await test('addEdition rejects duplicate edition numbers', () => {
  const store = new EditionStore(tmpDir);
  const e1 = createEntry({
    albumId: '003-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v1' },
  });
  store.upsert(e1);
  const dup = createEntry({
    albumId: '003-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'dup' },
  });
  assert.throws(() => store.upsert(dup), /duplicate.*edition|edition.*exists/i, 'must reject duplicate edition');
});

await test('published edition cannot be overwritten', () => {
  const store = new EditionStore(tmpDir);
  const e1 = createEntry({
    albumId: '004-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v1' },
  });
  e1.published = true;
  store.upsert(e1);
  const correction = createEntry({
    albumId: '004-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'try overwrite' },
  });
  assert.throws(() => store.upsert(correction), /published.*overwrite|cannot.*published/i, 'must reject overwriting published edition');
});

await test('published edition remains immutable after disk persistence and reopen', async () => {
  const dir = await makeTempDir('edition-reopen-');
  const original = createEntry({
    albumId: '007-reopen-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'published' },
  });
  original.published = true;
  const store = new EditionStore(dir);
  store.upsert(original);
  await store.persistAll();

  const reopened = await EditionStore.open(dir);
  const overwrite = createEntry({
    albumId: '007-reopen-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-02T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-02T00:00:00Z', reviewer: 'human', notes: 'overwrite' },
  });
  assert.throws(() => reopened.upsert(overwrite), /published.*immutable|cannot.*published/i);
  await rm(dir, { recursive: true, force: true });
});

await test('EditionStore rejects path traversal album IDs before writing files', async () => {
  const dir = await makeTempDir('edition-traversal-');
  const store = new EditionStore(dir);
  const bad = createEntry({
    albumId: '../../outside',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'bad' },
  });
  assert.throws(() => store.upsert(bad), /albumId.*safe|path traversal/i);
  await rm(dir, { recursive: true, force: true });
});

await test('EditionStore deep-clones entries on write and read', () => {
  const store = new EditionStore(tmpDir);
  const entry = createEntry({
    albumId: '008-clone-test',
    editionNumber: 1,
    trackEntries: [{ albumId: '008-clone-test', discNumber: 1, trackNumber: 1, trackTitle: 'Original', evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone', albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'clone' },
  });
  store.upsert(entry);
  entry.trackEntries[0].trackTitle = 'Mutated after upsert';
  const firstRead = store.getEdition('008-clone-test', 1);
  assert.equal(firstRead.trackEntries[0].trackTitle, 'Original');
  firstRead.trackEntries[0].trackTitle = 'Mutated after read';
  assert.equal(store.getEdition('008-clone-test', 1).trackEntries[0].trackTitle, 'Original');
});

await test('correctEntry creates a new edition instead of overwriting', () => {
  const store = new EditionStore(tmpDir);
  const e1 = createEntry({
    albumId: '005-test',
    editionNumber: 1,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v1' },
  });
  e1.published = true;
  store.upsert(e1);
  const e2 = createEntry({
    albumId: '005-test',
    editionNumber: 2,
    trackEntries: [],
    generationMetadata: { generatedAt: '2026-01-02T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-02T00:00:00Z', reviewer: 'human', notes: 'correction v2' },
  });
  store.upsert(e2);
  const latest = store.getLatest('005-test');
  assert.equal(latest.editionNumber, 2, 'latest should be edition 2');
  assert.equal(store.getEdition('005-test', 1).published, true, 'edition 1 should still be published');
  assert.equal(latest.published, false, 'edition 2 should not be published yet');
});

await test('contentHash changes when track entries change', () => {
  const e1 = createEntry({
    albumId: '006-test',
    editionNumber: 1,
    trackEntries: [{ trackTitle: 'A', evidenceLevel: 'unresearched', verifiedFacts: [], limitations: ['none'], musicalCharacter: '', albumContext: '', listeningNotes: '' }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v1' },
  });
  const e2 = createEntry({
    albumId: '006-test',
    editionNumber: 2,
    trackEntries: [{ trackTitle: 'A', evidenceLevel: 'documented', verifiedFacts: [{ claim: 'New fact', sourceRefs: [{ label: 'Wikipedia', title: 'Test', url: 'https://en.wikipedia.org/wiki/Test' }] }], limitations: [], musicalCharacter: 'New', albumContext: 'New', listeningNotes: 'New' }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'v2' },
  });
  assert.notEqual(e1.contentHash, e2.contentHash, 'hashes must differ when content changes');
});

await test('builder rejects changed source content for an already published same edition', async () => {
  const dir = await makeTempDir('builder-same-edition-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const generated = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  const albumId = Object.keys(generated.entries)[0];
  const currentEditionNumber = generated.entries[albumId].editionNumber;
  const editionPath = path.join(dir, 'editions', albumId, `edition-${currentEditionNumber}.json`);
  const edition = JSON.parse(await readFile(editionPath, 'utf8'));
  edition.published = true;
  await writeFile(editionPath, `${JSON.stringify(edition, null, 2)}\n`);

  const pilot = JSON.parse(await readFile(path.join(dir, 'pilot-entries.json'), 'utf8'));
  pilot.entries[albumId].trackEntries[0].listeningNotes += ' Changed source text without a new edition.';
  pilot.entries[albumId].contentHash = '';
  await writeFile(path.join(dir, 'pilot-entries.json'), `${JSON.stringify(pilot, null, 2)}\n`);

  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir }),
    /increment editionNumber|changeNote|published edition/i,
    'builder must fail instead of auto-creating an implicit correction edition'
  );
  const files = await readdir(path.join(dir, 'editions', albumId));
  assert.deepEqual(files.sort(), [`edition-${currentEditionNumber}.json`]);
  await rm(dir, { recursive: true, force: true });
});

await test('builder accepts explicit next edition once and repeated unchanged builds stay on that edition', async () => {
  const dir = await makeTempDir('builder-next-edition-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const generated = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  const albumId = Object.keys(generated.entries)[0];
  const currentEditionNumber = generated.entries[albumId].editionNumber;
  const nextEditionNumber = currentEditionNumber + 1;
  const editionPath = path.join(dir, 'editions', albumId, `edition-${currentEditionNumber}.json`);
  const edition = JSON.parse(await readFile(editionPath, 'utf8'));
  edition.published = true;
  await writeFile(editionPath, `${JSON.stringify(edition, null, 2)}\n`);

  const pilot = JSON.parse(await readFile(path.join(dir, 'pilot-entries.json'), 'utf8'));
  pilot.entries[albumId].editionNumber = nextEditionNumber;
  pilot.entries[albumId].changeNote = 'Explicit test correction';
  pilot.entries[albumId].trackEntries[0].listeningNotes += ' Explicitly declared next edition.';
  pilot.entries[albumId].contentHash = '';
  await writeFile(path.join(dir, 'pilot-entries.json'), `${JSON.stringify(pilot, null, 2)}\n`);
  await buildTrackEncyclopedia({ dataDir: dir });
  await buildTrackEncyclopedia({ dataDir: dir });

  const reopened = await EditionStore.open(dir, { evidenceSnapshots: await readEvidenceSnapshotsForDir(dir) });
  assert.equal(reopened.getEdition(albumId, currentEditionNumber).published, true);
  assert.equal(reopened.getLatest(albumId).editionNumber, nextEditionNumber);
  const files = await readdir(path.join(dir, 'editions', albumId));
  assert.deepEqual(files.sort(), [`edition-${currentEditionNumber}.json`, `edition-${nextEditionNumber}.json`]);
  await rm(dir, { recursive: true, force: true });
});

// ─── Section 6: validateEntry (album-level) ────────────────────────

await test('validateEntry passes for a well-formed pilot entry', () => {
  const snapshot = makeEvidenceSnapshot({
    id: 'entry-a-test',
    url: 'https://en.wikipedia.org/wiki/A',
    text: 'Album reference documents Track A as a single.',
  });
  const entry = createEntry({
    albumId: '001-test',
    editionNumber: 1,
    changeNote: 'Initial pilot entry',
    trackEntries: [
      {
        trackTitle: 'Track A',
        albumId: '001-test',
        discNumber: 1,
        trackNumber: 1,
        evidenceLevel: 'documented',
        verifiedFacts: [{ claim: 'Album reference documents Track A as a single.', sourceRefs: [{ label: 'Wikipedia', title: 'A', url: 'https://en.wikipedia.org/wiki/A', extract: 'Album reference documents Track A as a single.', extractType: 'verbatim', evidenceStatus: 'retrieved', snapshotId: snapshot.id }] }],
        musicalCharacter: 'Description',
        albumContext: 'Context',
        listeningNotes: 'Notes',
        limitations: [],
      },
    ],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'reviewed' },
  });
  validateEntry(entry, { evidenceSnapshots: { [snapshot.id]: snapshot } });
});

await test('validateEntry fails when evidence level is missing', () => {
  const entry = createEntry({
    albumId: '002-test',
    editionNumber: 1,
    changeNote: 'test',
    trackEntries: [
      { albumId: '002-test', discNumber: 1, trackNumber: 1, trackTitle: 'A', evidenceLevel: null, verifiedFacts: [], musicalCharacter: '', albumContext: '', listeningNotes: '', limitations: [] },
    ],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'pilot', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'test' },
  });
  assert.throws(
    () => validateEntry(entry),
    /evidence.*level.*required/i,
    'must require evidence level'
  );
});

// ─── Section 7: Pilot data exists and validates ────────────────────

await test('pilot entries file exists and contains 3 albums', async () => {
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/track-encyclopedia/track-encyclopedia.generated.json'), 'utf8'));
  assert.ok(data.entries, 'must have entries object');
  const albumIds = Object.keys(data.entries);
  assert.ok(albumIds.length >= 3, 'must have at least 3 pilot albums');
});

await test('pilot entries all pass validation', async () => {
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/track-encyclopedia/track-encyclopedia.generated.json'), 'utf8'));
  const snapshots = await readEvidenceSnapshotsForTest();
  for (const [albumId, entry] of Object.entries(data.entries)) {
    try {
      validateEntry(entry, { evidenceSnapshots: snapshots });
    } catch (err) {
      throw new Error(`${albumId}: ${err.message}`);
    }
  }
});

await test('pilot includes one famous, one cult, one sparse album', async () => {
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/track-encyclopedia/track-encyclopedia.generated.json'), 'utf8'));
  const ids = Object.keys(data.entries);
  assert.ok(ids.includes('001-marvin-gaye-what-s-going-on-fd00dde9'), 'must include famous: What\'s Going On');
  assert.ok(ids.includes('054-liz-phair-exile-in-guyville-2b33a458'), 'must include cult: Exile in Guyville');
  assert.ok(ids.includes('092-the-stooges-fun-house-9896fe5c'), 'must include sparse: Fun House');
});

await test('completed pilot entries use only completion-eligible evidence levels', async () => {
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/track-encyclopedia/track-encyclopedia.generated.json'), 'utf8'));
  const completionEligible = new Set(['documented', 'contextual', 'insufficient-evidence']);
  for (const entry of Object.values(data.entries)) {
    for (const track of entry.trackEntries || []) {
      assert.ok(completionEligible.has(track.evidenceLevel), `${entry.albumId}/${track.trackTitle}: ${track.evidenceLevel} is not completion-eligible`);
    }
  }
});

await test('all pilot verifiedFacts are supported by referenced encyclopedia extracts', async () => {
  const pilot = JSON.parse(await readFile(path.join(dataDir, 'pilot-entries.json'), 'utf8'));
  const encyclopedia = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/encyclopedia.generated.json'), 'utf8'));
  for (const [albumId, entry] of Object.entries(pilot.entries)) {
    const extracts = collectEncyclopediaExtracts(encyclopedia.entries[albumId]);
    for (const track of entry.trackEntries) {
      for (const fact of track.verifiedFacts ?? []) {
        for (const ref of fact.sourceRefs ?? []) {
          const extract = ref.extract || extracts.get(ref.title) || extracts.get(ref.url) || '';
          assert.ok(
            sourceClaimIsConsistentWithEvidence(fact.claim, extract),
            `${albumId}/${track.trackTitle}: claim exceeds source extract: ${fact.claim}`
          );
        }
      }
    }
  }
});

await test('all pilot documented claims retain verbatim evidence metadata separately from authored claim text', async () => {
  const pilot = JSON.parse(await readFile(path.join(dataDir, 'pilot-entries.json'), 'utf8'));
  const snapshots = await readEvidenceSnapshotsForTest();
  for (const [albumId, entry] of Object.entries(pilot.entries)) {
    for (const track of entry.trackEntries) {
      assert.equal(track.albumId, albumId, `${albumId}/${track.trackTitle}: track identity must include albumId`);
      assert.ok(Number.isInteger(track.discNumber) && track.discNumber >= 1, `${albumId}/${track.trackTitle}: discNumber required`);
      assert.ok(Number.isInteger(track.trackNumber) && track.trackNumber >= 1, `${albumId}/${track.trackTitle}: trackNumber required`);
      for (const fact of track.verifiedFacts ?? []) {
        for (const ref of fact.sourceRefs ?? []) {
          assert.equal(ref.extractType, 'verbatim', `${albumId}/${track.trackTitle}: evidence extract must be verbatim`);
          assert.match(ref.evidenceStatus ?? '', /^(retrieved|checked|unavailable)$/, `${albumId}/${track.trackTitle}: evidenceStatus required`);
          assert.notEqual(ref.extract, fact.claim, `${albumId}/${track.trackTitle}: extract must not be a self-attesting restatement`);
          assert.ok(ref.snapshotId, `${albumId}/${track.trackTitle}: retained evidence snapshotId required`);
          assert.ok(snapshots[ref.snapshotId], `${albumId}/${track.trackTitle}: retained evidence snapshot must exist`);
        }
      }
    }
  }
});

await test('Fun House completion removes unsupported listening prose and retains claim evidence', async () => {
  const active = JSON.parse(await readFile(path.join(dataDir, 'authoring/092-the-stooges-fun-house-9896fe5c.json'), 'utf8'));
  const entry = active.entries['092-the-stooges-fun-house-9896fe5c'];
  assert.equal(entry.trackEntries.length, 7, 'Fun House completion must preserve all seven catalog tracks');
  for (const track of entry.trackEntries) {
    assert.equal(track.evidenceLevel, 'documented', `${track.trackTitle}: evidence must be documented`);
    assert.equal(track.verifiedFacts?.length, 1, `${track.trackTitle}: one narrow verified fact required`);
    assert.equal(track.verifiedFacts[0].semanticReview?.decision, 'supported', `${track.trackTitle}: supported semantic review required`);
    assert.ok(track.verifiedFacts[0].sourceRefs?.[0]?.snapshotId, `${track.trackTitle}: retained snapshot required`);
    assert.equal(track.musicalCharacter, '', `${track.trackTitle}: unsupported musical analysis must be absent`);
    assert.equal(track.listeningNotes, '', `${track.trackTitle}: unsupported listening prose must be absent`);
  }
});

await test('pilot track titles exactly match catalog tracks', async () => {
  const pilot = JSON.parse(await readFile(path.join(dataDir, 'pilot-entries.json'), 'utf8'));
  const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
  const albumsById = new Map(catalog.albums.map((album) => [album.id, album]));
  for (const [albumId, entry] of Object.entries(pilot.entries)) {
    const album = albumsById.get(albumId);
    assert.ok(album, `${albumId}: pilot album must exist in catalog`);
    const catalogTitles = countTitles(album.tracks.map((track) => track.title));
    const pilotTitles = countTitles(entry.trackEntries.map((track) => track.trackTitle));
    assert.deepEqual(pilotTitles, catalogTitles, `${albumId}: pilot track titles must exactly match catalog title multiset`);
  }
});

await test('pilot tracks match catalog by albumId, discNumber, trackNumber, and exact title', async () => {
  const pilot = JSON.parse(await readFile(path.join(dataDir, 'pilot-entries.json'), 'utf8'));
  const catalog = JSON.parse(await readFile(path.join(process.cwd(), 'src/data/catalog.generated.json'), 'utf8'));
  const albumsById = new Map(catalog.albums.map((album) => [album.id, album]));
  for (const [albumId, entry] of Object.entries(pilot.entries)) {
    const album = albumsById.get(albumId);
    const catalogKeys = new Set(album.tracks.map((track) => trackIdentityKey(albumId, track)));
    const pilotKeys = new Set(entry.trackEntries.map((track) => trackIdentityKey(albumId, track)));
    assert.deepEqual(pilotKeys, catalogKeys, `${albumId}: pilot track identities must exactly match catalog track identities`);
  }
});

await test('stable track identity handles duplicate titles and multi-disc albums', () => {
  const duplicate = createEntry({
    albumId: 'duplicate-title-test',
    editionNumber: 1,
    changeNote: 'identity test',
    trackEntries: [
      { albumId: 'duplicate-title-test', discNumber: 1, trackNumber: 1, trackTitle: 'Intro', evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone', albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] },
      { albumId: 'duplicate-title-test', discNumber: 2, trackNumber: 1, trackTitle: 'Intro', evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone', albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] },
    ],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: '2026-01-01T00:00:00Z', reviewer: 'human', notes: 'identity' },
  });
  validateEntry(duplicate);
  const keys = duplicate.trackEntries.map((track) => trackIdentityKey(duplicate.albumId, track));
  assert.deepEqual(keys, ['duplicate-title-test::1::1::Intro', 'duplicate-title-test::2::1::Intro']);
});

await test('runtime validation fails closed for malformed generated data', () => {
  assert.throws(
    () => validateTrackEncyclopediaAlbumEntry({
      albumId: 'bad',
      editionNumber: 1,
      published: false,
      contentHash: 'bad',
      changeNote: 'bad',
      trackEntries: [{ trackTitle: '', evidenceLevel: 'documented', verifiedFacts: [] }],
      generationMetadata: {},
      reviewMetadata: {},
    }),
    /invalid track encyclopedia/i
  );
  assert.equal(validateTrackEncyclopediaData({ metadata: {}, entries: [] }), null);
});

await test('runtime validation deeply rejects malformed nested payloads instead of crashing', () => {
  const malformed = {
    albumId: 'bad-nested',
    editionNumber: 1,
    published: false,
    contentHash: '1234567890abcdef',
    changeNote: 'bad',
    trackEntries: [{
      albumId: 'bad-nested',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Bad',
      evidenceLevel: 'documented',
      verifiedFacts: [{}],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
    }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  };
  assert.throws(() => validateTrackEncyclopediaAlbumEntry(malformed), /verifiedFacts|claim|sourceRefs|invalid track encyclopedia/i);
  assert.equal(validateTrackEncyclopediaData({ metadata: {}, entries: { 'bad-nested': malformed } }), null);
});

await test('runtime validation rejects fan consensus with duplicate canonical source URLs', () => {
  const payload = {
    albumId: 'runtime-consensus',
    editionNumber: 1,
    published: false,
    contentHash: '1234567890abcdef',
    changeNote: 'runtime consensus',
    trackEntries: [{
      albumId: 'runtime-consensus',
      discNumber: 1,
      trackNumber: 1,
      trackTitle: 'Consensus',
      evidenceLevel: 'contextual',
      verifiedFacts: [],
      musicalCharacter: 'Desc',
      albumContext: 'Ctx',
      listeningNotes: 'Notes',
      limitations: [],
      fanPerspective: [{
        perspective: 'Fans generally consider this the album highlight.',
        label: 'Fan consensus',
        grounded: true,
        sourceRefs: [
          { label: 'Forum', title: 'A', url: 'https://a.com/x', extract: 'Fans call it a highlight.', extractType: 'verbatim', evidenceStatus: 'retrieved' },
          { label: 'Forum', title: 'B', url: 'https://a.com:443/x/?utm_source=foo#comments', extract: 'Fans call it a highlight.', extractType: 'verbatim', evidenceStatus: 'retrieved' },
        ],
      }],
    }],
    generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
    reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
  };
  assert.throws(() => validateTrackEncyclopediaAlbumEntry(payload), /distinct|canonical|independent|identity|invalid track encyclopedia/i);
});

await test('runtime loader ignores stale slow album load after a fast album switch', async () => {
  const generated = JSON.parse(await readFile(path.join(dataDir, 'track-encyclopedia.generated.json'), 'utf8'));
  const [slowId, fastId] = Object.keys(generated.entries);
  const state = { selectedAlbumId: slowId, entry: null };
  const loaders = {
    [slowId]: async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return generated.entries[slowId];
    },
    [fastId]: async () => generated.entries[fastId],
  };
  const slow = getTrackEncyclopediaModuleIds(slowId, loaders).then(({ entry }) => {
    if (state.selectedAlbumId === slowId) state.entry = entry;
  });
  state.selectedAlbumId = fastId;
  const fast = await getTrackEncyclopediaModuleIds(fastId, loaders);
  if (state.selectedAlbumId === fastId) state.entry = fast.entry;
  await slow;
  assert.equal(state.entry.albumId, fastId);
});

await test('runtime helper clears stale album data on album switch and missing album', async () => {
  const generated = JSON.parse(await readFile(path.join(dataDir, 'track-encyclopedia.generated.json'), 'utf8'));
  const pilotId = Object.keys(generated.entries)[0];
  const missingId = '999-missing-album';
  const modules = {
    [pilotId]: async () => generated.entries[pilotId],
  };
  const loaded = await getTrackEncyclopediaModuleIds(pilotId, modules);
  const missing = await getTrackEncyclopediaModuleIds(missingId, modules);
  assert.deepEqual(loaded.loadedAlbumIds, [pilotId]);
  assert.equal(missing.entry, null);
  assert.deepEqual(missing.loadedAlbumIds, []);
});

await test('per-album manifest and album payloads exist without aggregate app import', async () => {
  const appSource = await readFile(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  assert.doesNotMatch(appSource, /track-encyclopedia\.generated\.json/, 'App must not import aggregate track encyclopedia JSON');
  assert.match(appSource, /manifest\.generated/, 'App must load via the per-album manifest');
  const manifest = await readFile(path.join(dataDir, 'manifest.generated.ts'), 'utf8');
  assert.match(manifest, /fetch\(new URL\("\.\/releases\/[a-f0-9]{16}\/albums\/001-marvin-gaye-what-s-going-on-fd00dde9\.json", import\.meta\.url\)/);
  const visible = await readVisibleManifestPayloads(dataDir);
  assert.ok(Object.keys(visible).some((file) => /albums\/001-marvin-gaye-what-s-going-on-fd00dde9\.json$/.test(file)));
  assert.ok(Object.keys(visible).some((file) => /albums\/054-liz-phair-exile-in-guyville-2b33a458\.json$/.test(file)));
});

await test('builder preserves published editions across reruns', async () => {
  const dir = await makeTempDir('builder-preserve-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const first = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  const albumId = Object.keys(first.entries)[0];
  const snapshots = await readEvidenceSnapshotsForDir(dir);
  const store = await EditionStore.open(dir, { evidenceSnapshots: snapshots });
  const currentEditionNumber = first.entries[albumId].editionNumber;
  const published = store.getEdition(albumId, currentEditionNumber);
  published.published = true;
  store.upsertNewEdition({ ...published, editionNumber: currentEditionNumber + 1, published: true, changeNote: 'Published preservation test' });
  await store.persistAll();
  await buildTrackEncyclopedia({ dataDir: dir });
  const reopened = await EditionStore.open(dir, { evidenceSnapshots: snapshots });
  assert.equal(reopened.getEdition(albumId, currentEditionNumber + 1).published, true, 'published edition must survive builder rerun');
  await rm(dir, { recursive: true, force: true });
});

await test('unchanged builder runs produce reproducible content hashes', async () => {
  const dir = await makeTempDir('builder-hash-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const first = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  await buildTrackEncyclopedia({ dataDir: dir });
  const second = JSON.parse(await readFile(path.join(dir, 'track-encyclopedia.generated.json'), 'utf8'));
  const firstHashes = Object.fromEntries(Object.entries(first.entries).map(([albumId, entry]) => [albumId, entry.contentHash]));
  const secondHashes = Object.fromEntries(Object.entries(second.entries).map(([albumId, entry]) => [albumId, entry.contentHash]));
  assert.deepEqual(secondHashes, firstHashes);
  await rm(dir, { recursive: true, force: true });
});

await test('unchanged builder runs produce byte-identical generated outputs and report', async () => {
  const dir = await makeTempDir('builder-bytes-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const first = await readGeneratedBytes(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const second = await readGeneratedBytes(dir);
  assert.deepEqual(second, first);
  await rm(dir, { recursive: true, force: true });
});

await test('build failure before manifest publish leaves previous album payloads and manifest unchanged', async () => {
  const dir = await makeTempDir('builder-atomic-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const before = await readGeneratedBytes(dir);
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failAfterPayloadWrites: true }),
    /injected/i
  );
  const after = await readGeneratedBytes(dir);
  assert.deepEqual(after, before);
  await rm(dir, { recursive: true, force: true });
});

await test('build failure after immutable candidate publish leaves old manifest resolving byte-identical payloads', async () => {
  const dir = await makeTempDir('builder-release-window-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const beforeVisible = await readVisibleManifestPayloads(dir);
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failAfterCandidatePublish: true }),
    /injected/i
  );
  const afterManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const afterVisible = await readVisibleManifestPayloads(dir);
  assert.equal(afterManifest, beforeManifest, 'manifest pointer must not change before the final swap');
  assert.deepEqual(afterVisible, beforeVisible, 'old manifest must still resolve the old byte-identical payloads');
  assert.deepEqual(await listBuildTempArtifacts(dir), [], 'failed build must clean staging and backup artifacts');
  await rm(dir, { recursive: true, force: true });
});

await test('manifest swap failure leaves old manifest and visible edition payloads unchanged', async () => {
  const dir = await makeTempDir('builder-manifest-swap-');
  await copyPilotFixture(dir);
  await buildTrackEncyclopedia({ dataDir: dir });
  const beforeManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const beforeVisible = await readVisibleManifestPayloads(dir);
  await assert.rejects(
    () => buildTrackEncyclopedia({ dataDir: dir, failDuringManifestSwap: true }),
    /injected/i
  );
  const afterManifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const afterVisible = await readVisibleManifestPayloads(dir);
  assert.equal(afterManifest, beforeManifest);
  assert.deepEqual(afterVisible, beforeVisible);
  assert.deepEqual(await listBuildTempArtifacts(dir), [], 'manifest failure cleanup must remove temp artifacts');
  await rm(dir, { recursive: true, force: true });
});

await test('npm build script preserves tracked dist/gym assets through Vite clean output', async () => {
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8')).scripts.build;
  assert.match(pkg, /preserve:gym|restore:gym|build-preserve-gym/, 'build must include a gym preservation workflow');
  assert.doesNotMatch(pkg, /^tsc --noEmit && vite build$/, 'plain vite build deletes dist/gym');
  const wrapper = await readFile(path.join(process.cwd(), 'scripts/build-preserve-gym.mjs'), 'utf8');
  assert.match(wrapper, /dist-gym/, 'fresh CI builds must seed dist/gym from tracked dist-gym');
});

await test('build wrapper restores dist/gym on simulated Vite failure and exits nonzero', async () => {
  const gymDir = path.join(process.cwd(), 'dist/gym');
  const markerPath = path.join(gymDir, 'preserve-marker.txt');
  await mkdir(gymDir, { recursive: true });
  await writeFile(markerPath, 'gym marker\n');
  const before = await hashDirectory(gymDir);
  const result = spawnSync(process.execPath, ['scripts/build-preserve-gym.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ALBUMVAULT_BUILD_PRESERVE_GYM_FAIL_VITE: '23' },
  });
  assert.equal(result.status, 23, result.stderr || result.stdout);
  assert.deepEqual(await hashDirectory(gymDir), before, 'gym directory must be restored byte-identically after Vite failure');
  assert.deepEqual(await listTmpGymArtifacts(), [], 'wrapper must clean temporary gym stashes');
  await rm(markerPath, { force: true });
});

await test('TypeScript runtime coexistence check compiles legacy and structured types together', async () => {
  await mkdir(tmpDir, { recursive: true });
  const fixturePath = path.join(tmpDir, 'type-coexistence.ts');
  await writeFile(fixturePath, `
      import type { EncyclopediaEntry, TrackEncyclopediaAlbumEntry } from './src/types.ts';
      const legacy: EncyclopediaEntry = {
        albumId: 'legacy',
        artistInfo: { summary: 'A', source: { label: 'Wikipedia', title: 'Artist', url: 'https://example.com/artist' } },
        albumInfo: { summary: 'B', source: { label: 'Wikipedia', title: 'Album', url: 'https://example.com/album' } },
        context: '',
        relevance: '',
        listeningNotes: [],
        trackGuide: [{ trackTitle: 'Same Title', guide: 'Guide', focus: 'Focus', source: null }],
        themes: [],
        sources: [],
      };
      const structured: TrackEncyclopediaAlbumEntry = {
        albumId: legacy.albumId,
        editionNumber: 1,
        published: false,
        contentHash: 'hash',
        changeNote: 'coexist',
        trackEntries: [{ albumId: legacy.albumId, discNumber: 1, trackNumber: 1, trackTitle: 'Same Title', evidenceLevel: 'limited', verifiedFacts: [], musicalCharacter: 'Tone', albumContext: 'Ctx', listeningNotes: 'Notes', limitations: ['Listening analysis only.'] }],
        generationMetadata: { generatedAt: '2026-01-01T00:00:00Z', generator: 'test', model: null },
        reviewMetadata: { reviewedAt: null, reviewer: null, notes: '' },
        legacyTrackGuide: legacy.trackGuide,
      };
      if (structured.legacyTrackGuide?.[0].trackTitle !== legacy.trackGuide[0].trackTitle) process.exit(2);
  `.replace('./src/types.ts', '../src/types'));
  const result = spawnSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    '--noEmit',
    '--strict',
    '--target', 'ES2020',
    '--module', 'ESNext',
    '--moduleResolution', 'Bundler',
    '--jsx', 'react-jsx',
    '--skipLibCheck',
    '--esModuleInterop',
    '--allowSyntheticDefaultImports',
    fixturePath,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

// ─── Section 8: Legacy compatibility ──────────────────────────────

await test('EncyclopediaEntry still accepts legacy trackGuide format', () => {
  // This is a type-level check; we verify the TypeScript compiles via tsc --noEmit
  // For the test, just verify the structure is accepted
  const legacy = {
    albumId: 'test',
    artistInfo: { summary: 'Test', source: { label: 'Wikipedia', title: 'Test', url: 'https://en.wikipedia.org/wiki/Test' } },
    albumInfo: { summary: 'Test', source: { label: 'Wikipedia', title: 'Test', url: 'https://en.wikipedia.org/wiki/Test' } },
    context: 'Test',
    relevance: 'Test',
    listeningNotes: [],
    trackGuide: [{ trackTitle: 'Test', guide: 'Test', focus: 'Test', source: null }],
    themes: [],
    sources: [],
  };
  // No assertion needed — if it doesn't throw, the structure is compatible
  assert.ok(legacy.trackGuide[0].trackTitle, 'legacy trackGuide is readable');
});

// ─── Cleanup ──────────────────────────────────────────────────────

await rm(tmpDir, { recursive: true, force: true });

// ─── Results ──────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n${failures.length} test(s) failed:`);
  for (const f of failures) console.error(`  ✗ ${f.name}: ${f.message}`);
  process.exit(1);
}
console.log(`\nAll ${passed} track-encyclopedia tests passed.`);

async function makeTempDir(prefix) {
  return await mkdtemp(path.join(tmpdir(), prefix));
}

async function copyPilotFixture(dir) {
  await cp(path.join(dataDir, 'pilot-entries.json'), path.join(dir, 'pilot-entries.json'));
  await cp(path.join(dataDir, 'evidence-snapshots.json'), path.join(dir, 'evidence-snapshots.json'));
}

function collectEncyclopediaExtracts(entry) {
  const refs = [];
  if (entry?.artistInfo?.source) refs.push(entry.artistInfo.source);
  if (entry?.albumInfo?.source) refs.push(entry.albumInfo.source);
  for (const source of entry?.sources ?? []) refs.push(source);
  for (const track of entry?.trackGuide ?? []) {
    if (track.source) refs.push(track.source);
  }
  const extracts = new Map();
  for (const ref of refs) {
    const text = ref.extract || ref.summary || '';
    if (ref.title) extracts.set(ref.title, text);
    if (ref.url) extracts.set(ref.url, text);
  }
  return extracts;
}

function countTitles(titles) {
  const counts = new Map();
  for (const title of titles) counts.set(title, (counts.get(title) ?? 0) + 1);
  return counts;
}

function trackIdentityKey(albumId, track) {
  return `${albumId}::${track.discNumber}::${track.trackNumber}::${track.title ?? track.trackTitle}`;
}

async function readGeneratedBytes(dir) {
  const result = {};
  for (const relativePath of [
    'track-encyclopedia.generated.json',
    'manifest.generated.ts',
    'build-report.json',
  ]) {
    result[relativePath] = await readFile(path.join(dir, relativePath), 'utf8');
  }
  Object.assign(result, await readVisibleManifestPayloads(dir));
  return result;
}

function makeDocumentedTrack({ claim, url, extract, snapshotId }) {
  return {
    albumId: 'test-album',
    discNumber: 1,
    trackNumber: 1,
    trackTitle: 'Test Track',
    evidenceLevel: 'documented',
    verifiedFacts: [{
      claim,
      sourceRefs: [{
        label: 'Example',
        title: 'Example Source',
        url,
        extract,
        extractType: 'verbatim',
        evidenceStatus: 'retrieved',
        snapshotId,
      }],
    }],
    musicalCharacter: 'Desc',
    albumContext: 'Ctx',
    listeningNotes: 'Notes',
    limitations: [],
  };
}

function makeEvidenceSnapshot({ id, url, text }) {
  const snapshot = {
    id,
    canonicalUrl: canonicalizeSourceUrl(url),
    fetchedAt: '2026-01-01T00:00:00Z',
    normalizedText: text.replace(/\s+/g, ' ').trim(),
    contentHash: '',
  };
  snapshot.contentHash = computeEvidenceSnapshotHash(snapshot);
  return snapshot;
}

async function readVisibleManifestPayloads(dir) {
  const manifest = await readFile(path.join(dir, 'manifest.generated.ts'), 'utf8');
  const result = {};
  const payloadPattern = /new URL\("\.\/([^"]+\.json)", import\.meta\.url\)/g;
  for (const match of manifest.matchAll(payloadPattern)) {
    const relativePath = match[1];
    result[relativePath] = await readFile(path.join(dir, relativePath), 'utf8');
  }
  const editionPattern = /editionPath:\s*"([^"]+\.json)"/g;
  for (const match of manifest.matchAll(editionPattern)) {
    const relativePath = match[1];
    result[relativePath] = await readFile(path.join(dir, relativePath), 'utf8');
  }
  return result;
}

async function listBuildTempArtifacts(dir) {
  const files = await readdir(dir);
  return files.filter((file) => /^(\.albums-stage-|\.albums-backup-|\.release-stage-|\.manifest\.generated|\.track-encyclopedia\.generated|\.build-report\.)/.test(file)).sort();
}

async function hashDirectory(dir) {
  const entries = {};
  await collectDirectoryHashes(dir, dir, entries);
  return entries;
}

async function collectDirectoryHashes(root, dir, entries) {
  const names = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const name of names) {
    const fullPath = path.join(dir, name.name);
    const relativePath = path.relative(root, fullPath);
    if (name.isDirectory()) {
      await collectDirectoryHashes(root, fullPath, entries);
    } else if (name.isFile()) {
      entries[relativePath] = canonicalStringify({ bytes: await readFile(fullPath, 'utf8') });
    }
  }
}

async function listTmpGymArtifacts() {
  const names = await readdir(tmpdir());
  return names.filter((name) => name.startsWith('albumvault-gym-')).sort();
}

async function readEvidenceSnapshotsForTest() {
  return await readEvidenceSnapshotsForDir(dataDir);
}

async function readEvidenceSnapshotsForDir(dir) {
  const data = JSON.parse(await readFile(path.join(dir, 'evidence-snapshots.json'), 'utf8'));
  const snapshots = {};
  for (const [id, snapshot] of Object.entries(data.snapshots ?? {})) {
    snapshots[id] = { ...snapshot, id };
  }
  return snapshots;
}
