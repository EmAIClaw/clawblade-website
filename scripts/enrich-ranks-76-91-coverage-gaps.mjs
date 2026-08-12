import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const updates = {
  '076-elvis-presley-the-sun-sessions-adb13ddd': [
    ['That’s All Right', 'Elvis Presley’s first Sun single recast Arthur Crudup’s blues song as a compact rockabilly performance; Sam Phillips produced the 1954 recording.', 'Start with the speed and snap of Presley’s remake. The arrangement turns an older blues composition into the sound of the Sun Sessions breakthrough.', 'Wikipedia', "That's All Right", 'https://en.wikipedia.org/wiki/That%27s_All_Right', 'Track page documents Crudup’s composition, Presley’s 1954 Sun recording, and Sam Phillips production.'],
    ['Blue Moon of Kentucky', 'Presley paired his Sun debut with Bill Monroe’s bluegrass standard, shifting its tempo across the performance and putting country and rhythm-and-blues vocabulary on the same single.', 'Listen for the tempo change. It is a concrete clue to the record’s cross-genre move rather than a decorative flourish.', 'Wikipedia', 'Blue Moon of Kentucky', 'https://en.wikipedia.org/wiki/Blue_Moon_of_Kentucky', 'Track page documents Bill Monroe’s song and Presley’s 1954 Sun recording.'],
    ['Mystery Train', 'Presley recorded this 1955 Sun single after Junior Parker’s original; the track’s train image and stripped rhythmic drive became a durable rockabilly model.', 'Keep the forward pull in view: the performance makes the train metaphor physical through repetition and momentum.', 'Songfacts', 'Mystery Train by Elvis Presley', 'https://www.songfacts.com/facts/elvis-presley/mystery-train', 'Track-specific editorial reference for Presley’s Mystery Train.']
  ],
  '083-john-lennon-plastic-ono-band-3b6435aa': [
    ['Mother', 'Lennon made this opening song a direct confrontation with parental abandonment, beginning with funeral-bell sound before the vocal turns increasingly exposed.', 'Follow the movement from the repeated bell to the final cries. The arrangement does not soften the song’s subject; it steadily removes distance from it.', 'Songfacts', 'Mother by John Lennon', 'https://www.songfacts.com/facts/john-lennon/mother', 'Track-specific editorial reference for Lennon’s Mother.'],
    ['Working Class Hero', 'This bare acoustic performance attacks the institutions that shape and contain ordinary lives; Lennon recorded it in two takes for Plastic Ono Band.', 'Listen to how the unadorned guitar leaves the argument nowhere to hide. The sparseness makes the lyric’s accusation feel deliberate rather than theatrical.', 'Songfacts', 'Working Class Hero by John Lennon', 'https://www.songfacts.com/facts/john-lennon/working-class-hero', 'Track-specific editorial reference for Lennon’s Working Class Hero.'],
    ['God', 'Lennon uses “God is a concept by which we measure our pain” to frame a catalogue of beliefs he rejects before closing on personal self-definition.', 'Pay attention to the sequence of renunciations. The song’s power comes from its plain, cumulative structure, not from a big instrumental release.', 'Songfacts', 'God by John Lennon', 'https://www.songfacts.com/facts/john-lennon/god', 'Track-specific editorial reference for Lennon’s God.']
  ],
  '088-neil-young-after-the-gold-rush-50ed1c3d': [
    ['After the Gold Rush', 'Young’s title song moves through a dreamlike sequence of environmental ruin, medieval imagery and a future escape, making ambiguity part of its design rather than a gap to solve.', 'Listen for the piano-led restraint beneath the surreal images. The song keeps changing scale—from private vision to planetary anxiety—without explaining itself away.', 'Songfacts', 'After The Gold Rush by Neil Young', 'https://www.songfacts.com/facts/neil-young/after-the-gold-rush', 'Track-specific editorial reference for Neil Young’s After the Gold Rush.'],
    ['Only Love Can Break Your Heart', 'Young wrote this comparatively gentle song for Graham Nash after Nash’s breakup with Joni Mitchell, giving the record a direct song of consolation amid its stranger material.', 'Notice how the inviting melody carries advice rather than certainty. Its warmth is specific: it is addressed to someone already hurt.', 'Songfacts', 'Only Love Can Break Your Heart by Neil Young', 'https://www.songfacts.com/facts/neil-young/only-love-can-break-your-heart', 'Track-specific editorial reference for Neil Young’s Only Love Can Break Your Heart.'],
    ['Southern Man', 'Young’s furious song confronts racism in the American South; its target later drew a musical response from Lynyrd Skynyrd, extending the song’s argument beyond the album.', 'Follow the recurring question in the chorus. The performance is confrontational because it refuses to let historical violence become background scenery.', 'Songfacts', 'Southern Man by Neil Young', 'https://www.songfacts.com/facts/neil-young/southern-man', 'Track-specific editorial reference for Neil Young’s Southern Man.']
  ],
  '090-the-jimi-hendrix-experience-axis-bold-as-love-d46b04cd': [
    ['Spanish Castle Magic', 'Hendrix named this song for a dance hall near Seattle where he played as a teenager, converting a real venue into a larger-than-life destination.', 'Hear the riff as an invitation into an imagined place. The song turns a local memory into psychedelic geography.', 'Songfacts', 'Spanish Castle Magic by Jimi Hendrix', 'https://www.songfacts.com/facts/jimi-hendrix/spanish-castle-magic', 'Track-specific editorial reference for Hendrix’s Spanish Castle Magic.'],
    ['Little Wing', 'Hendrix wrote this brief ballad after the Monterey Pop Festival, drawing on the women he saw there and building its atmosphere around a concise guitar introduction.', 'Stay with the opening guitar figure before treating the song as a solo showcase. Its economy is central: the atmosphere arrives quickly and disappears quickly.', 'Songfacts', 'Little Wing by Jimi Hendrix', 'https://www.songfacts.com/facts/jimi-hendrix/little-wing', 'Track-specific editorial reference for Hendrix’s Little Wing.'],
    ['Castles Made of Sand', 'Hendrix tells three miniature stories of lives overturned, then joins them with the image of castles disappearing into the sea; the song is one of Axis’s most narrative performances.', 'Follow the separate verses as complete scenes. The recurring image binds them without pretending that the losses have the same cause or scale.', 'Songfacts', 'Castles Made Of Sand by Jimi Hendrix', 'https://www.songfacts.com/facts/jimi-hendrix/castles-made-of-sand', 'Track-specific editorial reference for Hendrix’s Castles Made of Sand.']
  ],
  '091-missy-elliott-supa-dupa-fly-f198c824': [
    ['Sock It 2 Me', 'Elliott’s second Supa Dupa Fly single features Da Brat and reworks the Delfonics’ “Ready or Not Here I Come” in a slightly re-recorded single version.', 'Listen for how the borrowed Delfonics element anchors a deliberately contemporary rap performance. The feature changes the song’s voice without turning it into a conventional duet.', 'Wikipedia', 'Sock It 2 Me', 'https://en.wikipedia.org/api/rest_v1/page/summary/Sock_It_2_Me', 'Track-page summary documents the Da Brat feature, single version, and Delfonics sample.']
  ]
};

const data = JSON.parse(await readFile(dataPath, 'utf8'));
for (const [albumId, notes] of Object.entries(updates)) {
  const guides = data.entries?.[albumId]?.trackGuide;
  if (!Array.isArray(guides)) throw new Error(`${albumId}: missing track guide`);
  for (const [trackTitle, guide, focus, label, title, url, summary] of notes) {
    const target = guides.find((item) => item.trackTitle === trackTitle);
    if (!target) throw new Error(`${albumId}: missing ${trackTitle}`);
    Object.assign(target, { guide, focus, source: { label, title, url, summary } });
  }
}
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 76, 83, 88, 90, and 91.`);
