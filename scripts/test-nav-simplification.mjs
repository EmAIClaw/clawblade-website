import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('../src/types.ts', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Assessment #5: Simplify primary nav to Collection / Listen next / History.
// Default to Collection.  History has Listening log and Statistics subviews.
// Replace admin sidebar form with Settings dialog.  Compact sync status
// stays visible.  Random remains Listen next action.  Mobile compact nav.
// ---------------------------------------------------------------------------

// --- View type updated ------------------------------------------------

assert.match(
  typesSource,
  /View\s*=\s*[^;]*collection[^;]*listennext[^;]*history/,
  'View type must include collection, listennext, history (not dashboard/insights/log)'
);

// --- Default view is collection ---------------------------------------

assert.match(
  appSource,
  /useState<View>\("collection"\)/,
  'Default view must be "collection"'
);

// --- Primary nav: three buttons ---------------------------------------

// Collection nav button
assert.match(
  appSource,
  /view === "collection"[\s\S]*?Collection/,
  'Collection nav button must exist'
);

// Listen next nav button
assert.match(
  appSource,
  /view === "listennext"[\s\S]*?Listen next/,
  'Listen next nav button must exist'
);

// History nav button
assert.match(
  appSource,
  /view === "history"[\s\S]*?History/,
  'History nav button must exist'
);

// --- Old nav labels removed -------------------------------------------

// Dashboard, Insights, Log should NOT be primary nav labels
assert.doesNotMatch(
  appSource,
  /<Gauge[^>]*>.*Dashboard/,
  'Dashboard should not be a primary nav item'
);

assert.doesNotMatch(
  appSource,
  /<BarChart3[^>]*>.*Insights[^<]/,
  'Insights should not be a primary nav item'
);

assert.doesNotMatch(
  appSource,
  /<BookOpen[^>]*>.*Log[^<]/,
  'Log should not be a primary nav item'
);

// --- Settings dialog/expandable ---------------------------------------

assert.match(
  appSource,
  /Settings|settingsDialog|settingsOpen|showSettings/,
  'Settings dialog or expandable must exist'
);

// Settings should contain passcode/Load/Save/Spotify/import/export
assert.match(
  appSource,
  /Settings[\s\S]{0,500}passcode|passcode[\s\S]{0,500}Settings/,
  'Settings must contain passcode control'
);

assert.match(
  appSource,
  /Settings[\s\S]{0,500}loadCloud|loadCloud[\s\S]{0,500}Settings|Settings[\s\S]{0,500}saveCloud|saveCloud[\s\S]{0,500}Settings/,
  'Settings must contain Load/Save controls'
);

// --- Compact sync status visible --------------------------------------

assert.match(
  appSource,
  /syncStatusCompact|compactSync|cloudMessage/,
  'Compact sync status must remain visible'
);

// --- Random remains in Listen next ------------------------------------

assert.match(
  appSource,
  /pickRandom|randomAlbum|Random/,
  'Random action must remain (in Listen next view)'
);

// --- History has subviews: Listening log and Statistics ---------------

assert.match(
  appSource,
  /historySubView|historyView|logSubView|statisticsSubView|subView/,
  'History must have subviews (Listening log and Statistics)'
);

assert.match(
  appSource,
  /Statistics|statistics/,
  'History must have a Statistics subview'
);

assert.match(
  appSource,
  /Listening log|listeningLog|ListeningLog/,
  'History must have a Listening log subview'
);

// --- Duplicate all sessions listing removed ---------------------------

// The Insights component had an "All sessions" section that duplicated
// the ListeningLog.  This should be removed.
assert.doesNotMatch(
  appSource,
  /<h3>All sessions<\/h3>/,
  'Duplicate "All sessions" listing should be removed from Insights'
);

// --- Mobile compact nav -----------------------------------------------

assert.match(
  stylesSource,
  /@media[^{]*{[\s\S]*\.sidebar/,
  'CSS must have mobile/compact nav rules'
);

// --- No giant sync block above content --------------------------------

// The sync panel should not be a large block above the main content
// It should be compact or in Settings
assert.match(
  stylesSource,
  /syncStatusCompact|compactSync|syncBar/,
  'CSS should have compact sync status styling'
);

console.log('nav-simplification tests passed');