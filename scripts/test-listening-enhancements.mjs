import assert from 'node:assert/strict';
import {
  albumVisualMood,
  albumVisualReferenceOptions,
  wikipediaArtistUrl,
  wikimediaCommonsSearchUrl,
  youtubeAlbumSearchUrl
} from '../src/listeningEnhancements.ts';

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

assert.equal(wikipediaArtistUrl('Pink Floyd'), 'https://en.wikipedia.org/wiki/Pink_Floyd');
assert.equal(
  wikimediaCommonsSearchUrl('Pink Floyd band'),
  'https://commons.wikimedia.org/w/index.php?search=Pink+Floyd+band&title=Special%3AMediaSearch&type=image'
);

const visualReferences = albumVisualReferenceOptions({ artist: 'Pink Floyd', title: 'The Dark Side of the Moon' }, true);
assert.equal(visualReferences.length, 3, 'owned albums should expose Wikipedia, Commons, and YouTube visual references');
assert.equal(visualReferences[0].label, 'Artist page');
assert.match(visualReferences[1].url, /commons\.wikimedia\.org/);
assert.match(visualReferences[2].url, /youtube\.com/);

const unownedReferences = albumVisualReferenceOptions({ artist: 'Pink Floyd', title: 'The Dark Side of the Moon' }, false);
assert.equal(unownedReferences.length, 1, 'unowned albums should only show low-friction YouTube visualizer search');

console.log('listening enhancement tests passed');
