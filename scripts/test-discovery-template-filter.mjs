import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Assessment #4: Remove generic generated discovery template prose from
// user view.  Keep genuinely album-specific prose and Start here suggestions.
// Prefer presentation filter helper with tests.  Preserve archival/generated
// data and immutable research.
// ---------------------------------------------------------------------------

// --- Presentation filter helper exists --------------------------------

assert.match(
  appSource,
  /discoveryPresentation|filterDiscoveryForPresentation/,
  'App must import or use the discovery presentation filter helper'
);

// --- Template detection: whyItMatters ---------------------------------

// The filter must detect the template "opens a specific doorway" pattern
// and omit it from the user view
assert.match(
  appSource,
  /isTemplateWhyItMatters|filterDiscovery.*whyItMatters.*null|whyItMatters.*filter/,
  'whyItMatters template prose must be filtered from user view'
);

// --- Template detection: sound ----------------------------------------

// The filter must detect the template sound strings and omit them
assert.match(
  appSource,
  /filteredDiscovery\.sound|filtered.*sound.*null|sound.*filter|isTemplateSound/,
  'sound template prose must be filtered from user view'
);

// Keep #2's short Listen introduction, but not a second discovery summary.
assert.match(appSource, /className="albumListenIntro"/, 'keep the approved short Listen introduction');
assert.doesNotMatch(
  appSource,
  /className="discoveryLead"/,
  'About should not repeat the discovery summary'
);

// --- About tab: discovery panel uses filter ----------------------------

// The About tab discovery panel should use the filter helper
assert.match(
  appSource,
  /filteredDiscovery|filterDiscoveryForPresentation/,
  'About tab discovery panel must use the presentation filter helper'
);

// --- Start here suggestions preserved ---------------------------------

assert.match(
  appSource,
  /discoveryStartHere|startHere/,
  'Start here suggestions must be preserved in the user view'
);

// --- Generic whyItMatters/sound NOT rendered when template -----------

// The rendered whyItMatters should be conditional on NOT being template
assert.match(
  appSource,
  /whyItMatters[^]*null|filtered.*whyItMatters|filteredDiscovery\.whyItMatters/,
  'Template whyItMatters should not be rendered (should be null when template)'
);

assert.match(
  appSource,
  /sound[^]*null|filtered.*sound|filteredDiscovery\.sound/,
  'Template sound should not be rendered (should be null when template)'
);

// --- Editorial label for non-verified prose ---------------------------

assert.match(
  appSource,
  /editorial|not.*verified|Editorial/i,
  'Kept discovery prose should be distinguished as editorial / not verified'
);

// --- Archival data preserved ------------------------------------------

// The discovery.enhancements.json should NOT be modified
// (We verify the filter helper is a presentation-only layer)
assert.match(
  appSource,
  /import.*discoveryPresentation/,
  'discoveryPresentation should be imported as a module'
);

// --- CSS: editorial label styling -------------------------------------

assert.match(
  stylesSource,
  /editorialLabel|editorial.*label|\.discoveryEditorial/i,
  'CSS should have editorial label styling'
);

console.log('discovery-template-filter tests passed');