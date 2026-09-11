// Optional browser test for #3: one catalog track list with inline research.
// Same external Playwright setup as test-simplification-browser.mjs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const catalog=JSON.parse(await readFile(new URL('../src/data/catalog.generated.json',import.meta.url),'utf8')).albums;
const browser=await chromium.launch({channel:process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome',headless:true});
try {
 const context=await browser.newContext();
 await context.route('**/.netlify/functions/**',route=>route.fulfill({json:{configured:false,connected:false}}));
 const page=await context.newPage();
 page.setDefaultTimeout(8000);
 await page.goto(process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/');
 for(const rank of [1,16,53]) {
  const album=catalog.find(a=>a.rank===rank);
  await page.getByRole('button',{name:'Collection',exact:true}).click();
  await page.getByRole('textbox',{name:'Search albums'}).fill(album.title);
  await page.locator('.albumIdentity').first().click();
  await page.locator('.trackList').waitFor();
  assert.equal(await page.locator('.trackEncyclopediaList').count(),0,'no duplicate track reference list');
  assert.equal(await page.locator('.trackRow').count(),album.tracks.length);
  assert.deepEqual(await page.locator('.trackRow .trackTitleLine strong').allTextContents(),album.tracks.map(t=>t.title));
  if(rank===1) {
   await page.locator('.trackRow').first().locator('details summary').first().click();
   await page.locator('.trackRow').first().getByText('Evidence for this claim',{exact:true}).first().waitFor();
   const firstRow=page.locator('.trackRow').first();
   assert.equal(await firstRow.locator('.trackLead').count(),1,'documented row needs a versioned lead, not legacy prose');
   assert.equal(await firstRow.locator('.trackLead').textContent(),await firstRow.locator('.verifiedFact > p').first().textContent());
  }
  if(rank===16) {
    // Discs/track numbers and duplicate titles must retain exact catalog row order.
   assert.equal(await page.locator('.trackRow').count(),40);
   const insufficient=page.locator('.trackRow').filter({has:page.locator('.trackResearchLabel').filter({hasText:/insufficient evidence/i})});
   await insufficient.first().waitFor();
   assert.ok(await insufficient.count()>0,'completed evidence gaps remain visible');
   const lead=await insufficient.first().locator('.trackLead').textContent();
   const editorial=await insufficient.first().locator('.trackEditorialDetails > p').first().textContent();
   assert.notEqual(lead,editorial,'insufficient-evidence state must not be replaced by legacy editorial prose');
  }
  console.log(`PASS #${rank}: ${album.tracks.length} exact catalog rows, single track list`);
 }
 await context.close();
} finally { await browser.close(); }
