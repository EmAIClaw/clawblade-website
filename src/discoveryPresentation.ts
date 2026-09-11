// Presentation filter helpers for discovery content.
// Omits known generator templates without changing archived editorial data.
//
// ARCHIVAL DATA IS NEVER MODIFIED — these helpers only control what the
// user-facing UI renders.  The immutable research and generated data
// remain on disk and accessible via the About / evidence panels.

// ─── Template detection ──────────────────────────────────────────────

// The exact whyItMatters template used by the generator for 219 entries:
//   "<Album> matters here because it opens a specific doorway into
//    <Artist>'s sound, era, and influence. Its rank at #<rank> makes it
//    a strong discovery candidate, but the real value is hearing how the
//    songs work as a sequence."
const WHY_IT_MATTERS_TEMPLATE =
  /^.+ matters here because it opens a specific doorway into .+?'s sound, era, and influence\. Its rank at #\d+ makes it a strong discovery candidate, but the real value is hearing how the songs work as a sequence\.$/;

// The exact sound templates used by the generator (8 distinct strings,
// each appearing 2–95 times across the catalog).
const SOUND_TEMPLATES = [
  "The album's force comes through guitar texture, rhythm-section pressure, vocal attitude, and the way loudness or restraint shapes momentum.",
  "Rhythm and voice carry the argument: drums, samples, bass pressure, vocal cadence, and the tension between storytelling and swagger.",
  "Listen for the album's production choices, vocal character, sequencing, and how repeated ideas change meaning across the record.",
  "The emotional center is in the voice, but the details live in groove, harmony, bass movement, and how the arrangement frames intimacy.",
  "Texture and repetition do much of the storytelling: drum programming, bass movement, atmosphere, and slow changes inside loops.",
  "Listen for ensemble conversation: tone, space, improvisational decisions, and how rhythm players shape the room around the lead voices.",
  "Songwriting and phrasing sit up front, with guitars, fiddle, pedal steel, or close harmony shaping the emotional plainness.",
  "Bass and rhythm guitar carry the body of the music, while vocal phrasing, organ bubbles, and space create the sense of lift.",
];

const SOUND_TEMPLATE_SET = new Set(SOUND_TEMPLATES);
const LISTEN_FOR_TEMPLATES = new Set([
  ...SOUND_TEMPLATES,
  "How the opening tracks teach you the album's rules before the later songs complicate them.",
  "Which details feel immediate on first listen and which ones only appear after repetition."
]);

// ─── Public helpers ──────────────────────────────────────────────────

/**
 * Returns true if the whyItMatters text matches the known generator
 * template pattern exactly (by structural match, not substring).
 */
export function isTemplateWhyItMatters(text: string): boolean {
  if (!text) return false;
  return WHY_IT_MATTERS_TEMPLATE.test(text);
}

/**
 * Returns true if the sound text exactly matches one of the 8 known
 * generator template strings.
 */
export function isTemplateSound(text: string): boolean {
  if (!text) return false;
  return SOUND_TEMPLATE_SET.has(text);
}

/**
 * Returns true only when every note is a known generic template.
 */
export function isTemplateListenFor(items: string[]): boolean {
  return items.length > 0 && items.every(item => LISTEN_FOR_TEMPLATES.has(item.trim()));
}

/**
 * Filter a DiscoveryGuide for user-facing presentation.
 * Removes generic generated template prose while keeping genuinely
 * album-specific prose and existing Start here suggestions.
 * Returns a new object — never mutates the input.
 */
export function filterDiscoveryForPresentation(
  discovery: DiscoveryGuideShape
): FilteredDiscoveryGuide {
  const result: FilteredDiscoveryGuide = {
    ...discovery,
    isEditorial: true,
  };

  // whyItMatters: omit if template
  if (isTemplateWhyItMatters(discovery.whyItMatters)) {
    result.whyItMatters = null;
  }

  // sound: omit if template
  if (isTemplateSound(discovery.sound)) {
    result.sound = null;
  }

  // Filter individual templates even when they sit beside specific notes.
  const notes = discovery.listenFor.filter(item => !LISTEN_FOR_TEMPLATES.has(item.trim()));
  result.listenFor = notes.length ? notes : null;

  // startHere, ifYouLike, discoveryTags, summary, catalogNote, artistContext
  // retain their original values; filtering is not independent fact-checking.
  result.startHere = discovery.startHere.map((pick) => ({ ...pick }));
  if (discovery.ifYouLike) result.ifYouLike = [...discovery.ifYouLike];
  if (discovery.discoveryTags) result.discoveryTags = [...discovery.discoveryTags];
  if (discovery.catalogNote) result.catalogNote = discovery.catalogNote;
  if (discovery.artistContext) result.artistContext = discovery.artistContext;

  return result;
}

// ─── Types ───────────────────────────────────────────────────────────

type DiscoveryGuideShape = {
  artistContext?: string;
  summary: string;
  whyItMatters: string;
  sound: string;
  catalogNote?: string;
  startHere: Array<{ trackTitle: string; note: string }>;
  listenFor: string[];
  ifYouLike: string[];
  discoveryTags: string[];
};

export type FilteredDiscoveryGuide = {
  artistContext?: string;
  summary: string;
  whyItMatters: string | null;
  sound: string | null;
  catalogNote?: string;
  startHere: Array<{ trackTitle: string; note: string }>;
  listenFor: string[] | null;
  ifYouLike: string[];
  discoveryTags: string[];
  isEditorial: boolean;
};