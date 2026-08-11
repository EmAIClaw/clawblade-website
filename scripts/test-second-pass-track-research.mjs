import assert from 'node:assert/strict';
import catalogData from '../src/data/catalog.generated.json' with { type: 'json' };
import encyclopediaData from '../src/data/encyclopedia.generated.json' with { type: 'json' };

const entries = encyclopediaData.entries ?? {};
const catalogIds = new Set((catalogData.albums ?? []).map((album) => album.id));

// Every entry below is an independently checked, track-specific source. Keep the
// exact URL and a claim-bearing phrase so a generic, mismatched, or broken-source
// replacement cannot silently retain this research coverage.
const vettedNotes = [
  ['109-radiohead-the-bends-71d0e718', 'Fake Plastic Trees', 'https://www.youtube.com/watch?v=n5h0qHwNrHk', 'Radiohead - Fake Plastic Trees', 'artist-channel video'],
  ['109-radiohead-the-bends-71d0e718', 'Just', 'https://www.youtube.com/watch?v=oIFLtNYI3Ls', 'Radiohead - Just', 'artist-channel video'],
  ['109-radiohead-the-bends-71d0e718', 'Street Spirit (Fade Out)', 'https://www.youtube.com/watch?v=LCJblaUkkfc', 'Radiohead - Street Spirit (Fade Out)', 'artist-channel video'],
  ['112-the-strokes-is-this-it-10c57aaf', 'Last Nite', 'https://www.youtube.com/watch?v=TOypSnKFHrE', 'The Strokes - Last Nite (Official HD Video)', 'artist-authorized video'],
  ['120-nine-inch-nails-the-downward-spiral-a2680461', 'Closer', 'https://www.youtube.com/watch?v=PTFwQP86BRs', "Nine Inch Nails - Closer (Director's Cut)", 'director’s-cut video'],
  ['122-u2-achtung-baby-23b4d4cc', 'One', 'https://www.youtube.com/watch?v=ftjEcrrf7r0', 'U2 - One (Official Music Video)', 'artist-authorized video'],
  ['152-jay-z-the-black-album-9747cc3a', '99 Problems', 'https://www.songfacts.com/facts/jay-z/99-problems', '99 Problems by Jay-Z', "Chris Rock suggested reworking Ice-T's earlier song"],
  ['154-oasis-what-s-the-story-morning-glory-2d34d88a', 'Wonderwall', 'https://www.songfacts.com/facts/oasis/wonderwall', 'Wonderwall by Oasis', 'imaginary friend who would save you from yourself'],
  ['157-pearl-jam-ten-4e010abd', 'Jeremy', 'https://www.songfacts.com/facts/pearl-jam/jeremy', 'Jeremy by Pearl Jam', 'Jeremy Delle'],
  ['156-the-police-synchronicity-e8507abf', 'Every Breath You Take (Remastered 2003)', 'https://www.songfacts.com/facts/the-police/every-breath-you-take', 'Every Breath You Take by The Police', 'jealousy, surveillance and ownership'],
  ['168-nirvana-in-utero-077302d9', 'Heart-Shaped Box', 'https://www.songfacts.com/facts/nirvana/heart-shaped-box', 'Heart-Shaped Box by Nirvana', 'children with cancer inspired the song'],
  ['170-kendrick-lamar-damn-ec54ad67', 'DUCKWORTH.', 'https://www.songfacts.com/facts/kendrick-lamar/duckworth', 'DUCKWORTH. by Kendrick Lamar', "Kenny 'Ducky' Duckworth and Anthony 'Top Dawg' Tiffith"],
  ['176-bob-dylan-bring-it-all-back-home-f760e4cc', 'Subterranean Homesick Blues', 'https://www.songfacts.com/facts/bob-dylan/subterranean-homesick-blues', 'Subterranean Homesick Blues by Bob Dylan', "Chuck Berry's 'Too Much Monkey Business'"],
  ['186-beastie-boys-licensed-to-ill-3217cbc2', 'Paul Revere', 'https://www.songfacts.com/facts/beastie-boys/paul-revere', 'Paul Revere by Beastie Boys', 'Once Upon a Time in the West'],
  ['188-michael-jackson-bad-4d97fac9', 'Smooth Criminal', 'https://www.songfacts.com/facts/michael-jackson/smooth-criminal', 'Smooth Criminal by Michael Jackson', "question to Annie"],
  ['197-nick-drake-pink-moon-4576ff4a', 'Pink Moon', 'https://www.songfacts.com/facts/nick-drake/pink-moon', 'Pink Moon by Nick Drake', "Volkswagen's 1999 'Milky Way' Cabriolet advertisement"],
  ['200-rage-against-the-machine-rage-against-the-machine-fa5282b5', 'Killing in the Name', 'https://www.songfacts.com/facts/rage-against-the-machine/killing-in-the-name', 'Killing In The Name by Rage Against the Machine', 'Ku Klux Klan']
];

for (const [albumId, trackTitle, url, title, claim] of vettedNotes) {
  assert.ok(catalogIds.has(albumId), `${albumId}: must remain a catalog album`);
  const guide = entries[albumId]?.trackGuide?.find((item) => item?.trackTitle === trackTitle);
  assert.ok(guide, `${albumId}: ${trackTitle} must retain a track guide`);
  assert.equal(guide.source?.url, url, `${albumId}: ${trackTitle} must retain its verified track-specific source URL`);
  assert.equal(guide.source?.title, title, `${albumId}: ${trackTitle} must retain its verified source title`);
  assert.match(guide.guide ?? '', new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${albumId}: ${trackTitle} must retain its source-supported claim`);
  assert.ok((guide.focus ?? '').trim().length >= 12, `${albumId}: ${trackTitle} requires a substantive listening focus`);
}

console.log(`second-pass research regression test passed: ${vettedNotes.length} verified track-specific notes`);
