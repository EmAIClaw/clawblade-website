import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('../src/types.ts', import.meta.url), 'utf8');

assert.doesNotMatch(
  appSource,
  /Visual companions|visualCompanions|visualReferenceRail inline/,
  'album details should not include the generic Visual Companions section'
);

assert.match(
  typesSource,
  /export type ViewMode = "list" \| "grid" \| "shelf";/,
  'collection view modes should include Shelf'
);
assert.match(
  appSource,
  /className="viewToggle"[\s\S]*aria-label="Collection view"[\s\S]*aria-label="Shelf view"/,
  'the collection view switcher should expose a labeled Shelf option'
);
assert.match(
  appSource,
  /className="albumShelf"[\s\S]*role="list"[\s\S]*aria-label="Album shelf"/,
  'Shelf view should expose the physical-library rail as an accessible list'
);
assert.match(
  appSource,
  /className="shelfAlbumButton"[\s\S]*album\.rank[\s\S]*album\.title[\s\S]*album\.artist[\s\S]*collectionStatus/,
  'each shelf album should expose rank, title, artist, and collection state'
);
assert.match(
  appSource,
  /target instanceof HTMLInputElement[\s\S]*target instanceof HTMLTextAreaElement[\s\S]*target instanceof HTMLSelectElement/,
  'Shelf keyboard navigation should leave typing controls alone'
);
assert.match(
  appSource,
  /event\.key === "ArrowLeft"[\s\S]*event\.key === "ArrowRight"[\s\S]*nextButton\.focus\(\)/,
  'Left and Right arrows should move focus between shelf covers'
);
assert.match(
  appSource,
  /event\.key === "Enter"[\s\S]*openAlbum\(albumId\)/,
  'Enter should open the focused shelf album through the existing detail action'
);
assert.match(
  stylesSource,
  /\.albumShelf\s*\{[\s\S]*overflow-x:\s*auto;/,
  'the album shelf should remain horizontally usable at responsive sizes'
);
assert.match(
  stylesSource,
  /\.shelfAlbumButton:focus-visible \.shelfCoverFrame\s*\{[\s\S]*outline:/,
  'the focused shelf cover should have an intentional visible focus state'
);
assert.match(
  stylesSource,
  /\.shelfAlbumButton\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
  'shelf titles should not expand the cover grid beyond the fixed album width'
);
assert.match(
  stylesSource,
  /\.shelfCoverFrame\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow:\s*hidden;/,
  'shelf artwork should remain clipped to the fixed cover frame'
);
assert.match(
  appSource,
  /queue\.length > 0[\s\S]*Mark albums as owned to build your listening queue\./,
  'an empty listening queue should explain how to populate it'
);

assert.match(
  appSource,
  /aria-label="Open Now Playing"/,
  'the mini-player should expose an explicit expand control'
);
assert.match(
  appSource,
  /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="now-playing-title"/,
  'expanded Now Playing should be an accessible modal dialog'
);
assert.match(
  appSource,
  /event\.key === "Escape"[\s\S]*setExpanded\(false\)/,
  'expanded Now Playing should close with Escape'
);
assert.match(
  appSource,
  /<AlbumCover album=\{activeAlbum\}/,
  'expanded Now Playing should render the active album cover'
);
assert.match(
  appSource,
  /nowPlaying\.source === "spotify" \? "Spotify" : "Apple Music preview"/,
  'Now Playing should identify the active playback source'
);
assert.match(
  appSource,
  /className="nowPlayingPrimaryAction"[\s\S]*onClick=\{onToggle\}/,
  'expanded Now Playing should use the existing playback toggle action'
);
assert.match(
  stylesSource,
  /\.nowPlayingOverlay\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;[\s\S]*min-height:\s*100dvh;/,
  'the Now Playing overlay should fill the viewport'
);
assert.match(
  stylesSource,
  /\.nowPlayingBackdrop\s*\{[\s\S]*filter:\s*blur\(/,
  'the Now Playing overlay should include a blurred cover backdrop'
);

console.log('listening enhancement tests passed');
