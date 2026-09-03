// Real Chrome production-preview smoke for rank 10 — The Miseducation of Lauryn Hill.
// Drives a headless Chrome over CDP (remote-debugging-port), navigates to the
// production preview, opens the rank-10 album, and captures console/runtime
// exceptions plus the rendered evidence surface. Uses Node's global WebSocket.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const PREVIEW = 'http://localhost:4173/';
const ALBUM_ID = '010-lauryn-hill-the-miseducation-of-lauryn-hill-57da212b';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome CDP page target did not come up');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onopen = () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const msgId = ++id;
          pending.set(msgId, { res, rej });
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });
      },
      onEvent(cb) { events.push(cb); },
      close() { ws.close(); },
    });
    ws.onerror = (e) => reject(new Error('ws error'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        for (const cb of events) cb(msg);
      }
    };
  });
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/albumvault-smoke-profile',
  'about:blank',
], { stdio: 'ignore' });

try {
  const wsUrl = await getWsUrl();
  const cdp = await connect(wsUrl);

  const exceptions = [];
  cdp.onEvent((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails?.text ?? 'unknown exception');
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      exceptions.push('console.error: ' + (msg.params.args?.map((a) => a.value ?? a.description).join(' ') ?? ''));
    }
  });

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: PREVIEW });
  await sleep(4000);

  // Navigate to the Collection view, then open the rank-10 album.
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = [...document.querySelectorAll('button')];
      const coll = btns.find(b => (b.textContent || '').trim() === 'Collection');
      if (coll) { coll.click(); return 'collection-clicked'; }
      return 'collection-not-found';
    })()`,
    returnByValue: true,
  });
  await sleep(2000);

  // Open the rank-10 album by clicking its identity button in the collection.
  const clickResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btns = [...document.querySelectorAll('button.albumIdentity')];
      const target = btns.find(b => (b.textContent || '').includes('Miseducation of Lauryn Hill'));
      if (!target) return 'album-row-not-found';
      target.scrollIntoView(); target.click(); return 'clicked';
    })()`,
    returnByValue: true,
  });
  await sleep(3000);

  const state = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const body = document.body.innerText || '';
      const hasAlbum = body.includes('The Miseducation of Lauryn Hill');
      const hasTrack = body.includes('Doo Wop (That Thing)');
      const hasEvidence = body.includes('Bob Marley Museum') || body.includes('Hope Road') || body.includes('Ras Baraka');
      const hasSource = body.includes('Rolling Stone') || body.includes('Library of Congress') || body.includes('Pitchfork') || body.includes('GRAMMY');
      const hasContentHash = /[a-f0-9]{16}/.test(body);
      return { hasAlbum, hasTrack, hasEvidence, hasSource, hasContentHash, title: document.title, body: body.slice(0, 3000) };
    })()`,
    returnByValue: true,
  });

  console.log('CLICK_RESULT:', clickResult.result.value);
  console.log('PAGE_STATE:', JSON.stringify(state.result.value));
  console.log('BODY_SNIPPET:', state.result.value.body);
  console.log('RUNTIME_EXCEPTIONS:', exceptions.length);
  for (const e of exceptions) console.log('  EXC:', e);

  const ok = state.result.value.hasAlbum && state.result.value.hasTrack &&
    state.result.value.hasEvidence && state.result.value.hasSource &&
    exceptions.length === 0;

  cdp.close();
  console.log(ok ? 'SMOKE_PASS' : 'SMOKE_FAIL');
  process.exit(ok ? 0 : 1);
} finally {
  chrome.kill('SIGKILL');
}
