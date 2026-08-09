import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeVaultState, safeParseVaultState } from '../src/vaultState.ts';
import {
  allowedCorsOrigin,
  createRateLimiter,
  PayloadTooLargeError,
  readLimitedText
} from '../netlify/functions/security.ts';

const valid = {
  albums: {
    'album-1': {
      owned: true,
      wantlist: true,
      rating: 12,
      notes: 'x'.repeat(6000),
      editionNote: 'e'.repeat(1600),
      whyItMatters: 'w'.repeat(2600),
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
assert.equal(normalized.albums['album-1'].editionNote?.length, 1000, 'edition notes are capped');
assert.equal(normalized.albums['album-1'].whyItMatters?.length, 2000, 'private collector notes are capped');
assert.equal(normalized.sessions[0].checkedTracks.length, 2, 'checked tracks are string-only');
assert.equal(normalized.sessions[0].completedAt, undefined, 'invalid completedAt is removed');
assert.match(normalized.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

const hostileShape = normalizeVaultState({
  albums: JSON.parse('{"__proto__":{"owned":true},"safe":{"owned":true,"editionNote":42,"whyItMatters":[]}}'),
  sessions: [
    {
      id: 'duplicate',
      albumId: 'safe',
      startedAt: '2026-01-02T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.000Z',
      notes: '',
      checkedTracks: ['x'.repeat(2_000)]
    },
    {
      id: 'duplicate',
      albumId: 'safe',
      startedAt: '2026-01-03T00:00:00.000Z',
      notes: '',
      checkedTracks: []
    }
  ],
  updatedAt: '2026-01-03T00:00:00.000Z'
});
assert.equal(Object.hasOwn(hostileShape.albums, '__proto__'), false, 'prototype-mutating album keys are removed');
assert.equal(hostileShape.albums.safe.owned, true);
assert.equal(hostileShape.albums.safe.editionNote, undefined, 'non-string edition notes are removed');
assert.equal(hostileShape.albums.safe.whyItMatters, undefined, 'non-string private collector notes are removed');
assert.equal(hostileShape.sessions.length, 1, 'duplicate session IDs are removed');
assert.equal(hostileShape.sessions[0].completedAt, undefined, 'sessions cannot complete before they start');
assert.equal(hostileShape.sessions[0].checkedTracks[0].length, 500, 'track keys are bounded');

assert.equal(safeParseVaultState('{bad json'), null);
assert.equal(safeParseVaultState(JSON.stringify({ albums: [], sessions: [] })), null);
assert.ok(safeParseVaultState(JSON.stringify({ albums: {}, sessions: [], updatedAt: new Date().toISOString() })));

assert.equal(allowedCorsOrigin('https://clawblade.ai', 'https://clawblade.ai'), 'https://clawblade.ai');
assert.equal(allowedCorsOrigin('https://evil.example', 'https://clawblade.ai'), null);
assert.equal(allowedCorsOrigin('https://clawblade.ai', undefined), null, 'CORS fails closed when allowed origin is unset');

const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 60_000 });
assert.equal(limiter('1.2.3.4'), true);
assert.equal(limiter('1.2.3.4'), true);
assert.equal(limiter('1.2.3.4'), false, 'third auth failure is rate-limited');
assert.equal(limiter('5.6.7.8'), true, 'different IP has independent bucket');

const limitedRequest = new Request('https://example.test/state', {
  method: 'PUT',
  body: 'éé'
});
await assert.rejects(
  readLimitedText(limitedRequest, 3),
  PayloadTooLargeError,
  'streamed request limits count bytes rather than JavaScript characters'
);
const declaredOversize = new Request('https://example.test/state', {
  method: 'PUT',
  headers: { 'content-length': '101' },
  body: '{}'
});
await assert.rejects(
  readLimitedText(declaredOversize, 100),
  PayloadTooLargeError,
  'declared oversized bodies are rejected before buffering'
);

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const spotifyFunctionSource = readFileSync(new URL('../netlify/functions/spotify.ts', import.meta.url), 'utf8');
const gymStateFunctionSource = readFileSync(new URL('../netlify/functions/gym-state.ts', import.meta.url), 'utf8');
const spotifyAuthFunctionSource = readFileSync(new URL('../netlify/functions/spotify-auth.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fixMissingTracksSource = readFileSync(new URL('../scripts/fix-missing-tracks.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /localStorage\.setItem\(['"]albumvault-spotify['"]/, 'Spotify tokens must not be persisted to localStorage');
assert.doesNotMatch(appSource, /refreshToken:\s*spotifyToken\.refreshToken/, 'client must not persist refresh tokens');
assert.doesNotMatch(spotifyFunctionSource, /access-control-allow-origin['"]:\s*(request\.headers\.get\(['"]origin['"]\)|['"]\*)/, 'Spotify search CORS must not echo arbitrary origins or use wildcard');
assert.doesNotMatch(fixMissingTracksSource, /ranked\.length/, 'fix-missing-tracks must not reference ranked outside searchApple scope');
assert.match(appSource, /spotifyCache\.current\.get\(cachedKey\)[\s\S]{0,400}setSpotifyResult/, 'Spotify album cache hits must restore spotifyResult state');
assert.doesNotMatch(appSource, /<Heart size=\{16\} \/> Want/, 'Collection rows must combine owned and want into one status button');
assert.doesNotMatch(spotifyFunctionSource, /const corsHeaders =[\s\S]*cache-control['"]:\s*['"]max-age=3600['"]/m, 'Spotify search must not share success cache-control with error responses');
assert.match(gymStateFunctionSource, /process\.env\.GYM_TRACKER_PASSCODE/, 'Gym cloud state must require a server-side passcode');
assert.match(gymStateFunctionSource, /allowAuthAttempt\(getClientIp\(request\)\)/, 'Gym cloud state must rate-limit failed passcode attempts');
assert.match(gymStateFunctionSource, /maxBodyBytes = 2_000_000/, 'Gym cloud state must bound backup payload size');
assert.doesNotMatch(gymStateFunctionSource, /access-control-allow-origin['"]:\s*['"]\*/, 'Gym cloud state must not allow wildcard CORS');
assert.doesNotMatch(indexSource, /sdk\.scdn\.co\/spotify-player\.js/, 'Spotify SDK must not contact Spotify before the user connects');
assert.match(appSource, /loadSpotifySdk\(\)/, 'Spotify SDK must still load on demand for connected users');
assert.match(appSource, /state:\s*oauthState/, 'Spotify authorization must send an OAuth state value');
assert.match(appSource, /returnedState\s*!==\s*expectedState/, 'Spotify callbacks must reject a mismatched OAuth state');
assert.match(appSource, /file\.size\s*>\s*maxBackupBytes/, 'browser backup imports must be size-bounded before reading');
assert.match(appSource, /<details className="collectorInspector"/, 'owned album details must use a keyboard-accessible disclosure');
assert.match(appSource, /Collector(?:'|’)&?s details/, 'album detail must include the collector details inspector');
assert.match(appSource, /Why it matters to me/, 'collector details must label the private personal note clearly');
assert.match(appSource, /Mark this album as owned to add condition, shelf, edition, and personal story details\./, 'unowned albums must explain why collector details are unavailable');
assert.match(spotifyFunctionSource, /query\.length\s*>\s*maxQueryLength/, 'Spotify proxy queries must be bounded');
assert.match(spotifyFunctionSource, /allowSearch\(getClientIp\(request\)\)/, 'Spotify proxy use must be rate-limited');
assert.match(spotifyAuthFunctionSource, /readLimitedText\(request, maxBodyBytes\)/, 'Spotify auth bodies must be read with a byte limit');
assert.match(spotifyAuthFunctionSource, /isSameOriginRequest\(request\)/, 'Spotify cookie actions must reject cross-origin requests');
assert.match(spotifyAuthFunctionSource, /allowTokenAction\(getClientIp\(request\)\)/, 'Spotify token exchange and refresh must be rate-limited');

console.log('security tests passed');
