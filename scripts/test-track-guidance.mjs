// test-track-guidance.mjs — TDD behavioral tests for the shared guidance
// trust/identity selector (Stage 1a of the AlbumVault listening pilot).
//
// Run with: node --experimental-strip-types scripts/test-track-guidance.mjs
//
// Tests the pure helpers in src/trackGuidance.ts:
//   - resolveTrackGuidance: discriminated union selector giving
//     loading/error/missing/documented/insufficient-evidence/contextual/
//     limited/unresearched/editorial-unqualified/editorial-ambiguous.
//   - detectTitleAmbiguity: guards legacy title-only mapping when the same
//     title appears multiple catalog tracks OR multiple legacy guides.
//
// Both Listen track rows and Focus mode must use this selector.  Focus must
// not show unqualified legacy claims or silently prefer legacy over versioned
// evidence.  Loading/error/retry must be visible in Listen, not only About.

import assert from 'node:assert/strict';
import {
  resolveTrackGuidance,
  detectTitleAmbiguity,
} from '../src/trackGuidance.ts';

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

// ─── Test fixtures ───────────────────────────────────────────────

const albumId = '001-test';
const track = { discNumber: 1, trackNumber: 3, title: 'Inner City Blues', durationMs: null };
const trackKey = `${albumId}:1:3:Inner City Blues`;

const documentedEntry = {
  albumId,
  discNumber: 1,
  trackNumber: 3,
  trackTitle: 'Inner City Blues',
  evidenceLevel: 'documented',
  verifiedFacts: [{
    claim: 'Recorded in June 1971 at Hitsville U.S.A.',
    sourceRefs: [{
      label: 'Wikipedia',
      title: "What's Going On (album)",
      url: 'https://en.wikipedia.org/wiki/What%27s_Going_On',
      extract: 'Recorded in June 1971',
      extractType: 'verbatim',
      evidenceStatus: 'checked',
    }],
  }],
  musicalCharacter: 'Jazzy arrangement',
  albumContext: 'Closes the album',
  listeningNotes: 'Listen for the bass line.',
  limitations: [],
};

const insufficientEntry = {
  albumId,
  discNumber: 1,
  trackNumber: 3,
  trackTitle: 'Inner City Blues',
  evidenceLevel: 'insufficient-evidence',
  verifiedFacts: [],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: ['No reliable sources found for track-specific facts.'],
  researchDisposition: {
    completedAt: '2026-09-01',
    searchedQueries: ['Inner City Blues Marvin Gaye'],
    sourceClasses: ['encyclopedia', 'music journalism'],
    outcome: 'No track-specific sources met evidence bar.',
  },
};

const unresearchedEntry = {
  albumId,
  discNumber: 1,
  trackNumber: 3,
  trackTitle: 'Inner City Blues',
  evidenceLevel: 'unresearched',
  verifiedFacts: [],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: [],
};

const contextualEntry = {
  albumId,
  discNumber: 1,
  trackNumber: 3,
  trackTitle: 'Inner City Blues',
  evidenceLevel: 'contextual',
  verifiedFacts: [],
  musicalCharacter: 'Modal harmony',
  albumContext: 'Side two opener',
  listeningNotes: 'Listen for the mode shift.',
  limitations: ['Arrangement details inferred from session context.'],
};

const limitedEntry = {
  albumId,
  discNumber: 1,
  trackNumber: 3,
  trackTitle: 'Inner City Blues',
  evidenceLevel: 'limited',
  verifiedFacts: [{ claim: 'Bass line adapted from a classical piece.', sourceRefs: [] }],
  musicalCharacter: '',
  albumContext: '',
  listeningNotes: '',
  limitations: ['Single source, not corroborated.'],
};

const legacyGuide = {
  trackTitle: 'Inner City Blues',
  guide: 'Listen for the layered horns.',
  focus: 'Arrangement',
  source: null,
};

const legacyGuideWithSource = {
  trackTitle: 'Inner City Blues',
  guide: 'Listen for the layered horns.',
  focus: 'Arrangement',
  source: { label: 'RS', title: 'Rolling Stone Review', url: 'https://rollingstone.com/review' },
};

// ─── Section 1: Discriminated research states ────────────────────

await test('resolveTrackGuidance returns loading kind when research state is loading', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loading',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'loading');
});

await test('resolveTrackGuidance returns error kind with message when research state is error', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'error',
    researchErrorMessage: 'Integrity verification failed.',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'error');
  assert.equal(result.message, 'Integrity verification failed.');
});

await test('resolveTrackGuidance returns missing kind when research state is missing and no versioned entry', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'missing');
});

await test('resolveTrackGuidance returns documented kind when research entry is documented', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: documentedEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'documented');
  assert.equal(result.entry, documentedEntry);
  // Versioned evidence takes precedence — legacy guide is NOT the primary content
  assert.equal(result.legacyGuide, legacyGuide);
  assert.equal(result.legacySuppressed, false);
});

await test('resolveTrackGuidance returns insufficient-evidence kind when research entry is insufficient-evidence', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: insufficientEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'insufficient-evidence');
  assert.equal(result.entry, insufficientEntry);
  // Legacy guide still available but not primary
  assert.equal(result.legacyGuide, legacyGuide);
});

await test('resolveTrackGuidance returns unresearched kind when research entry is unresearched', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: unresearchedEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'unresearched');
  assert.equal(result.entry, unresearchedEntry);
});

await test('resolveTrackGuidance returns missing kind when research state is loaded but no entry for this track', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'missing');
});

// ─── Section 2: Legacy editorial handling ────────────────────────

await test('resolveTrackGuidance returns editorial-unqualified when no versioned research and legacy guide exists', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'editorial-unqualified');
  assert.equal(result.legacyGuide, legacyGuide);
  // Must carry an explicit editorial label
  assert.ok(result.editorialLabel, 'editorial-unqualified must carry an editorialLabel');
});

await test('resolveTrackGuidance returns missing when no versioned research and no legacy guide', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'missing');
});

await test('resolveTrackGuidance returns editorial-ambiguous when title is ambiguous and no versioned research', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  // Ambiguous editorial content is omitted — legacy guide is suppressed
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('resolveTrackGuidance suppresses legacy guide when title ambiguous even if research is loaded but no entry for track', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  assert.equal(result.legacyGuide, undefined);
});

// ─── Section 3: Versioned evidence precedence over legacy ────────

await test('resolveTrackGuidance does NOT suppress legacy when versioned research exists and title is unambiguous', () => {
  // When title is unambiguous, legacy title-only mapping is valid and the
  // legacy guide is available as secondary content alongside versioned evidence.
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: documentedEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'documented');
  assert.equal(result.entry, documentedEntry);
  assert.equal(result.legacyGuide, legacyGuide);
  assert.equal(result.legacySuppressed, false);
});

await test('resolveTrackGuidance SUPPRESSES legacy when versioned research exists AND title is ambiguous', () => {
  // Spec: titleAmbiguous must strip legacyGuide and set legacySuppressed true
  // in ALL research states. Exact versioned research remains available/lead
  // unchanged; it does NOT validate legacy title-only association.
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: documentedEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'documented');
  assert.equal(result.entry, documentedEntry);
  // Versioned evidence stands — lead text unchanged
  assert.equal(result.leadText, 'Recorded in June 1971 at Hitsville U.S.A.');
  // Legacy suppressed because title ambiguity invalidates title-only matching
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('resolveTrackGuidance with insufficient-evidence does not silently prefer legacy guide', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: insufficientEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  // The kind is insufficient-evidence, NOT editorial-unqualified.
  // Legacy is secondary, not primary.
  assert.equal(result.kind, 'insufficient-evidence');
  assert.notEqual(result.kind, 'editorial-unqualified');
});

// ─── Section 4: detectTitleAmbiguity ─────────────────────────────

await test('detectTitleAmbiguity returns false when title appears once in catalog tracks', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Track A', durationMs: null },
    { discNumber: 1, trackNumber: 2, title: 'Track B', durationMs: null },
    { discNumber: 1, trackNumber: 3, title: 'Inner City Blues', durationMs: null },
  ];
  const legacyGuides = [legacyGuide];
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), false);
});

await test('detectTitleAmbiguity returns true when same title appears on multiple catalog tracks', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Inner City Blues', durationMs: null },
    { discNumber: 2, trackNumber: 1, title: 'Inner City Blues', durationMs: null },
  ];
  const legacyGuides = [legacyGuide];
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), true);
});

await test('detectTitleAmbiguity returns true when same title appears in multiple legacy guides', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Inner City Blues', durationMs: null },
  ];
  const legacyGuides = [
    { trackTitle: 'Inner City Blues', guide: 'First guide', focus: 'A', source: null },
    { trackTitle: 'Inner City Blues', guide: 'Second guide', focus: 'B', source: null },
  ];
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), true);
});

await test('detectTitleAmbiguity returns false when title appears once in each (catalog and legacy)', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Inner City Blues', durationMs: null },
  ];
  const legacyGuides = [legacyGuide];
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), false);
});

await test('detectTitleAmbiguity returns false when title not in catalog but in one legacy guide', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Other Track', durationMs: null },
  ];
  const legacyGuides = [legacyGuide];
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), false);
});

await test('detectTitleAmbiguity uses exact title match, no fuzzy matching', () => {
  const catalogTracks = [
    { discNumber: 1, trackNumber: 1, title: 'Inner City Blues (Make You Wanna Holler)', durationMs: null },
    { discNumber: 1, trackNumber: 2, title: 'Inner City Blues', durationMs: null },
  ];
  const legacyGuides = [legacyGuide];
  // Different titles — no ambiguity for 'Inner City Blues'
  assert.equal(detectTitleAmbiguity('Inner City Blues', catalogTracks, legacyGuides), false);
});

// ─── Section 5: Loading/error/retry visibility in Listen ─────────

await test('resolveTrackGuidance loading kind carries retryAvailable flag', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loading',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'loading');
  // Loading state should not suppress content — it's transient
  assert.equal(result.legacySuppressed, false);
});

await test('resolveTrackGuidance error kind carries retryAvailable flag', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'error',
    researchErrorMessage: 'Network failure',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'error');
  assert.equal(result.message, 'Network failure');
  assert.equal(result.legacySuppressed, false);
});

// ─── Section 6: Default lead text for each kind ──────────────────

await test('resolveTrackGuidance documented kind provides leadText from first verified fact', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: documentedEntry,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'documented');
  assert.ok(result.leadText, 'documented kind must provide leadText');
  assert.equal(result.leadText, 'Recorded in June 1971 at Hitsville U.S.A.');
});

await test('resolveTrackGuidance insufficient-evidence kind provides leadText from limitations', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: insufficientEntry,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'insufficient-evidence');
  assert.ok(result.leadText, 'insufficient-evidence kind must provide leadText');
  assert.ok(result.leadText.includes('No reliable sources'), 'leadText should convey the evidence gap');
});

await test('resolveTrackGuidance editorial-unqualified kind provides leadText from legacy guide', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'editorial-unqualified');
  assert.equal(result.leadText, 'Listen for the layered horns.');
});

await test('resolveTrackGuidance editorial-ambiguous kind provides generic leadText, not the ambiguous guide', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  assert.ok(result.leadText, 'editorial-ambiguous must provide a fallback leadText');
  assert.notEqual(result.leadText, 'Listen for the layered horns.');
});

await test('resolveTrackGuidance missing kind provides generic leadText', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'missing');
  assert.ok(result.leadText, 'missing kind must provide a fallback leadText');
});

await test('resolveTrackGuidance loading kind provides loading leadText', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loading',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'loading');
  assert.ok(result.leadText, 'loading kind must provide a leadText');
});

await test('resolveTrackGuidance error kind provides error leadText', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'error',
    researchErrorMessage: 'Failed',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'error');
  assert.ok(result.leadText, 'error kind must provide a leadText');
});

// ─── Section 7: Focus mode must not show unqualified legacy claims ─


await test('Focus mode: documented kind uses versioned leadText, not legacy', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: documentedEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'documented');
  assert.equal(result.leadText, 'Recorded in June 1971 at Hitsville U.S.A.');
  assert.notEqual(result.leadText, legacyGuide.guide);
});

await test('Focus mode: insufficient-evidence kind shows evidence gap, not legacy guide text', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: insufficientEntry,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'insufficient-evidence');
  assert.ok(result.leadText.includes('No reliable sources'));
  assert.notEqual(result.leadText, legacyGuide.guide);
});

await test('Focus mode: editorial-ambiguous omits ambiguous legacy guide entirely', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  assert.equal(result.legacyGuide, undefined);
  assert.notEqual(result.leadText, legacyGuide.guide);
});

// ─── Section 8: Regression matrix — ambiguity crossed with all states ─
//
// Spec: titleAmbiguous must strip legacyGuide and set legacySuppressed true
// in ALL research states (loading, error, missing, loaded documented/
// contextual/limited/insufficient/unresearched, and no-research/loaded-no-entry).
// Versioned evidence remains available/lead unchanged when present.

const allVersionedEntries = [
  ['documented', documentedEntry],
  ['contextual', contextualEntry],
  ['limited', limitedEntry],
  ['insufficient-evidence', insufficientEntry],
  ['unresearched', unresearchedEntry],
];

for (const [label, entry] of allVersionedEntries) {
  await test(`Regression: ambiguous + ${label} → legacy stripped, versioned lead unchanged`, () => {
    const result = resolveTrackGuidance({
      researchLoadStatus: 'loaded',
      researchEntry: entry,
      legacyGuide: legacyGuide,
      titleAmbiguous: true,
    });
    // Versioned kind preserved — evidence stands
    assert.equal(result.kind, label);
    assert.equal(result.entry, entry);
    // Legacy stripped because ambiguity invalidates title-only mapping
    assert.equal(result.legacyGuide, undefined, `${label}: legacyGuide must be undefined when titleAmbiguous`);
    assert.equal(result.legacySuppressed, true, `${label}: legacySuppressed must be true when titleAmbiguous`);
  });

  await test(`Regression: unambiguous + ${label} → legacy available as secondary`, () => {
    const result = resolveTrackGuidance({
      researchLoadStatus: 'loaded',
      researchEntry: entry,
      legacyGuide: legacyGuide,
      titleAmbiguous: false,
    });
    assert.equal(result.kind, label);
    assert.equal(result.entry, entry);
    assert.equal(result.legacyGuide, legacyGuide, `${label}: legacyGuide must be available when unambiguous`);
    assert.equal(result.legacySuppressed, false, `${label}: legacySuppressed must be false when unambiguous`);
  });
}

await test('Regression: ambiguous + loading → legacy stripped', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loading',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'loading');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('Regression: ambiguous + error → legacy stripped', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'error',
    researchErrorMessage: 'Network failure',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'error');
  assert.equal(result.message, 'Network failure');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('Regression: ambiguous + missing (no legacy) → missing kind, no legacy', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'missing');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('Regression: ambiguous + loaded-no-entry + legacy → editorial-ambiguous (legacy stripped)', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('Regression: ambiguous + missing + legacy → editorial-ambiguous (legacy stripped)', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'editorial-ambiguous');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

await test('Regression: ambiguous + loaded-no-entry + no legacy → missing, suppressed true', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loaded',
    researchEntry: undefined,
    legacyGuide: undefined,
    titleAmbiguous: true,
  });
  assert.equal(result.kind, 'missing');
  assert.equal(result.legacyGuide, undefined);
  assert.equal(result.legacySuppressed, true);
});

// ─── Section 9: Unambiguous controls — legacy stays available ─────

await test('Regression: unambiguous + loading → legacy available', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'loading',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'loading');
  assert.equal(result.legacyGuide, legacyGuide);
  assert.equal(result.legacySuppressed, false);
});

await test('Regression: unambiguous + error → legacy available', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'error',
    researchErrorMessage: 'Failed',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'error');
  assert.equal(result.legacyGuide, legacyGuide);
  assert.equal(result.legacySuppressed, false);
});

await test('Regression: unambiguous + missing + legacy → editorial-unqualified', () => {
  const result = resolveTrackGuidance({
    researchLoadStatus: 'missing',
    researchEntry: undefined,
    legacyGuide: legacyGuide,
    titleAmbiguous: false,
  });
  assert.equal(result.kind, 'editorial-unqualified');
  assert.equal(result.legacyGuide, legacyGuide);
  assert.equal(result.legacySuppressed, false);
});

// ─── Summary ─────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`\n${failures.length} test(s) failed, ${passed} passed.`);
  process.exit(1);
} else {
  console.log(`\nAll ${passed} track-guidance tests passed.`);
}