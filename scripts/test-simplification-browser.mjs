// Real-browser verification for the approved #3/#4/#5/#7 simplification batch.
// UI only: Netlify routes are mocked, each context has disposable local storage.
// Start Vite at 127.0.0.1:5175. Install Playwright outside the repo:
// npm install --prefix /tmp/albumvault-ui-qa --no-audit --no-fund playwright
// ALBUMVAULT_PLAYWRIGHT_MODULE=/tmp/albumvault-ui-qa/node_modules/playwright/index.mjs node scripts/test-simplification-browser.mjs
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.ALBUMVAULT_PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.ALBUMVAULT_QA_URL || 'http://127.0.0.1:5175/';
const outputDir = process.env.ALBUMVAULT_QA_OUTPUT || path.join(tmpdir(), 'albumvault-simplification-qa');
await mkdir(outputDir,{recursive:true});
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.generated.json',import.meta.url),'utf8')).albums;
const browser=await chromium.launch({channel:process.env.ALBUMVAULT_BROWSER_CHANNEL || 'chrome',headless:true});
try {
 for (const width of [1280,390,820]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/.netlify/functions/**',route=>route.fulfill({json:{configured:false,connected:false}}));
  const page=await context.newPage();
  page.setDefaultTimeout(8000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const nav=page.locator('nav').first();
  assert.deepEqual((await nav.getByRole('button').allTextContents()).map(text=>text.trim()),['Collection','Listen next','History']);
  assert.equal(await page.getByRole('button',{name:'Load',exact:true}).isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'Export',exact:true}).isVisible(),false);
  await page.getByText('Settings',{exact:true}).first().click();
  assert.equal(await page.getByRole('button',{name:'Load',exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Export',exact:true}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Load',exact:true}).evaluate(el => {
    const box=el.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
  }),true,'opened Settings controls must be reachable in viewport');
  // Close Settings through its toggle (details or explicit button).
  await page.getByText('Settings',{exact:true}).first().click();
  if(process.env.ALBUMVAULT_QA_NAV_ONLY === '1') {
    assert.equal(await nav.getByRole('button').evaluateAll(buttons=>buttons.every(button=>{
      const box=button.getBoundingClientRect(); return box.left>=0 && box.right<=innerWidth;
    })),true,'all primary navigation must fit without horizontal scrolling');
    await page.getByRole('button',{name:'History',exact:true}).click();
    await page.getByText('Statistics',{exact:true}).first().click();
    assert.equal(await page.getByRole('heading',{name:'All sessions',exact:true}).count(),0);
    console.log(`PASS ${width}px navigation and Settings`);
    await context.close();
    continue;
  }
  await page.getByRole('button',{name:'Collection',exact:true}).click();
  const row=page.locator('.albumRow').first();
  await row.getByRole('combobox').selectOption({label:'Want'});
  assert.equal(await row.getByRole('combobox').locator('option:checked').textContent(),'Want');
  await page.getByRole('button',{name:/^Undo/}).click();
  assert.equal(await row.getByRole('combobox').locator('option:checked').textContent(),'Not owned');
  await row.getByRole('combobox').selectOption({label:'Owned'});
  await row.getByRole('button',{name:'Listened',exact:true}).click();
  await page.getByRole('button',{name:/^Undo/}).click();
  const firstId=catalog[0].id;
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('albumvault-state')));
  assert.equal(state.albums[firstId].owned,true,'undo listened must preserve preceding owned edit');
  assert.equal(Boolean(state.albums[firstId].listened),false);
  await page.getByRole('button',{name:'Grid view',exact:true}).click();
  const card=page.locator('.albumCard').first();
  await card.getByRole('combobox').selectOption({label:'Want'});
  assert.equal(await page.locator('.albumGrid').isVisible(),true,'grid status edits must not open the album');
  await page.getByRole('button',{name:/^Undo/}).click();
  assert.equal(await card.getByRole('combobox').locator('option:checked').textContent(),'Owned');
  assert.equal(await page.locator('.albumCard').evaluateAll(cards=>cards.every(card=>{
    const box=card.getBoundingClientRect();
    return [...card.querySelectorAll('.statusControls select,.statusControls button')].every(control=>control.getBoundingClientRect().right<=box.right+1);
  })),true,'all grid status controls must fit their cards');
  await page.screenshot({path:path.join(outputDir,`collection-${width}.png`)});
  await page.getByRole('button',{name:'List view',exact:true}).click();
  await row.locator('.albumIdentity').click();
  await page.getByRole('tab',{name:'Listen',exact:true}).waitFor();
  assert.equal(await page.locator('.trackList').count(),1);
  assert.equal(await page.locator('.trackRow').count(),catalog[0].tracks.length);
  assert.equal(await page.locator('.trackEncyclopediaList').count(),0,'no second structured track list');
  await page.locator('.trackRow').first().locator('details summary').first().click();
  assert.equal(await page.locator('.trackRow').first().getByText('Evidence for this claim',{exact:true}).first().isVisible(),true);
  await page.getByRole('tab',{name:'About',exact:true}).click();
  const about=page.getByRole('tabpanel',{name:'About',exact:true});
  const aboutText=await about.innerText();
  assert.equal(/opens a specific doorway|guitar texture, rhythm-section pressure|teach you the album's rules/.test(aboutText),false,'generic template prose removed');
  assert.equal(await page.locator('.discoveryLead').count(),0,'no repeated discovery summary');
  await page.getByRole('tab',{name:'My copy',exact:true}).click();
  await page.locator('.collectorInspector summary').click();
  await page.getByLabel('Shelf location',{exact:true}).fill('QA preserved shelf');
  await page.locator('.albumHeroCompact').getByRole('button',{name:'Listened',exact:true}).click();
  await page.getByLabel('Shelf location',{exact:true}).fill('QA newer shelf edit');
  await page.getByRole('button',{name:/^Undo/}).click();
  assert.equal(await page.getByLabel('Shelf location',{exact:true}).inputValue(),'QA newer shelf edit','status undo must not overwrite newer collector edits');
  await page.getByRole('tab',{name:'Listen',exact:true}).click();
  await page.getByRole('button',{name:'Start listening session',exact:true}).click();
  await page.locator('.listeningClose').click();
  await page.getByLabel('Session reflection').fill('QA active note');
  await page.locator('.trackCheck input').first().check();
  await page.getByRole('tab',{name:'About',exact:true}).click();
  await page.getByRole('tab',{name:'Listen',exact:true}).click();
  assert.equal(await page.getByLabel('Session reflection').inputValue(),'QA active note');
  assert.equal(await page.locator('.trackCheck input').first().isChecked(),true);
  await page.getByRole('button',{name:'Complete session',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/^Undo/}).count(),0,'session completion must invalidate stale status undo');
  await page.getByRole('button',{name:'History',exact:true}).click();
  assert.equal((await page.locator('.logNotes').first().innerText()).includes('QA active note'),true,'completed session retained in History');
  await page.getByText('Statistics',{exact:true}).first().click();
  assert.equal(await page.getByRole('heading',{name:'All sessions',exact:true}).count(),0,'statistics must not duplicate full log');
  await page.getByRole('button',{name:'Listen next',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Random',exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'Collection',exact:true}).click();
  await page.getByRole('textbox',{name:'Search albums'}).fill('Dark Side of the Moon');
  await page.locator('.albumIdentity').first().click();
  await page.getByRole('tab',{name:'Listen',exact:true}).waitFor();
  assert.equal(await page.locator('.trackList').count(),1);
  assert.equal(await page.locator('.trackRow').count(),catalog.find(a=>a.rank===53).tracks.length);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false,`no overflow ${width}`);
  await page.locator('.albumHeroCompact').evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(outputDir,`listen-${width}.png`)});
  await page.getByRole('tab',{name:'About',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false,`no About overflow ${width}`);
  await page.getByRole('tabpanel',{name:'About',exact:true}).evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:path.join(outputDir,`about-${width}.png`)});
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: navigation, Settings, explicit status/undo, one track list, evidence, lean discovery, session preservation, History, responsive geometry`);
  await context.close();
 }
} finally { await browser.close(); }
