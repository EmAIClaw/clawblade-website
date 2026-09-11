import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Assessment #2: AlbumDetail restructured into accessible Listen / About /
// My copy tabs. These structural source checks guard the tab wiring.
// Real interaction coverage lives in test-album-detail-tabs-browser.mjs.
// ---------------------------------------------------------------------------

// --- Tab structure: three tabs with correct ARIA roles and ids ----------

assert.match(
  appSource,
  /role="tablist"/,
  'AlbumDetail must contain a role="tablist" container'
);

assert.match(
  appSource,
  /role="tab"\s+[^>]*aria-selected/,
  'each tab must use role="tab" with aria-selected'
);

assert.match(
  appSource,
  /role="tabpanel"/,
  'tab panels must use role="tabpanel"'
);

// Each tab must reference its controlling tab via aria-labelledby
assert.match(
  appSource,
  /role="tabpanel"[^>]*aria-labelledby=/,
  'each tabpanel must have aria-labelledby pointing to its tab'
);

// Tabs must reference their panels via aria-controls
assert.match(
  appSource,
  /role="tab"[^>]*aria-controls=/,
  'each tab must have aria-controls pointing to its panel'
);

// The three expected tab labels
assert.match(
  appSource,
  /id=.\{?`?album-tab-/,
  'tab ids should be scoped to the album (e.g. album-tab-${album.id})'
);

assert.match(
  appSource,
  /album-tab-listen/,
  'a "listen" tab must exist'
);

assert.match(
  appSource,
  /album-tab-about/,
  'an "about" tab must exist'
);

assert.match(
  appSource,
  /album-tab-mycopy/,
  'a "mycopy" tab must exist'
);

assert.match(
  appSource,
  /album-tabpanel-listen/,
  'a "listen" tabpanel must exist'
);

assert.match(
  appSource,
  /album-tabpanel-about/,
  'an "about" tabpanel must exist'
);

assert.match(
  appSource,
  /album-tabpanel-mycopy/,
  'a "mycopy" tabpanel must exist'
);

// --- Tab keyboard: roving arrows + Home/End -----------------------------

assert.match(
  appSource,
  /ArrowRight|event\.key\s*===?\s*"ArrowRight"/,
  'ArrowRight must move focus to the next tab'
);

assert.match(
  appSource,
  /ArrowLeft|event\.key\s*===?\s*"ArrowLeft"/,
  'ArrowLeft must move focus to the previous tab'
);

assert.match(
  appSource,
  /Home|event\.key\s*===?\s*"Home"/,
  'Home must move focus to the first tab'
);

assert.match(
  appSource,
  /End|event\.key\s*===?\s*"End"/,
  'End must move focus to the last tab'
);

// --- Tab state management -----------------------------------------------

// Active tab stored as state, defaults to "listen"
assert.match(
  appSource,
  /useState.*["']listen["']/,
  'active tab state must default to "listen"'
);

// Switching to Listen when starting a session
assert.match(
  appSource,
  /startSession[\s\S]*?setActiveTab\(["']listen["']\)/,
  'startSession must switch to the Listen tab'
);

// Resetting tab when album changes
assert.match(
  appSource,
  /useEffect[\s\S]*?album\.id[\s\S]*?setActiveTab\(["']listen["']\)/,
  'active tab must reset to "listen" when album.id changes'
);

// --- Content preservation: all existing sections still present ----------

// Listen tab: compact album hero + playable track list + session controls
assert.match(
  appSource,
  /albumHeroCompact/,
  'a compact album hero class must exist for the Listen tab'
);

assert.match(
  appSource,
  /className="trackList"/,
  'the playable track list must still be rendered'
);

assert.match(
  appSource,
  /Start listening session/,
  'the start session button must still exist'
);

// About tab: encyclopedia, discovery, track encyclopedia
assert.match(
  appSource,
  /encyclopediaPanel/,
  'the encyclopedia panel must still exist (in About tab)'
);

assert.match(
  appSource,
  /discoveryPanel/,
  'the discovery panel must still exist (in About tab)'
);

assert.match(
  appSource,
  /trackEncyclopediaPanel/,
  'the track encyclopedia panel must still exist (in About tab)'
);

// About tab: collapsed details for long sections
assert.match(
  appSource,
  /<details[\s\S]*?encyclopediaPanel|<details[\s\S]*?referenceGrid|<details[\s\S]*?artistInfo|<details[\s\S]*?albumInfo/,
  'long encyclopedia sections should use collapsed <details> elements'
);

// My copy tab: collector fields with ownership gate
assert.match(
  appSource,
  /collectorInspector/,
  'the collector inspector must still exist (in My copy tab)'
);

assert.match(
  appSource,
  /collectorInspectorUnavailable/,
  'the ownership-gated unavailable state must still exist'
);

// --- Avoid unmounting AlbumDetail for tabs ------------------------------
// The tab panels should use CSS to hide, not conditional rendering that
// unmounts content.  We verify panels are always rendered with aria-hidden
// (the CSS targets [aria-hidden="true"] with display:none).
assert.match(
  appSource,
  /className="albumDetailTabPanel"[\s\S]{0,60}aria-hidden=/,
  'inactive tab panels should use aria-hidden + CSS display rule, not unmounting'
);

// --- CSS: tab styling + compact hero scoped to album --------------------

assert.match(
  stylesSource,
  /\.albumDetailTabs\b/,
  'CSS must have .albumDetailTabs class for the tablist'
);

assert.match(
  stylesSource,
  /\.albumDetailTab\b/,
  'CSS must have .albumDetailTab class for individual tabs'
);

assert.match(
  stylesSource,
  /\.albumDetailTabPanel\b/,
  'CSS must have .albumDetailTabPanel class for tab panels'
);

assert.match(
  stylesSource,
  /\.albumDetailTabPanel\[aria-hidden="true"\]/,
  'CSS must hide inactive panels via [aria-hidden="true"] selector'
);

assert.match(
  stylesSource,
  /display:\s*none/,
  'CSS must use display:none to genuinely hide inactive panels'
);

assert.match(
  stylesSource,
  /\.albumHeroCompact\b/,
  'CSS must have .albumHeroCompact class for the compact hero'
);

// Compact hero should be scoped to album (not affect other heroes)
assert.match(
  stylesSource,
  /\.albumHeroCompact[\s\S]*?grid-template-columns/,
  'compact hero should define its own grid layout'
);

// Compact hero responsive: should work at narrow widths
assert.match(
  stylesSource,
  /\.albumHeroCompact[\s\S]*?(?:max-width|@media)/,
  'compact hero should have responsive rules for narrow widths'
);

// --- Session/notes retention across tab switches -------------------------
// Session state (sessionActive, sessionNotes, checkedTracks) must be
// at the AlbumDetail level, not inside individual tab panels, so they
// persist when switching tabs.  We verify these are declared before
// the tab rendering.

assert.match(
  appSource,
  /const \[sessionActive[^\n]*\n[\s\S]*?const \[listeningMode[^\n]*\n[\s\S]*?const \[sessionNotes/,
  'session state must be declared at AlbumDetail level, not inside tab panels'
);

console.log('album-detail-tabs tests passed');