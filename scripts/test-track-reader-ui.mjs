import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.generated.json', import.meta.url))).albums;
const research = JSON.parse(readFileSync(new URL('../src/data/track-encyclopedia/track-encyclopedia.generated.json', import.meta.url))).entries;
const editorialAlbums = ['rumours-editorial.json', 'kind-of-blue-editorial.json'].map(file =>
  JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url))));
const browser = await chromium.launch({ channel: process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome', headless: true });
try {
  for (const width of [390, 820, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/.netlify/functions/**', route => route.fulfill({ json: { configured: false, connected: false } }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // The next20 browser matrix covers rank 1 and all other batch albums.
    for (const rank of [7, 32, 31, 200]) {
      const album = catalog.find(a => a.rank === rank);
      const editorial = editorialAlbums.find(e => e.albumId === album.id);
      const sourceLabel = rank === 31 ? 'Bill Evans’s liner notes, via Wikipedia' : 'Ken Caillat · MusicRadar';
      await page.goto(process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/');
      await page.getByRole('button', { name: 'Collection', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search albums' }).fill(album.title);
      await page.locator('.albumIdentity').first().click();
      const rows = page.locator('.trackRow');
      await rows.first().waitFor();
      await page.waitForFunction(() => !document.querySelector('.trackList')?.textContent.includes('Loading track research'));
      assert.equal(await rows.count(), album.tracks.length);
      assert.equal(await page.locator('.trackEditorialDetails').count(), 0);
      assert.doesNotMatch(await page.locator('.trackList').innerText(), /No confident track-specific|Funky Brothers|pitch-shifting|descending chromatically/);
      for (let index = 0; index < album.tracks.length; index++) {
        const track = album.tracks[index];
        const row = rows.nth(index);
        const evidence = research[album.id]?.trackEntries.find(t => t.discNumber === track.discNumber && t.trackNumber === track.trackNumber && t.trackTitle === track.title);
        if (evidence?.verifiedFacts.length) {
          const lead = row.locator('.trackLead');
          assert.equal(await lead.getAttribute('aria-hidden'), null, `${album.title}/${track.title}: lead must be accessible`);
          const note = editorial?.entries.find(e => e.trackTitle === track.title);
          assert.equal(await lead.innerText(), note?.description ?? evidence.verifiedFacts[0].claim);
          if (note) {
            assert.equal(await row.locator('.trackListenForQuestion').innerText(), note.question);
            assert.equal(await row.locator('.trackEditorialSource a').innerText(), sourceLabel);
            assert.equal(await row.locator('.trackEditorialSource a').getAttribute('href'), evidence.verifiedFacts[0].sourceRefs[0].url);
            assert.equal(await page.locator('.trackEditorialScope').innerText(), editorial.scope);
          }
          await row.locator('.trackResearchDetails summary').click();
          assert.ok((await row.innerText()).includes(evidence.verifiedFacts[0].claim), 'original documented claim retained');
          assert.ok(await row.locator('.trackResearchContent a[href^="https://"]').count() > 0, 'evidence links retained');
          await row.locator('.trackResearchDetails summary').click();
        } else if (!evidence) {
          assert.equal(await row.locator('.trackLead').innerText(), 'Track commentary not yet researched.');
        }
        if (track.previewUrl) assert.ok(await row.locator('.trackControls button').count() > 0, 'preview control retained');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
      await page.getByRole('button', { name: /Start listening session/ }).click();
      await page.locator('.listeningMode').waitFor();
      assert.doesNotMatch(await page.locator('.listeningMode').innerText(), /No confident track-specific|Editorial listening|Funky Brothers/);
      if (editorial) {
        for (const note of editorial.entries) {
          const focus = page.locator('.listeningMode');
          assert.equal(await focus.locator('.trackEditorialDescription').innerText(), note.description);
          assert.equal(await focus.locator('.trackListenForQuestion').innerText(), note.question);
          assert.equal(await focus.locator('.trackEditorialSource a').innerText(), sourceLabel);
          await focus.getByRole('button', { name: 'Mark listened', exact: true }).click();
        }
      }
      await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      console.log(`PASS ${width}px: ${album.title} — facts, gaps, sources, previews, focus, overflow`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
