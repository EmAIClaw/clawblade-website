// test-listening-guidance-ui.mjs — TDD browser test for Stage 3 pilot listening guidance UI.
//
// Run with: ALBUMVAULT_PLAYWRIGHT_MODULE=playwright node scripts/test-listening-guidance-ui.mjs
//
// Verifies on Rumours (rank 7):
//   1. Pilot tracks show a "Listen for" question as the primary lead.
//   2. Non-pilot tracks show the existing trackLead (legacy/research lead).
//   3. Entry-point markers appear on exactly 2 rows.
//   4. Expanding a pilot track's details shows follow-up question and vocabulary.
//   5. Focus mode shows the pilot question instead of legacy focus text.
//   6. Playback controls (AudioPreview) still present on track rows.
//
// Pilot tracks for Rumours:
//   - track 2 "Dreams" (isEntryPoint: true)
//   - track 7 "The Chain" (isEntryPoint: true)
//   - track 11 "Gold Dust Woman" (isEntryPoint: false)

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let chromium;
const mod = process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright';
try {
  // Try ESM import first
  const imported = await import(mod);
  chromium = imported.chromium || imported.default?.chromium || imported.default;
} catch {
  // Fall back to CJS require
  chromium = require(mod).chromium;
}
if (!chromium) throw new Error(`Could not load chromium from "${mod}"`);

const catalog = JSON.parse(
  await readFile(new URL('../src/data/catalog.generated.json', import.meta.url), 'utf8')
).albums;

const rumours = catalog.find(a => a.rank === 7);
assert.ok(rumours, 'Rumours (rank 7) must exist in catalog');

const PILOT_TRACK_TITLES = ['Dreams', 'The Chain', 'Gold Dust Woman'];
const ENTRY_POINT_TITLES = ['Dreams', 'The Chain'];

const browser = await chromium.launch({
  channel: process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome',
  headless: true,
});

let passed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    failures.push({ name, message: err.message });
    console.error(`  \u2717 ${name}: ${err.message}`);
  }
}

try {
  const context = await browser.newContext();
  // Block netlify functions so Spotify/encyclopedia lookups don't interfere
  await context.route('**/.netlify/functions/**', route =>
    route.fulfill({ json: { configured: false, connected: false } })
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  const baseUrl = process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/';
  await page.goto(baseUrl);

  // Navigate to Rumours via Collection search
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search albums' }).fill('Rumours');
  await page.locator('.albumIdentity').first().click();
  await page.locator('.trackList').waitFor();

  const trackRows = page.locator('.trackRow');
  const rowCount = await trackRows.count();
  assert.equal(rowCount, rumours.tracks.length, 'track row count must match catalog');

  // Helper: find a track row by exact title
  const findRow = (title) => {
    const titleEl = page.locator('.trackRow .trackTitleLine strong', { hasText: title });
    return titleEl.locator('xpath=ancestor::article');
  };

  // ─── Test 1: Pilot tracks show "Listen for" question ───────────
  await test('pilot tracks show "Listen for" question as primary lead', async () => {
    for (const title of PILOT_TRACK_TITLES) {
      const row = findRow(title);
      const listenForLabel = row.locator('.trackListenForLabel');
      assert.ok(await listenForLabel.count() > 0, `${title} should have a "Listen for" label`);
      const labelText = await listenForLabel.first().textContent();
      assert.ok(/listen for/i.test(labelText), `${title} label should say "Listen for"`);
      const questionEl = row.locator('.trackListenForQuestion');
      assert.ok(await questionEl.count() > 0, `${title} should have a pilot question element`);
      const questionText = await questionEl.first().textContent();
      assert.ok(questionText && questionText.trim().length > 0, `${title} question text should be non-empty`);
    }
  });

  // ─── Test 2: Non-pilot tracks show existing lead ───────────────
  await test('non-pilot tracks show existing trackLead, no Listen for label', async () => {
    const nonPilotTitles = rumours.tracks
      .map(t => t.title)
      .filter(t => !PILOT_TRACK_TITLES.includes(t));
    for (const title of nonPilotTitles) {
      const row = findRow(title);
      const lead = row.locator('.trackLead');
      assert.ok(await lead.count() > 0, `${title} should have existing .trackLead`);
      const listenForLabel = row.locator('.trackListenForLabel');
      assert.equal(await listenForLabel.count(), 0, `${title} should NOT have a Listen for label`);
    }
  });

  // ─── Test 3: Entry-point markers on exactly 2 rows ─────────────
  await test('entry-point markers appear on exactly 2 rows', async () => {
    const markers = page.locator('.trackEntryPoint');
    const count = await markers.count();
    assert.equal(count, 2, `expected exactly 2 entry-point markers, found ${count}`);
    for (const title of ENTRY_POINT_TITLES) {
      const row = findRow(title);
      const marker = row.locator('.trackEntryPoint');
      assert.ok(await marker.count() > 0, `${title} should have an entry-point marker`);
    }
  });

  // ─── Test 4: Expanding a pilot track shows followUp + vocabulary ─
  await test('expanding pilot track details shows follow-up and vocabulary', async () => {
    const dreamsRow = findRow('Dreams');
    // Wait for the encyclopedia to load so trackResearchDetails is present
    await dreamsRow.locator('details.trackResearchDetails').waitFor({ timeout: 15000 });
    // Open the research details
    const researchDetails = dreamsRow.locator('details.trackResearchDetails');
    await researchDetails.locator('summary').click();
    await page.waitForTimeout(300);
    const followUp = dreamsRow.locator('.trackPilotFollowUp');
    assert.ok(await followUp.count() > 0, 'Dreams should show pilot follow-up question in expanded details');
    const ft = await followUp.first().textContent();
    assert.ok(ft && ft.trim().length > 0, 'follow-up text should be non-empty');
    const vocab = dreamsRow.locator('.trackPilotVocabulary');
    assert.ok(await vocab.count() > 0, 'Dreams should show pilot vocabulary in expanded details');
    const vt = await vocab.first().textContent();
    assert.ok(vt && vt.trim().length > 0, 'vocabulary text should be non-empty');
  });

  // ─── Test 5: Playback controls still present ───────────────────
  await test('playback controls (AudioPreview) still present on track rows', async () => {
    // At least some rows should have audio preview buttons
    const previewBtns = page.locator('.trackRow .audioPreview, .trackRow button[aria-label*="preview" i], .trackRow .trackControls button');
    const count = await previewBtns.count();
    assert.ok(count > 0, 'track rows should still have playback controls');
  });

  // ─── Test 6: Focus mode shows pilot question ───────────────────
  await test('Focus mode shows pilot question when focus track has guidance', async () => {
    // Start a listening session
    const startBtn = page.getByRole('button', { name: /Start listening session/i });
    if (await startBtn.count() > 0) {
      await startBtn.first().click();
      await page.waitForTimeout(500);
    }
    // Click Focus mode button (force needed: coverBackdrop overlay intercepts pointer events)
    const focusBtn = page.getByRole('button', { name: /Focus mode/i });
    assert.ok(await focusBtn.count() > 0, 'Focus mode button should be available during session');
    await focusBtn.first().click({ force: true });
    await page.locator('.listeningMode').waitFor();

    // The focus track is the first unchecked track. Rumours track 1 "Second Hand News"
    // is NOT a pilot track, so we need to mark tracks until we reach a pilot track.
    // Actually, focusTrack = nextUncheckedIndex. Track 1 is first. Let's exit focus,
    // mark track 1, then re-enter focus — the next unchecked would be track 2 (Dreams, pilot).

    // Exit focus mode
    await page.getByRole('button', { name: /Exit focus/i }).click({ force: true });
    await page.waitForTimeout(300);

    // Mark track 1 (Second Hand News) as listened
    const track1Check = page.locator('.trackRow').first().locator('input[type="checkbox"]');
    if (await track1Check.count() > 0) {
      await track1Check.click({ force: true });
      await page.waitForTimeout(200);
    }

    // Re-enter focus mode — now focusTrack should be track 2 (Dreams)
    const focusBtn2 = page.getByRole('button', { name: /Focus mode/i });
    await focusBtn2.first().click({ force: true });
    await page.locator('.listeningMode').waitFor();

    // Check for pilot question in focus mode
    const focusPilotQuestion = page.locator('.listeningMode .trackListenForQuestion, .listeningMode .focusPilotQuestion');
    const focusQuestionCount = await focusPilotQuestion.count();
    assert.ok(focusQuestionCount > 0, 'Focus mode should show pilot question element for Dreams');

    // Verify the focus track title is Dreams (or at least a pilot track)
    const focusTitle = await page.locator('.listeningMode h2').first().textContent();
    assert.ok(focusTitle && /Dreams/i.test(focusTitle), `Focus track should be Dreams, got "${focusTitle}"`);

    // Exit focus and cancel session to clean up
    await page.getByRole('button', { name: /Exit focus/i }).click({ force: true });
    await page.waitForTimeout(200);
    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click({ force: true });
      await page.waitForTimeout(200);
    }
  });

  await context.close();
} finally {
  await browser.close();
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`  ${f.name}: ${f.message}`);
  }
  process.exit(1);
}