import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCollectionStory } from '../src/tasteIntelligence.ts';

const catalog = JSON.parse(
  await readFile(new URL('../src/data/catalog.generated.json', import.meta.url), 'utf8')
).albums;

function albumAtRank(rank) {
  const album = catalog.find((item) => item.rank === rank);
  assert.ok(album, `catalog should include album ranked ${rank}`);
  return album;
}

const whatsGoingOn = albumAtRank(1);
const petSounds = albumAtRank(2);
const blue = albumAtRank(3);
const abbeyRoad = albumAtRank(5);
const now = new Date('2025-07-15T12:00:00.000Z');

const story = buildCollectionStory(
  catalog,
  {
    albums: {
      [whatsGoingOn.id]: { owned: true },
      [petSounds.id]: {
        owned: true,
        listened: true,
        listenCount: 2,
        lastListened: '2023-01-10T20:00:00.000Z'
      },
      [blue.id]: {
        owned: true,
        listened: true,
        listenCount: 1,
        lastListened: '2022-04-03T20:00:00.000Z'
      },
      [abbeyRoad.id]: { owned: true, listened: true }
    },
    sessions: [
      {
        id: 'blue-recent-session',
        albumId: blue.id,
        startedAt: '2025-06-20T19:00:00.000Z',
        completedAt: '2025-06-20T19:42:00.000Z',
        notes: '',
        checkedTracks: []
      }
    ],
    updatedAt: '2025-07-15T12:00:00.000Z'
  },
  now
);

assert.equal(
  story.arcStatement,
  'Your shelves travel from the 1960s to the 1970s, with Rock as the strongest thread.'
);
assert.equal(
  story.returnTo?.album.id,
  petSounds.id,
  'the return recommendation should use the oldest latest-listen date, not a stale album date'
);
assert.equal(story.returnTo?.lastListenedAt, '2023-01-10T20:00:00.000Z');
assert.equal(story.firstListen?.id, whatsGoingOn.id);

const insufficientHistory = buildCollectionStory(
  catalog,
  {
    albums: {
      [whatsGoingOn.id]: { owned: true, listened: true },
      [petSounds.id]: {
        owned: true,
        listened: true,
        lastListened: '2025-07-01T20:00:00.000Z'
      },
      [blue.id]: { owned: true }
    },
    sessions: [],
    updatedAt: '2025-07-15T12:00:00.000Z'
  },
  now
);

assert.equal(
  insufficientHistory.returnTo,
  null,
  'a listened flag without a date and a recent listen must not be described as long-unplayed'
);
assert.equal(
  insufficientHistory.firstListen?.id,
  blue.id,
  'owned records with explicit listening evidence must be excluded from first listens'
);

const sessionOnlyHistory = buildCollectionStory(
  catalog,
  {
    albums: {
      [whatsGoingOn.id]: { owned: true },
      [petSounds.id]: { owned: true }
    },
    sessions: [
      {
        id: 'pet-sounds-old-session',
        albumId: petSounds.id,
        startedAt: '2024-01-02T18:00:00.000Z',
        completedAt: '2024-01-02T18:40:00.000Z',
        notes: '',
        checkedTracks: []
      }
    ],
    updatedAt: '2025-07-15T12:00:00.000Z'
  },
  now
);

assert.equal(
  sessionOnlyHistory.returnTo?.album.id,
  petSounds.id,
  'a dated listening session should establish honest return history'
);
assert.equal(
  sessionOnlyHistory.firstListen?.id,
  whatsGoingOn.id,
  'a session must keep an album out of the unlistened pool even if its album flags are unset'
);

const emptyStory = buildCollectionStory(
  catalog,
  { albums: {}, sessions: [], updatedAt: '2025-07-15T12:00:00.000Z' },
  now
);

assert.equal(
  emptyStory.arcStatement,
  'Mark records as owned to reveal the decades and genres that shape your collection.'
);
assert.equal(emptyStory.returnTo, null);
assert.equal(emptyStory.firstListen, null);

const singleAlbumStory = buildCollectionStory(
  catalog,
  {
    albums: { [whatsGoingOn.id]: { owned: true } },
    sessions: [],
    updatedAt: '2025-07-15T12:00:00.000Z'
  },
  now
);

assert.equal(
  singleAlbumStory.arcStatement,
  'One owned record places your story in the 1970s through R&B/Soul. Add more to reveal an arc.'
);

console.log('taste intelligence tests passed');
