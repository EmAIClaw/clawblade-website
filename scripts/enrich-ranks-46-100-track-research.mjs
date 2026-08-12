import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const updates = {
  '046-ramones-ramones-edae8dcf': [
    ['Beat On the Brat', 'Joey Ramone said he wrote this Ramones debut-album track about spoiled children in Queens, while tracing its opening chord change to bubblegum songs such as “Chewy Chewy” and “Yummy Yummy Yummy.”', 'Hear how a bubblegum-derived chord move collides with the song’s blunt refrain. That tension is a concrete part of its joke and its attack.', 'Songfacts', 'Beat On The Brat by Ramones', 'https://www.songfacts.com/facts/ramones/beat-on-the-brat', 'Songfacts quotes Joey Ramone on the Queens inspiration and the bubblegum-song chord change.'],
    ['Judy Is a Punk', 'Joey Ramone’s short fictional story follows Jackie and Judy toward the Symbionese Liberation Army, a group then known for the 1974 Patty Hearst kidnapping; the band had honed it in New York performances before recording it.', 'Treat its 90 seconds as a compressed street narrative, not a vague punk pose. The named characters and current-events reference give its speed a specific setting.', 'Songfacts', 'Judy Is A Punk by Ramones', 'https://www.songfacts.com/facts/ramones/judy-is-a-punk', 'Songfacts identifies Joey Ramone as writer, describes the fictional Jackie and Judy story, and notes its early performance history.'],
    ['53rd & 3rd', 'Written by Dee Dee Ramone, this song is set at the real Manhattan intersection once associated with young male sex workers; it was among the songs Ramones performed in their early CBGB-era club sets.', 'Listen to the narrator’s location before reducing the track to shock value. The corner supplies a precise New York setting for its uneasy first-person story.', 'Songfacts', '53rd & 3rd by Ramones', 'https://www.songfacts.com/facts/ramones/53rd-3rd', 'Songfacts describes the real intersection, Dee Dee Ramone’s authorship, subject matter, and early Ramones performances.']
  ],
  '097-taylor-swift-red-6f0a0ed0': [
    ['Red', 'Swift described “Red” as a song about emotions so intense that she associated them with the color red; she wrote it and co-produced it with Nathan Chapman and Dann Huff.', 'Follow the color changes in the lyric rather than treating “red” as a generic title. The song uses them to map the changing intensity of a remembered relationship.', 'Songfacts', 'Red by Taylor Swift', 'https://www.songfacts.com/facts/taylor-swift/red', 'Songfacts quotes Swift’s explanation of the color metaphor and lists the song’s co-producers.']
  ],
  '099-led-zeppelin-led-zeppelin-2cd653a3': [
    ['Dazed and Confused', 'Led Zeppelin’s version developed from a Jake Holmes song that Jimmy Page had heard while playing with the Yardbirds; Holmes’s original supplied key elements including its walking bass line and ominous mood.', 'Listen for the walking bass and escalating tension before treating the track as a free-form showcase. Its heavy atmosphere begins with a documented earlier song framework.', 'Songfacts', 'Dazed And Confused by Led Zeppelin', 'https://www.songfacts.com/facts/led-zeppelin/dazed-and-confused', 'Songfacts documents Jake Holmes’s earlier song, Page hearing it with the Yardbirds, and elements carried into Led Zeppelin’s version.']
  ],
  '100-willie-nelson-red-headed-stranger-9f5e6dd0': [
    ['Can I Sleep in Your Arms', 'Willie Nelson uses “Can I Sleep in Your Arms” within the narrative sequence of Red Headed Stranger, the 1975 concept album built around the title character and his grief.', 'Place this request for shelter inside the album’s story rather than hearing it as an isolated love song. Its role is part of the record’s unfolding narrative.', 'Songfacts', 'Red Headed Stranger by Willie Nelson', 'https://www.songfacts.com/facts/willie-nelson/red-headed-stranger', 'Songfacts describes Red Headed Stranger as a 1975 concept album and names Can I Sleep in Your Arms among the tracks that tell its story.']
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
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 46, 97, 99, and 100.`);
