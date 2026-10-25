import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const album = JSON.parse(readFileSync('src/data/catalog.generated.json', 'utf8')).albums.find(a => a.rank === 1);
const browser = await chromium.launch({ channel: process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome', headless: true, chromiumSandbox: true });
try {
  for (const width of [390, 320, 720, 721, 820, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/.netlify/functions/**', route => route.fulfill({ json: { configured: false, connected: false } }));
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Test playback controls without streaming audio or touching real user data.
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () {};
    });
    try {
      await page.goto(process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/');
      await page.getByRole('button', { name: 'Collection', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search albums' }).fill(album.title);
      await page.locator('.albumIdentity').first().click();
      await page.locator('.trackEditorialScope').waitFor();
      assert.equal(await page.locator('.miniPlayer').count(), 0);
      const idlePadding = await page.locator('main').evaluate(el => getComputedStyle(el).paddingBottom);
      const row = page.locator('.trackRow').first();
      await row.getByRole('button', { name: `Play preview of ${album.tracks[0].title}`, exact: true }).click();
      await row.getByRole('button', { name: `Pause preview of ${album.tracks[0].title}`, exact: true }).click();
      const player = page.locator('.miniPlayer');
      await player.waitFor();
      await page.getByRole('button', { name: /Start listening session/ }).click();
      for (const track of album.tracks) {
        assert.equal(await page.locator('.listeningMode h2').innerText(), `${track.trackNumber}. ${track.title}`);
        await page.locator('.listeningMode').getByRole('button', { name: 'Mark listened', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
      // A real pointer click must succeed: no force, keyboard workaround or hidden player.
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).count(), 0);
      assert.ok(await page.getByRole('button', { name: /Start listening session/ }).isVisible());
      // Repeat with active playback and explicitly check clearance at the page end.
      await player.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.getByRole('button', { name: /Start listening session/ }).click();
      await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
      const buttonBox = await cancel.boundingBox();
      const playerBox = await player.boundingBox();
      assert.ok(buttonBox.y + buttonBox.height < playerBox.y, 'bottom controls clear the player');
      assert.notEqual(await page.locator('main').evaluate(el => getComputedStyle(el).paddingBottom), idlePadding);
      await cancel.click();
      await player.getByRole('button', { name: 'Pause', exact: true }).click();
      await player.getByRole('button', { name: 'Open Now Playing', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: paused/playing pointer Cancel, bottom clearance, player toggle and expanded dialog`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
