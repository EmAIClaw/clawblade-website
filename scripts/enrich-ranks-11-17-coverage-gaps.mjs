import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const source = (title, url) => ({ label: 'Songfacts', title, url, summary: `Track-specific editorial reference for ${title}.` });
const updates = {
  '011-the-beatles-revolver-b4f3c550': [
    ['Taxman', 'George Harrison opens Revolver with a sharp complaint about Britain’s supertax rate, turning an everyday financial grievance into the album’s first burst of bite.', 'Listen for how the clipped guitar figure gives the satire its hard edge; the song begins Revolver with a complaint that moves like a riff.', 'Taxman by The Beatles', 'https://www.songfacts.com/facts/the-beatles/taxman'],
    ['Eleanor Rigby', 'McCartney’s portrait of Eleanor Rigby and Father McKenzie abandons the Beatles’ usual band instrumentation for a string octet, placing two lonely fictional figures in parallel.', 'Keep the strings in focus. Their tight, percussive attack makes the song’s loneliness feel staged with unusual precision.', 'Eleanor Rigby by The Beatles', 'https://www.songfacts.com/facts/the-beatles/eleanor-rigby'],
    ['Tomorrow Never Knows', 'Lennon based the lyric on Timothy Leary’s adaptation of The Tibetan Book of the Dead, while the recording uses tape loops and studio processing to make Revolver end in altered perspective.', 'Treat the repeated drone and loops as the song’s form, not background texture. The sound is designed to unsettle ordinary verse-and-chorus expectation.', 'Tomorrow Never Knows by The Beatles', 'https://www.songfacts.com/facts/the-beatles/tomorrow-never-knows']
  ],
  '012-michael-jackson-thriller-a46ba2f6': [
    ['Thriller', 'Rod Temperton wrote this title track as a cinematic horror story, and Vincent Price’s spoken passage turns its final section into a miniature radio play.', 'Follow the transition into Price’s narration. The song deliberately makes theatrical suspense part of its pop-hook architecture.', 'Thriller by Michael Jackson', 'https://www.songfacts.com/facts/michael-jackson/thriller'],
    ['Beat It', 'Jackson wanted a rock song that could work for a pop audience; Eddie Van Halen supplied the celebrated guitar solo, giving Thriller a deliberate crossover flashpoint.', 'Listen for the moment the guitar solo changes the record’s scale. It is a crossover decision built into the arrangement, not an ornamental guest spot.', 'Beat It by Michael Jackson', 'https://www.songfacts.com/facts/michael-jackson/beat-it'],
    ['Billie Jean', 'Jackson’s account of a woman claiming he fathered her child is built around an insistent bass line and a tightly controlled vocal narrative.', 'Stay with the bass line as the story unfolds. Its persistence mirrors the narrator’s attempt to hold a boundary against an accusation.', 'Billie Jean by Michael Jackson', 'https://www.songfacts.com/facts/michael-jackson/billie-jean']
  ],
  '013-aretha-franklin-i-never-loved-a-man-the-way-i-love-you-e41a23cf': [
    ['Respect', 'Franklin remade Otis Redding’s song from a man’s demand into a woman’s declaration, adding the “R-E-S-P-E-C-T” spelling and the “sock it to me” refrain.', 'Follow the response vocals around the spelling section. Franklin transforms the song’s point of view through arrangement as well as lyric.', 'Respect by Aretha Franklin', 'https://www.songfacts.com/facts/aretha-franklin/respect'],
    ['I Never Loved a Man (The Way I Love You)', 'Franklin’s first Atlantic single sets devotion against betrayal, and its Muscle Shoals session established the lean, gospel-shaped sound of the album.', 'Listen to the space around Franklin’s phrases. The band leaves room for the vocal to make each shift from tenderness to warning land.', 'I Never Loved a Man (The Way I Love You) by Aretha Franklin', 'https://www.songfacts.com/facts/aretha-franklin/i-never-loved-a-man-the-way-i-love-you'],
    ['Do Right Woman, Do Right Man', 'Written by Dan Penn and Chips Moman, this song asks for mutual respect rather than one-sided devotion, giving Franklin a direct moral counterpart to the album’s tougher moments.', 'Hear the calmness as part of the demand. The performance does not need to raise its voice to make reciprocity sound non-negotiable.', 'Do Right Woman, Do Right Man by Aretha Franklin', 'https://www.songfacts.com/facts/aretha-franklin/do-right-woman-do-right-man']
  ],
  '014-the-rolling-stones-exile-on-main-st-9d89aa7d': [
    ['Rocks Off', 'The opening track introduces Exile on Main St. with a dense, shifting groove and a lyric caught between sexual appetite, drugs and disorientation.', 'Listen for the way the arrangement keeps changing its footing. That instability is the song’s point: it opens the album already off balance.', 'Rocks Off by The Rolling Stones', 'https://www.songfacts.com/facts/the-rolling-stones/rocks-off'],
    ['Tumbling Dice', 'Jagger and Richards use gambling language to frame a character who will not be pinned down; the loose groove gives the song its rolling, evasive character.', 'Follow the rhythmic lilt rather than looking for a clean resolution. The performance keeps moving like the unreliable gambler it describes.', 'Tumbling Dice by The Rolling Stones', 'https://www.songfacts.com/facts/the-rolling-stones/tumbling-dice'],
    ['Happy', 'Keith Richards takes the lead vocal on this Exile single, recorded quickly at Nellcôte with producer Jimmy Miller playing drums.', 'Notice the change in vocal personality. Richards’s lead makes the song a lived-in counterweight to Jagger’s usual command of the record.', 'Happy by The Rolling Stones', 'https://www.songfacts.com/facts/the-rolling-stones/happy']
  ],
  '015-public-enemy-it-takes-a-nation-of-millions-to-hold-us-back-749205b0': [
    ['Bring the Noise', 'Public Enemy’s early anthem layers Chuck D’s forceful delivery over the Bomb Squad’s dense sample collage, making sound itself part of the group’s political pressure.', 'Listen for the crowding of the mix. The track refuses a clean hierarchy between beat, noise and voice.', 'Bring the Noise by Public Enemy', 'https://www.songfacts.com/facts/public-enemy/bring-the-noise'],
    ["Don't Believe the Hype", 'Chuck D uses this track to challenge the stories told about Public Enemy and the assumptions carried by media framing, with Flavor Flav’s interruptions sharpening the group dynamic.', 'Track the exchange between Chuck D and Flavor Flav. Their contrast makes the argument sound like a public confrontation rather than a solitary lecture.', "Don't Believe the Hype by Public Enemy", 'https://www.songfacts.com/facts/public-enemy/dont-believe-the-hype'],
    ['Rebel Without a Pause', 'This Public Enemy track gives Chuck D a relentless, high-speed platform over the Bomb Squad’s compressed noise, making refusal sound like forward motion.', 'Listen for the siren-like high end and the unbroken pace. The arrangement makes its title feel like an operating method rather than a slogan.', 'Rebel Without a Pause by Public Enemy', 'https://www.songfacts.com/facts/public-enemy/rebel-without-a-pause']
  ],
  '016-the-clash-london-calling-7d75cf05': [
    ['London Calling', 'Joe Strummer’s title song turns fears about nuclear disaster, flooding and social crisis into an alarm-call, with the band playing reggae-influenced tension against punk urgency.', 'Let the bass-led opening establish the warning before the chorus arrives. The song’s drama is built from restraint as much as speed.', 'London Calling by The Clash', 'https://www.songfacts.com/facts/the-clash/london-calling'],
    ['The Guns of Brixton', 'Paul Simonon wrote and sang this reggae-rooted warning from the perspective of a young man prepared to resist police pressure in Brixton.', 'Focus on Simonon’s lower vocal and the dub-inflected pulse. They give the threat a different authority from Strummer’s usual attack.', 'The Guns of Brixton by The Clash', 'https://www.songfacts.com/facts/the-clash/the-guns-of-brixton'],
    ['Lost In the Supermarket', 'Strummer wrote this suburban alienation song from Mick Jones’s childhood perspective, making domestic consumer space feel detached and unreal.', 'Listen to the pop brightness against the narrator’s disconnection. The contrast keeps the song from becoming a simple sneer at suburbia.', 'Lost in the Supermarket by The Clash', 'https://www.songfacts.com/facts/the-clash/lost-in-the-supermarket']
  ],
  '017-kanye-west-my-beautiful-dark-twisted-fantasy-6d18b087': [
    ['Power', 'West built “Power” around a sample from King Crimson’s “21st Century Schizoid Man,” turning its abrasive guitar into a platform for a public self-portrait under pressure.', 'Listen for the sample’s harshness beneath the controlled cadence. The track makes grandiosity sound both commanding and unstable.', 'Power by Kanye West', 'https://www.songfacts.com/facts/kanye-west/power'],
    ['All of the Lights', 'West assembled a large cast of guest vocalists around a song about a man returning from prison and trying to reconnect with his family.', 'Follow how the stacked voices enlarge a private crisis. The arrangement’s scale makes the narrator’s return sound celebratory and troubled at once.', 'All of the Lights by Kanye West', 'https://www.songfacts.com/facts/kanye-west/all-of-the-lights'],
    ['Runaway (feat. Pusha T)', 'West uses the song’s extended toast to “douchebags” and an Auto-Tuned closing coda to turn apology, self-satire and spectacle into the record’s central performance.', 'Stay through the distorted vocal coda. It prevents the polished piano opening from settling into a conventional confession.', 'Runaway by Kanye West', 'https://www.songfacts.com/facts/kanye-west/runaway']
  ]
};
const data = JSON.parse(await readFile(dataPath, 'utf8'));
for (const [albumId, notes] of Object.entries(updates)) {
  const guides = data.entries?.[albumId]?.trackGuide;
  if (!Array.isArray(guides)) throw new Error(`${albumId}: missing track guide`);
  for (const [trackTitle, guide, focus, title, url] of notes) {
    const target = guides.find((item) => item.trackTitle === trackTitle);
    if (!target) throw new Error(`${albumId}: missing ${trackTitle}`);
    Object.assign(target, { guide, focus, source: source(title, url) });
  }
}
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 11–17.`);
