import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

assert.match(
  appSource,
  /type CloudOperation = "load" \| "save";/,
  'cloud sync should track the exact in-flight operation'
);
assert.match(
  appSource,
  /setCloudMessage\(operation === "load" \? "Loading cloud vault…" : "Saving vault to cloud…"\)/,
  'cloud load and save should announce calm, operation-specific progress'
);
assert.match(
  appSource,
  /className=\{`cloudStatus \$\{cloudStatus\}`\}[\s\S]{0,160}aria-live="polite"[\s\S]{0,120}aria-atomic="true"/,
  'cloud sync feedback should use one polite, atomic live region'
);
assert.doesNotMatch(
  appSource,
  /className=\{`cloudStatus[^\n]+role="alert"/,
  'cloud sync feedback should not interrupt with an alert region'
);
assert.match(
  appSource,
  /onClick=\{loadCloud\}[\s\S]{0,120}disabled=\{cloudOperation !== null\}/,
  'cloud load should be disabled while cloud work is in flight'
);
assert.match(
  appSource,
  /onClick=\{\(\) => saveCloud\(\)\}[\s\S]{0,120}disabled=\{cloudOperation !== null\}/,
  'cloud save should be disabled while cloud work is in flight'
);
assert.match(
  appSource,
  /lastFailedCloudOperation[\s\S]*retryCloudOperation[\s\S]*lastFailedCloudOperation === "load"[\s\S]*loadCloud\(\)[\s\S]*saveCloud\(\)/,
  'recovery should retry the same failed cloud operation'
);
assert.match(
  appSource,
  /Retry cloud \{lastFailedCloudOperation\}/,
  'the recovery action should name the operation it retries'
);
assert.match(
  appSource,
  /Cloud load failed[\s\S]{0,180}local vault is unchanged/,
  'failed cloud loads should explicitly confirm that local data was preserved'
);
assert.match(
  appSource,
  /Cloud save failed[\s\S]{0,220}local vault remains safely stored on this device/,
  'failed cloud saves should explicitly confirm that local data was preserved'
);

assert.doesNotMatch(
  appSource,
  /Searching Spotify…/,
  'Spotify lookup should not collapse to a text-only searching message'
);
assert.match(
  appSource,
  /className="spotifyLookupSlot"[\s\S]{0,500}spotifyLoading[\s\S]{0,500}className="spotifyLookupSkeleton"/,
  'Spotify lookup should retain a stable slot with an understated skeleton'
);
assert.match(
  stylesSource,
  /\.spotifyLookupSlot\s*\{[\s\S]*min-height:/,
  'the Spotify lookup slot should reserve space while results load'
);
assert.match(
  stylesSource,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.spotifyLookupSkeleton/,
  'the Spotify skeleton should respect reduced-motion preferences'
);
assert.match(
  appSource,
  /spotifyLookupSequence[\s\S]*\+\+spotifyLookupSequence\.current[\s\S]*lookupSequence !== spotifyLookupSequence\.current/,
  'stale Spotify responses should not overwrite the currently selected album lookup'
);

console.log('loading and recovery tests passed');
