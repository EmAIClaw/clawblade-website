import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const source = (title, url, summary) => ({ label: 'Wikipedia', title, url, summary });
const updates = {
  '032-beyonce-lemonade-d3bb0f63': [
    ['Hold Up', 'Beyoncé’s Lemonade track “Hold Up” credits a wide writing group including Diplo, Ezra Koenig, Emile Haynie, Josh Tillman, MNEK and MeLo-X; it was later serviced as the album’s third single.', 'Keep the densely credited construction in mind: this is a Lemonade track built through a large collaborative writing team, not a lone-confessional performance.', 'Hold Up (song)', 'https://en.wikipedia.org/wiki/Hold_Up_(song)', 'Track page identifies the Lemonade album placement, single release, and credited writers.'],
    ['Sorry', '“Sorry” is an electro-R&B and electropop Lemonade single produced by Beyoncé, Diana Gordon and MeLo-X; its lyric addresses a partner’s betrayal.', 'Listen for the drum beats, synthesisers and bells shaping the song’s thumping rhythm around its pointed breakup address.', 'Sorry (Beyoncé song)', 'https://en.wikipedia.org/wiki/Sorry_(Beyonc%C3%A9_song)', 'Track page identifies the producers, musical elements, and betrayal-centred lyric.'],
    ['6 Inch', 'Beyoncé’s “6 Inch” features the Weeknd and occupies the fifth-track slot on Lemonade; its video appears within Beyoncé’s 2016 Lemonade film.', 'Treat the Weeknd feature as part of the album-film sequence: the source places this song both in the ordered record and its visual companion.', '6 Inch', 'https://en.wikipedia.org/wiki/6_Inch', 'Track page identifies the Weeknd feature, Lemonade track position, and film appearance.']
  ],
  '033-amy-winehouse-back-to-black-4e0a725a': [
    ['Rehab', 'Winehouse wrote and recorded “Rehab” for Back to Black with Mark Ronson producing; its refusal-to-enter-rehabilitation lyric is autobiographical.', 'The directness is the point: hear how a personal refusal becomes the song’s repeated centre rather than a detail hidden in metaphor.', 'Rehab (Amy Winehouse song)', 'https://en.wikipedia.org/wiki/Rehab_(Amy_Winehouse_song)', 'Track page identifies Winehouse as writer, Ronson as producer, and the autobiographical rehabilitation subject.'],
    ["You Know I'm No Good", 'Winehouse wrote and performed this Back to Black song as a solo recording; a separate remix adds Ghostface Killah and appears on his More Fish album.', 'Use the solo album version as the reference point. The later Ghostface Killah remix is a distinct reworking, not the form Back to Black presents.', "You Know I'm No Good", 'https://en.wikipedia.org/wiki/You_Know_I%27m_No_Good', 'Track page distinguishes Winehouse’s original solo album recording from the Ghostface Killah remix.'],
    ['Back to Black', 'Winehouse and Mark Ronson wrote “Back to Black,” with Ronson producing; Winehouse drew it from her relationship with Blake Fielder-Civil after he returned to an ex-girlfriend.', 'Listen to the title song as an aftermath narrative with a documented personal trigger, rather than as a generic retro-soul lament.', 'Back to Black (song)', 'https://en.wikipedia.org/wiki/Back_to_Black_(song)', 'Track page identifies the co-writing, Ronson production, and stated relationship inspiration.']
  ],
  '034-stevie-wonder-innervisions-d09c9a35': [
    ['Living For the City', 'Wonder released “Living for the City” as a 1973 single from Innervisions; it reached number one on Billboard’s R&B chart.', 'Place this narrative in Innervisions’ original release moment: the source identifies it as a 1973 album single rather than a later retrospective staple.', 'Living for the City', 'https://en.wikipedia.org/wiki/Living_for_the_City', 'Track page identifies the Innervisions release and its R&B-chart result.'],
    ['Higher Ground', 'Wonder wrote and recorded “Higher Ground” in a three-hour burst in May 1973; the Innervisions album version includes an extra verse and runs 30 seconds longer than the single.', 'Compare the album cut’s extra verse with the single’s tighter form. The source makes this an edition-specific difference listeners can actually follow.', 'Higher Ground (Stevie Wonder song)', 'https://en.wikipedia.org/wiki/Higher_Ground_(Stevie_Wonder_song)', 'Track page identifies the rapid 1973 writing/recording and album-versus-single difference.'],
    ["Don't You Worry 'Bout a Thing", 'Wonder released this positive-message song as Innervisions’ third single in 1974; its lyric urges taking things in stride.', 'Hear the reassurance as the song’s stated subject, not as a vague mood: it frames the track’s upbeat address from the opening premise.', "Don't You Worry 'bout a Thing", 'https://en.wikipedia.org/wiki/Don%27t_You_Worry_%27bout_a_Thing', 'Track page identifies its Innervisions single release and positive lyrical message.']
  ],
  '035-the-beatles-rubber-soul-e05eb313': [
    ['Norwegian Wood (This Bird Has Flown)', 'This Rubber Soul song was written mainly by John Lennon with lyrical contributions from Paul McCartney, while George Harrison’s sitar marked the instrument’s first appearance on a Western rock recording.', 'Begin with Harrison’s sitar. It is a concrete arrangement landmark that helps explain why this small narrative changed the Beatles’ sonic vocabulary.', 'Norwegian Wood (This Bird Has Flown)', 'https://en.wikipedia.org/wiki/Norwegian_Wood_(This_Bird_Has_Flown)', 'Track page identifies the writing contribution and Harrison’s sitar as a Western rock-recording first.'],
    ['Nowhere Man', 'Lennon wrote “Nowhere Man” for Rubber Soul and the Beatles recorded it with three-part vocal harmony and no acoustic guitar, an unusual arrangement choice for the group at that point.', 'Follow the three-part harmony as the arrangement’s engine. The song’s detached portrait gains force from voices that sound deliberately unified.', 'Nowhere Man (song)', 'https://en.wikipedia.org/wiki/Nowhere_Man_(song)', 'Track page identifies Lennon’s composition, Rubber Soul release, three-part harmony, and no-acoustic-guitar arrangement.'],
    ['In My Life', 'Credited to Lennon–McCartney, “In My Life” turns memories of people and places into a Rubber Soul song whose baroque-style keyboard solo was played by George Martin.', 'Listen for Martin’s compact keyboard break between vocal passages. It changes the song’s memory-piece texture without interrupting its intimate scale.', 'In My Life', 'https://en.wikipedia.org/wiki/In_My_Life', 'Track page identifies the Lennon–McCartney credit, memory subject, and George Martin keyboard solo.']
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
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 32–35.`);
