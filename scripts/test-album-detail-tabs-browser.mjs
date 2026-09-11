// Optional real-browser regression test (Chrome, isolated browser state).
// Start local Vite on 127.0.0.1:5175, then install the QA dependency outside the repo:
// npm install --prefix /tmp/albumvault-ui-qa --no-audit --no-fund playwright
// ALBUMVAULT_PLAYWRIGHT_MODULE=/tmp/albumvault-ui-qa/node_modules/playwright/index.mjs node scripts/test-album-detail-tabs-browser.mjs
// ALBUMVAULT_QA_URL, ALBUMVAULT_QA_OUTPUT and ALBUMVAULT_BROWSER_CHANNEL override defaults.
// Netlify endpoints are mocked: this verifies UI only, not cloud sync or Spotify.
// Each viewport gets a disposable browser context; no user vault or production data is touched.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const outputDir = process.env.ALBUMVAULT_QA_OUTPUT || path.join(tmpdir(), 'albumvault-tabs-qa');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({channel:process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome',headless:true});
try {
 for (const width of [1280,390,820]) {
  const context = await browser.newContext({ viewport:{width,height:900} });
  await context.route('**/.netlify/functions/**', route => route.fulfill({json:{configured:false,connected:false}}));
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/');
  await page.getByRole('button',{name:'Collection',exact:true}).click();
  await page.locator('.albumIdentity').first().click();
  await page.getByRole('tab',{name:'Listen',exact:true}).waitFor({timeout:5000});
  assert.equal(await page.getByRole('tab',{name:'Listen',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.trackList').isVisible(),true);
  assert.equal(await page.locator('.encyclopediaPanel').isVisible(),false);
  assert.equal(await page.locator('.albumHeroCompact').evaluate(hero => {
    const bounds = hero.getBoundingClientRect();
    return [...hero.querySelectorAll('.spotifyLookupSlot .chip')].every(chip => chip.getBoundingClientRect().right <= bounds.right);
  }),true,`Spotify status must fit inside compact header at ${width}px`);
  await page.getByRole('tab',{name:'About',exact:true}).click();
  assert.equal(await page.locator('.trackList').isVisible(),false);
  assert.equal(await page.getByRole('tab',{name:'About',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('.referenceGrid details').first().waitFor();
  assert.equal(await page.locator('.referenceGrid details[open]').count(),0,'biographies start collapsed');
  await page.locator('.referenceGrid summary').first().click();
  assert.equal(await page.locator('.referenceGrid article').first().isVisible(),true);
  assert.equal(await page.locator('.albumResearchDetails').getAttribute('open'),null,'detailed research starts collapsed');
  await page.locator('.albumResearchDetails > summary').click();
  assert.equal(await page.locator('.trustPanel').isVisible(),true);
  await page.getByRole('tab',{name:'My copy',exact:true}).click();
  assert.equal(await page.locator('.collectorInspectorUnavailable').isVisible(),true);
  await page.locator('.albumHeroCompact').getByRole('combobox').selectOption({label:'Owned'});
  await page.locator('.collectorInspector summary').click();
  await page.getByLabel('Shelf location',{exact:true}).fill('Local QA shelf');
  await page.getByRole('tab',{name:'Listen',exact:true}).click();
  await page.getByRole('button',{name:'Start listening session',exact:true}).click();
  await page.locator('.listeningClose').click();
  await page.getByLabel('Session reflection').fill('Local QA session draft');
  await page.locator('.trackCheck input').first().check();
  await page.getByRole('tab',{name:'About',exact:true}).click();
  await page.getByRole('tab',{name:'Listen',exact:true}).click();
  assert.equal(await page.getByLabel('Session reflection').inputValue(),'Local QA session draft');
  assert.equal(await page.locator('.trackCheck input').first().isChecked(),true);
  await page.getByRole('tab',{name:'My copy',exact:true}).click();
  assert.equal(await page.getByLabel('Shelf location',{exact:true}).inputValue(),'Local QA shelf');
  await page.getByRole('tab',{name:'Listen',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'About',exact:true}).getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab',{name:'My copy',exact:true}).getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');
  assert.equal(await page.getByRole('tab',{name:'Listen',exact:true}).getAttribute('aria-selected'),'true');
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow,false,`page overflow at ${width}`);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('.albumHeroCompact').evaluate(el => el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(outputDir, `viewport-${width}.png`)});
  await page.locator('.albumDetail').screenshot({path:path.join(outputDir, `album-${width}.png`)});
  await page.getByRole('tab',{name:'About',exact:true}).click();
  await page.getByRole('button',{name:'Collection',exact:true}).click();
  await page.locator('.albumIdentity').nth(1).click();
  assert.equal(await page.getByRole('tab',{name:'Listen',exact:true}).getAttribute('aria-selected'),'true');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: tabs, ownership gate, copy persistence, session persistence, keyboard, overflow, no page errors`);
  await context.close();
 }
} finally { await browser.close(); }
