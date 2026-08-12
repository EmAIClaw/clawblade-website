import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const source = (title, url, summary) => ({ label: 'Songfacts', title, url, summary });
const updates = {
  '049-chuck-berry-the-great-twenty-eight-8133970a': [
    ['Maybellene', 'Chuck Berry developed “Maybellene” from Bob Wills and the Texas Playboys’ “Ida Red,” reshaping it into a fast-car story after Leonard Chess asked him to change its working title. It was the first song Berry’s band recorded, after 36 takes.', 'Listen for the collision of country-source material and a car-chase lyric. The direct source documents both the “Ida Red” starting point and the unusually laborious first recording session.', 'Maybellene by Chuck Berry', 'https://www.songfacts.com/facts/chuck-berry/maybellene', 'Songfacts documents the Ida Red origin, Leonard Chess title request, car-story rewrite, and 36-take first recording session.'],
    ['Roll Over Beethoven', 'Chuck Berry wrote “Roll Over Beethoven” as rock and roll was displacing classical music in popular culture; the title began as a joke aimed at his younger sister Lucy, who played classical piano. Its guitar introduction draws on Carl Hogan’s part on Louis Jordan’s “Ain’t That Just Like a Woman.”', 'Follow the guitar opening as a specific lineage rather than generic rock-and-roll energy: the source connects it to Carl Hogan and Louis Jordan while explaining the title’s family-piano origin.', 'Roll Over Beethoven by Chuck Berry', 'https://www.songfacts.com/facts/chuck-berry/roll-over-beethoven', 'Songfacts documents the song’s rock-versus-classical premise, Lucy Berry origin, and Carl Hogan/Louis Jordan guitar-introduction lineage.'],
    ['Johnny B. Goode', 'Chuck Berry based “Johnny B. Goode” on his own life, turning a St. Louis musician into a Louisiana guitar prodigy. The name “Johnny” came from pianist Johnnie Johnson, and the guitar materials include an introduction traced to Louis Jordan and a break traced to T-Bone Walker.', 'Treat the guitar hero as Berry’s deliberately revised self-portrait. The direct source identifies the real-life model, Johnnie Johnson name, and two older guitar sources woven into the record.', 'Johnny B. Goode by Chuck Berry', 'https://www.songfacts.com/facts/chuck-berry/johnny-b-goode', 'Songfacts documents Berry’s autobiographical basis, Johnnie Johnson naming influence, and the Louis Jordan and T-Bone Walker guitar precedents.']
  ],
  '050-david-bowie-station-to-station-d60364f2': [
    ['Station to Station', 'The title track introduces David Bowie’s Thin White Duke persona by name and is built in four movements. Bowie later recalled directing guitarist Earl Slick to repeat a Chuck Berry riff at the opening, while the lyric incorporates occult references including Kether and Malkuth.', 'Hear the long opening as a designed threshold: the direct source identifies both Earl Slick’s repeated Chuck Berry riff and the Thin White Duke’s only explicit naming in a Bowie song.', 'Station to Station by David Bowie', 'https://www.songfacts.com/facts/david-bowie/station-to-station', 'Songfacts documents the Thin White Duke naming, four-movement form, Earl Slick’s repeated Chuck Berry riff, and Kether/Malkuth references.'],
    ['Golden Years', 'David Bowie wrote “Golden Years” intending to give it to Elvis Presley, who reportedly declined it. Bowie then performed it on Soul Train in November 1975; producer Harry Maslin said an old RCA microphone created the backing vocals’ “round” quality.', 'Use the Soul Train appearance and the backing-vocal sound as concrete hooks: the direct source records both Bowie’s intended Presley handoff and Maslin’s explanation of the vocal texture.', 'Golden Years by David Bowie', 'https://www.songfacts.com/facts/david-bowie/golden-years', 'Songfacts documents Bowie’s intended Elvis Presley handoff, the 1975 Soul Train performance, and Harry Maslin’s account of the backing-vocal microphone choice.'],
    ['TVC15', 'David Bowie wrote “TVC 15” after hearing Iggy Pop’s drug-induced hallucination that a girlfriend was being consumed by a television set. Keyboardist Roy Bittan recalls Bowie asking him to play in the style of New Orleans pianist Professor Longhair.', 'Listen for Roy Bittan’s piano as an intentional stylistic cue, not incidental decoration. The direct source links the song’s television image to Iggy Pop’s story and names Professor Longhair as Bowie’s keyboard reference.', 'TVC 15 by David Bowie', 'https://www.songfacts.com/facts/david-bowie/tvc-15', 'Songfacts documents the Iggy Pop hallucination origin and Roy Bittan’s account of Bowie requesting a Professor Longhair-style piano part.']
  ]
};

const data = JSON.parse(await readFile(dataPath, 'utf8'));
for (const [albumId, notes] of Object.entries(updates)) {
  const guides = data.entries?.[albumId]?.trackGuide;
  if (!Array.isArray(guides)) throw new Error(`${albumId}: missing track guide`);
  for (const [trackTitle, guide, focus, title, url, summary] of notes) {
    const target = guides.find((item) => item.trackTitle === trackTitle);
    if (!target) throw new Error(`${albumId}: missing ${trackTitle}`);
    Object.assign(target, { guide, focus, source: source(title, url, summary) });
  }
}
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 49–50.`);
