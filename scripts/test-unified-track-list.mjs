import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Assessment #3: Unify legacy playable track list and structured track
// research into ONE playable list in Listen.  Each row shows
// title/duration/play/short note, with expandable documented facts/evidence.
// About tab retains source/trust info without rendering a second track list.
// ---------------------------------------------------------------------------

// --- Reusable structured per-track content component -------------------

assert.match(
  appSource,
  /function TrackResearchContent\b/,
  'A reusable TrackResearchContent component must be extracted from the research renderer'
);

// The component must accept a TrackEncyclopediaEntry (the per-track entry)
assert.match(
  appSource,
  /TrackResearchContent[\s\S]*?track:\s*TrackEncyclopediaEntry/,
  'TrackResearchContent must accept a track (TrackEncyclopediaEntry) prop'
);

// --- Track identity matching: disc/track/title -------------------------
assert.ok(appSource.includes('${track.albumId}:${track.discNumber}'), 'research map key must include the album identity');
assert.ok(appSource.includes('${album.id}:${track.discNumber}'), 'lookup key must include the selected album identity');

// The Listen tab must match encyclopedia entries by exact disc/track/title
assert.match(
  appSource,
  /trackEncyclopediaByDiscTrack|encyclopediaTrackMap|trackResearchMap/,
  'A map from disc/track identity to encyclopedia entry must be built for matching'
);

// The match must use discNumber, trackNumber, and trackTitle
assert.match(
  appSource,
  /discNumber.*trackNumber.*trackTitle|trackKey.*disc.*track.*title/,
  'Track matching must use discNumber, trackNumber, and trackTitle for exact identity'
);

// --- Listen tab: expandable research in track rows ---------------------

// Each track row in the Listen tab should have an expandable section for
// documented facts/evidence when research is available
assert.match(
  appSource,
  /trackResearchExpand|trackResearch.*details|expandableResearch/i,
  'Track rows in Listen should have an expandable research section'
);

// The expandable section should use <details> or a toggle state
assert.match(
  appSource,
  /<details[^>]*className="[^"]*trackResearch/,
  'Expandable research should use <details> or equivalent toggle pattern'
);

// --- About tab: no second track list, but trust/evidence stays ---------

// The About tab should NOT render TrackEncyclopediaPanel (the full second
// track list).  Instead, trust/evidence info should be accessible without
// rendering every track entry again.
assert.doesNotMatch(
  appSource,
  /albumResearchDetails[\s\S]{0,300}TrackEncyclopediaPanel/,
  'About tab should not render the full TrackEncyclopediaPanel (second track list) inside albumResearchDetails'
);

// TrustPanel or equivalent evidence summary should remain in About
assert.match(
  appSource,
  /TrustPanel|evidenceSummary|trustPanel/,
  'Trust/evidence panel should remain accessible in About tab'
);

// --- Versioned state takes precedence ----------------------------------

// The versioned encyclopedia entry (documented/insufficient-evidence)
// should take precedence over the editorial fallback guide text
assert.match(
  appSource,
  /evidenceLevel|evidence.*precedence|documented.*insufficient/,
  'Versioned documented/insufficient-evidence state must take precedence in rendering'
);

// --- Editorial fallback clearly labelled -------------------------------

assert.match(
  appSource,
  /editorial|not.*verified|editorial fallback/i,
  'Editorial fallback content must be clearly labelled when versioned research is unavailable'
);

// --- Source/trust info accessible without second track list -----------

// The SourceRefView component should be reused inside TrackResearchContent
assert.match(
  appSource,
  /TrackResearchContent[\s\S]*SourceRefView/,
  'SourceRefView should be reused inside TrackResearchContent for source links'
);

console.log('unified-track-list tests passed');