import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveTrackEditorial } from '../src/trackEditorial.ts';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const catalog = read('src/data/catalog.generated.json').albums;
const research = read('src/data/track-encyclopedia/track-encyclopedia.generated.json').entries;

const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,31];
const output = '.hermes/reviews/next20';
mkdirSync(output, { recursive: true });
const results = [];
const browser = await chromium.launch({ channel: process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome', headless: true, chromiumSandbox: true });
try {
  for (const width of [390, 820, 1280]) for (const rank of ranks) {
    if (width === 820 && ![4,7,14,16,31].includes(rank)) continue;
    const album = catalog.find(a => a.rank === rank);
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/.netlify/functions/**', route => route.fulfill({ json: { configured: false, connected: false } }));
    const page = await context.newPage();
    // Exercise UI URL binding/play/pause without streaming remote media in QA.
    await page.addInitScript(() => {
      window.__previewCalls = [];
      HTMLMediaElement.prototype.play = function () { window.__previewCalls.push(['play', this.src]); return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () { window.__previewCalls.push(['pause', this.src]); };
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(10000);
    try {
      await page.goto(process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/');
      await page.getByRole('button', { name: 'Collection', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search albums' }).fill(album.title);
      await page.locator('.albumIdentity').first().click();
      await page.locator('.trackEditorialScope').waitFor();
      const rows = page.locator('.trackRow');
      assert.equal(await rows.count(), album.tracks.length);
      let descriptions = 0, questions = 0, gaps = 0, previews = 0;
      const notes = album.tracks.map(t => resolveTrackEditorial(research[album.id], { albumId: album.id, discNumber: t.discNumber, trackNumber: t.trackNumber, trackTitle: t.title }));
      async function checkNote(container, note, focus = false) {
        if (note) {
          assert.equal(await container.locator(focus ? '.trackEditorialDescription' : '.trackLead').innerText(), note.description);
          assert.equal(await container.locator('.trackListenForQuestion').count(), note.question ? 1 : 0);
          if (note.question) assert.equal(await container.locator('.trackListenForQuestion').innerText(), note.question);
          const links = container.locator('.trackEditorialSource a');
          assert.equal(await links.count(), note.sources.length);
          for (let j = 0; j < note.sources.length; j++) {
            assert.equal(await links.nth(j).getAttribute('href'), note.sources[j].url);
            assert.equal(await links.nth(j).innerText(), note.sources[j].label);
          }
          assert.ok((await container.locator('.trackEditorialSource').innerText()).startsWith(note.sourceContext + ':'));
          assert.equal(await container.locator('.trackEditorialGap').count(), 0);
        } else {
          assert.equal(await container.locator('.trackEditorialGap').count(), 1);
          assert.equal(await container.locator('.trackListenForQuestion').count(), 0, 'gap must not inherit unrelated pilot question');
          assert.equal(await container.locator('.trackEditorialSource').count(), 0);
          assert.equal(await container.locator('.trackEditorialDescription').count(), 0);
        }
      }
      for (let i = 0; i < album.tracks.length; i++) {
        const track = album.tracks[i], row = rows.nth(i), note = notes[i];
        await checkNote(row, note);
        if (![7,31].includes(rank)) {
          assert.equal(await row.locator('.trackPilotFollowUp, .trackPilotVocabulary').count(), 0, 'batch must not inherit old supplemental prompts');
        }
        if (note) { descriptions++; if (note.question) questions++; } else gaps++;
        const evidence = research[album.id].trackEntries.find(t => t.discNumber === track.discNumber && t.trackNumber === track.trackNumber && t.trackTitle === track.title);
        if (evidence?.verifiedFacts.length) {
          await row.locator('.trackResearchDetails summary').click();
          for (const fact of evidence.verifiedFacts) assert.ok((await row.innerText()).includes(fact.claim), 'original claim retained');
          assert.ok(await row.locator('.trackResearchContent a[href^="https://"]').count() > 0);
          await row.locator('.trackResearchDetails summary').click();
        }
        if (track.previewUrl) {
          assert.ok(await row.locator('.trackControls button').count() > 0);
          if (previews === 0) {
            await row.getByRole('button', { name: `Play preview of ${track.title}`, exact: true }).click();
            await row.getByRole('button', { name: `Pause preview of ${track.title}`, exact: true }).click();
            const calls = await page.evaluate(() => window.__previewCalls);
            assert.deepEqual(calls.slice(-2), [['play', track.previewUrl], ['pause', track.previewUrl]]);
          }
          previews++;
        }
      }
      assert.doesNotMatch(await page.locator('.trackList').innerText(), /No confident track-specific|Funky Brothers|pitch-shifting|descending chromatically/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if ([4,9,14,16].includes(rank)) await page.screenshot({ path: `${output}/rank-${rank}-${width}-listen.png`, fullPage: false });
      await page.getByRole('button', { name: /Start listening session/ }).click();
      const focus = page.locator('.listeningMode');
      await focus.waitFor();
      for (let i = 0; i < album.tracks.length; i++) {
        assert.equal(await focus.locator('h2').innerText(), `${album.tracks[i].trackNumber}. ${album.tracks[i].title}`);
        await checkNote(focus, notes[i], true);
        assert.ok((await focus.locator('.trackEditorialScope').innerText()).length > 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await focus.getByRole('button', { name: 'Mark listened', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
      // The fixed player must leave the session controls pointer-accessible.
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).count(), 0);
      assert.deepEqual(errors, []);
      results.push({ rank, width, tracks: album.tracks.length, descriptions, questions, gaps, previews, focusTracks: album.tracks.length });
      console.log(`PASS ${width}px rank ${rank}: ${album.title}; ${descriptions} descriptions, ${questions} questions, ${gaps} gaps; all tracks in Focus`);
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  writeFileSync(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
}
console.log(`PASS ${results.length} album/viewport checks`);
