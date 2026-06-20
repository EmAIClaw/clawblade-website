import assert from 'node:assert/strict';
import { albumVisualMood, youtubeAlbumSearchUrl } from '../src/listeningEnhancements.ts';

const darkSide = albumVisualMood({
  title: 'The Dark Side of the Moon',
  artist: 'Pink Floyd',
  year: 1973,
  genre: 'Rock',
  themes: ['Time and mortality', 'Mental illness and madness', 'Studio-as-instrument']
});

assert.equal(darkSide.paletteName, 'Cosmic prism');
assert.match(darkSide.className, /mood-cosmic-prism/);
assert.ok(darkSide.accentWords.includes('mortality'));
assert.equal(darkSide.motifs.length, 5);

const funkSoul = albumVisualMood({
  title: "What's Going On",
  artist: 'Marvin Gaye',
  year: 1971,
  genre: 'Soul',
  themes: ['Social Consciousness', 'War and conflict']
});
assert.equal(funkSoul.paletteName, 'Soul sunrise');
assert.match(funkSoul.className, /mood-soul-sunrise/);

const url = youtubeAlbumSearchUrl({ artist: 'Pink Floyd', title: 'The Dark Side of the Moon' });
assert.equal(
  url,
  'https://www.youtube.com/results?search_query=Pink+Floyd+The+Dark+Side+of+the+Moon+official+full+album+visualizer'
);

console.log('listening enhancement tests passed');
