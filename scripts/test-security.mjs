import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeVaultState, safeParseVaultState } from '../src/vaultState.ts';
import { allowedCorsOrigin, createRateLimiter } from '../netlify/functions/security.ts';

const valid = {
  albums: {
    'album-1': {
      owned: true,
      wantlist: true,
      rating: 12,
      notes: 'x'.repeat(6000),
      shelfLocation: 42,
      condition: 'Bad'
    }
  },
  sessions: [{
    id: 's1',
    albumId: 'album-1',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: 'invalid',
    notes: 'n'.repeat(6000),
    checkedTracks: ['a', 7, 'b']
  }],
  updatedAt: 'not-a-date'
};

const normalized = normalizeVaultState(valid);
assert.equal(normalized.albums['album-1'].owned, true);
assert.equal(normalized.albums['album-1'].wantlist, false, 'owned albums cannot remain wantlist');
assert.equal(normalized.albums['album-1'].rating, 5, 'rating is clamped');
assert.equal(normalized.albums['album-1'].condition, undefined, 'invalid condition is removed');
assert.equal(normalized.albums['album-1'].shelfLocation, undefined, 'non-string shelfLocation is removed');
assert.equal(normalized.albums['album-1'].notes?.length, 5000, 'notes are capped');
assert.equal(normalized.sessions[0].checkedTracks.length, 2, 'checked tracks are string-only');
assert.equal(normalized.sessions[0].completedAt, undefined, 'invalid completedAt is removed');
assert.match(normalized.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

assert.equal(safeParseVaultState('{bad json'), null);
assert.equal(safeParseVaultState(JSON.stringify({ albums: [], sessions: [] })), null);
assert.ok(safeParseVaultState(JSON.stringify({ albums: {}, sessions: [], updatedAt: new Date().toISOString() })));

assert.equal(allowedCorsOrigin('https://clawblade.ai', 'https://clawblade.ai'), 'https://clawblade.ai');
assert.equal(allowedCorsOrigin('https://evil.example', 'https://clawblade.ai'), 'null');
assert.equal(allowedCorsOrigin('https://clawblade.ai', undefined), 'null', 'CORS fails closed when allowed origin is unset');

const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
assert.equal(limiter('1.2.3.4'), true);
assert.equal(limiter('1.2.3.4'), true);
assert.equal(limiter('1.2.3.4'), false, 'third auth failure is rate-limited');
assert.equal(limiter('5.6.7.8'), true, 'different IP has independent bucket');

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const spotifyFunctionSource = readFileSync(new URL('../netlify/functions/spotify.ts', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /localStorage\.setItem\(['"]albumvault-spotify['"]/, 'Spotify tokens must not be persisted to localStorage');
assert.doesNotMatch(appSource, /refreshToken:\s*spotifyToken\.refreshToken/, 'client must not persist refresh tokens');
assert.doesNotMatch(spotifyFunctionSource, /access-control-allow-origin['"]:\s*(request\.headers\.get\(['"]origin['"]\)|['"]\*)/, 'Spotify search CORS must not echo arbitrary origins or use wildcard');

console.log('security tests passed');
