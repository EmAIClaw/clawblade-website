import assert from 'node:assert/strict';
import { isTemplateWhyItMatters, isTemplateSound, isTemplateListenFor, filterDiscoveryForPresentation } from '../src/discoveryPresentation.ts';

// --- isTemplateWhyItMatters ---

const templateWM = "What's Going On matters here because it opens a specific doorway into Marvin Gaye's sound, era, and influence. Its rank at #1 makes it a strong discovery candidate, but the real value is hearing how the songs work as a sequence.";
const curatedWM = "Purple Rain made Prince a global pop figure without sanding down his eccentricity.";

assert.ok(isTemplateWhyItMatters(templateWM), 'template whyItMatters must be detected');
assert.ok(!isTemplateWhyItMatters(curatedWM), 'curated whyItMatters must NOT be detected as template');
assert.ok(!isTemplateWhyItMatters(''), 'empty string is not template');

// --- isTemplateSound ---

const templateSound = "The album's force comes through guitar texture, rhythm-section pressure, vocal attitude, and the way loudness or restraint shapes momentum.";
const curatedSound = "Huge gated drums, neon keyboards, tight funk rhythm guitar, and explosive lead guitar.";

assert.ok(isTemplateSound(templateSound), 'template sound must be detected');
assert.ok(!isTemplateSound(curatedSound), 'curated sound must NOT be detected as template');
assert.ok(!isTemplateSound(''), 'empty string is not template');

// --- isTemplateListenFor ---

assert.ok(!isTemplateListenFor(['item1', 'item2']), 'unknown notes are not classified as templates');
assert.ok(isTemplateListenFor([templateSound]), 'known generic sound reused as a note is a template');

// --- filterDiscoveryForPresentation: template entry ---

const templateDiscovery = {
  artistContext: "Marvin Pentz Gaye Jr. was an American R&B and soul singer.",
  summary: "What's Going On is the eleventh studio album by the American soul singer Marvin Gaye.",
  whyItMatters: templateWM,
  sound: templateSound,
  startHere: [
    { trackTitle: "What's Going On", note: "Gaye co-wrote it with Al Cleveland and Obie Benson." }
  ],
  listenFor: ["Listen for the layered vocal arrangements.", "Notice how songs flow seamlessly."],
  ifYouLike: ["Aretha Franklin's I Never Loved a Man", "Stevie Wonder's Talking Book"],
  discoveryTags: ["R&B/Soul", "Social Consciousness"]
};

const filtered = filterDiscoveryForPresentation(templateDiscovery);

assert.equal(filtered.whyItMatters, null, 'template whyItMatters must be filtered to null');
assert.equal(filtered.sound, null, 'template sound must be filtered to null');
assert.ok(filtered.listenFor !== null, 'non-template listenFor must be preserved');
assert.equal(filtered.listenFor.length, 2, 'listenFor items must be preserved');
assert.equal(filtered.startHere.length, 1, 'startHere must be preserved');
assert.equal(filtered.summary, templateDiscovery.summary, 'summary must always be preserved');
assert.equal(filtered.artistContext, templateDiscovery.artistContext, 'artistContext must be preserved');
assert.equal(filtered.ifYouLike.length, 2, 'ifYouLike must be preserved');
assert.equal(filtered.discoveryTags.length, 2, 'discoveryTags must be preserved');
assert.equal(filtered.isEditorial, true, 'remaining listening notes and recommendations are editorial, not verified claims');

// --- filterDiscoveryForPresentation: curated entry ---

const curatedDiscovery = {
  summary: "Prince's arena-rock breakthrough.",
  whyItMatters: curatedWM,
  sound: curatedSound,
  startHere: [{ trackTitle: "Purple Rain", note: "The title track is the emotional core." }],
  listenFor: ["Listen for the gated drums."],
  ifYouLike: ["Michael Jackson's Thriller"],
  discoveryTags: ["Funk", "Rock"]
};

const filteredCurated = filterDiscoveryForPresentation(curatedDiscovery);

assert.equal(filteredCurated.whyItMatters, curatedWM, 'curated whyItMatters must be kept');
assert.equal(filteredCurated.sound, curatedSound, 'curated sound must be kept');
assert.equal(filteredCurated.isEditorial, true, 'entry with album-specific content is editorial');

// --- filterDiscoveryForPresentation: does not mutate input ---

assert.equal(templateDiscovery.whyItMatters, templateWM, 'original discovery must not be mutated');
assert.equal(templateDiscovery.sound, templateSound, 'original sound must not be mutated');

console.log('discovery-presentation-unit tests passed');