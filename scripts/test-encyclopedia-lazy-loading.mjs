import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
  appSource,
  /import\s+[^;]*from\s+["']\.\/data\/encyclopedia\.generated\.json["'];/,
  'App must not statically import the encyclopedia into the initial bundle'
);
assert.match(
  appSource,
  /import\(\s*["']\.\/data\/encyclopedia\.generated\.json["']\s*\)/,
  'App must dynamically import the encyclopedia for album detail'
);

console.log('encyclopedia lazy-loading regression test passed');
