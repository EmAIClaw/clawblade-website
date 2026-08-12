import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../src/data/encyclopedia.generated.json', import.meta.url);
const source = (title, url, summary) => ({ label: 'Wikipedia', title, url, summary });
const updates = {
  '018-bob-dylan-highway-61-revisited-bd0599b4': [
    ['Ballad of a Thin Man', 'Dylan recorded this Highway 61 Revisited track in New York with Bob Johnston producing; its sombre piano chords sit against Al Kooper’s horror-movie organ part.', 'Keep the piano and organ in tension. Their mismatch gives Mr. Jones’s bafflement a sound before Dylan explains any of it.', 'Ballad of a Thin Man', 'https://en.wikipedia.org/wiki/Ballad_of_a_Thin_Man', 'Track page identifies the 1965 album release, recording session, producer, piano, and organ part.']
  ],
  '019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a': [
    ['King Kunta', 'Lamar’s track invokes Kunta Kinte and layers references or interpolations tied to Michael Jackson, James Brown, Fred Wesley and others.', 'Listen to the references as part of the song’s argument about authorship and status, rather than as background decoration.', 'King Kunta', 'https://en.wikipedia.org/wiki/King_Kunta', 'Track page identifies the Kunta Kinte reference and credited interpolations/references.'],
    ['Alright', 'This To Pimp a Butterfly single expresses hope amid personal struggle and became associated with Black Lives Matter protests after crowds chanted its chorus.', 'Notice how the chorus works as a collective response, which helps explain why the song travelled beyond its album setting.', 'Alright (Kendrick Lamar song)', 'https://en.wikipedia.org/wiki/Alright_(Kendrick_Lamar_song)', 'Track page identifies the song’s subject, Pharrell Williams co-production, and protest association.'],
    ['The Blacker the Berry', 'Lamar’s thirteenth To Pimp a Butterfly track opens by calling its narrator a hypocrite while confronting racism and hatred; it ends with a jazz section.', 'Stay for the final change of texture. The jazz resolution matters because it alters the force of the song’s confrontational opening.', 'The Blacker the Berry (Kendrick Lamar song)', 'https://en.wikipedia.org/wiki/The_Blacker_the_Berry_(Kendrick_Lamar_song)', 'Track page identifies its album position, themes, featured chorus, and closing jazz section.']
  ],
  '020-radiohead-kid-a-ce842ff2': [
    ['Everything In Its Right Place', 'Kid A opens with synthesiser, digitally manipulated vocals and unusual time signatures after Radiohead moved the song from a conventional band arrangement to synthesiser.', 'Listen for the processed voice as an instrument. It records the group’s decision to make arrangement restraint part of Kid A’s language.', 'Everything in Its Right Place', 'https://en.wikipedia.org/wiki/Everything_in_Its_Right_Place', 'Track page identifies its opening-album role, synthesiser, manipulated vocals, and arrangement history.'],
    ['The National Anthem', 'This Kid A track is built on a repeating bassline and horns playing free jazz, with the horn approach influenced by Charles Mingus.', 'Follow the bassline through the horns’ organised chaos. The collision is the arrangement, not a solo break added on top.', 'The National Anthem (Radiohead song)', 'https://en.wikipedia.org/wiki/The_National_Anthem_(Radiohead_song)', 'Track page identifies the repeating bassline, free-jazz horns, and Charles Mingus influence.'],
    ['How to Disappear Completely', 'Radiohead developed this acoustic-based Kid A ballad from demos into an arrangement of orchestral strings, guitar effects and ambient influences; Jonny Greenwood wrote the string arrangement.', 'Start with the guitar and strings rather than treating the song as a conventional acoustic ballad. The arrangement makes withdrawal feel spatial.', 'How to Disappear Completely', 'https://en.wikipedia.org/wiki/How_to_Disappear_Completely', 'Track page identifies its Kid A origin, acoustic basis, orchestral strings, effects, and arrangement credits.']
  ],
  '022-the-notorious-b-i-g-ready-to-die-98945eb8': [
    ['Juicy', 'Ready to Die’s first single samples Mtume’s “Juicy Fruit” through its “Fruity Instrumental” mix, with an alternate chorus by Total and Sean Combs.', 'Listen for the sample and alternate chorus as framing devices: they turn the autobiographical rise into a deliberately polished Bad Boy record.', 'Juicy (The Notorious B.I.G. song)', 'https://en.wikipedia.org/wiki/Juicy_(The_Notorious_B.I.G._song)', 'Track page identifies its debut-album single status, producers, sample source, and alternate chorus.']
  ],
  '023-the-velvet-underground-the-velvet-underground-and-nico-0913adef': [
    ['Sunday Morning', 'The Velvet Underground’s album opener was the final song recorded for the debut; Tom Wilson requested a potential single with Nico in mind, though Lou Reed sang the lead on the finished version.', 'Hear the gentler opening in light of its single-minded brief. Reed’s lead gives the record a different centre from the Nico concept that prompted it.', 'Sunday Morning (The Velvet Underground song)', 'https://en.wikipedia.org/wiki/Sunday_Morning_(The_Velvet_Underground_song)', 'Track page identifies its album-opening role, recording context, Wilson’s request, and finished lead vocal.'],
    ['Venus In Furs', 'Lou Reed’s song takes its title and sexual themes from Leopold von Sacher-Masoch’s novel; the final arrangement includes John Cale’s electric viola and Reed’s detuned guitar.', 'Focus on the viola and detuned guitar. They make the literary reference physical rather than leaving it only in the lyric.', 'Venus in Furs (song)', 'https://en.wikipedia.org/wiki/Venus_in_Furs_(song)', 'Track page identifies the source novel, themes, recording, and electric-viola/detuned-guitar arrangement.'],
    ['Heroin', 'Reed wrote this 1964 song about heroin use and its effects; it appeared on the Velvet Underground’s 1967 debut without offering a simple endorsement or condemnation.', 'Listen for the absence of a tidy moral resolution. The direct account is why the song remained troubling to many listeners.', 'Heroin (The Velvet Underground song)', 'https://en.wikipedia.org/wiki/Heroin_(The_Velvet_Underground_song)', 'Track page identifies the song’s 1964 writing, debut-album release, subject, and contemporary critical reading.']
  ],
  '026-patti-smith-horses-2807d0f1': [
    ['Redondo Beach', 'Smith first released this song on Horses; co-writers Richard Sohl and Lenny Kaye helped set lyrics about a drowned young woman in a reggae arrangement.', 'Attend to the reggae setting against the lyric’s shock. The groove makes the narrative’s unease more complicated, not lighter.', 'Redondo Beach (song)', 'https://en.wikipedia.org/wiki/Redondo_Beach_(song)', 'Track page identifies its Horses release, co-writers, narrative, and reggae arrangement.']
  ],
  '031-miles-davis-kind-of-blue-2148074c': [
    ['So What', 'Kind of Blue opens with Davis’s modal-jazz composition in Dorian mode; Gil Evans wrote the piano-and-bass introduction for Bill Evans and Paul Chambers.', 'Listen for the bass stating the central theme after the introduction. The small modal shift is the drama, not a chord-heavy progression.', 'So What (Miles Davis composition)', 'https://en.wikipedia.org/wiki/So_What_(Miles_Davis_composition)', 'Track page identifies its album-opening role, Dorian-mode form, and Gil Evans introduction.'],
    ['Freddie Freeloader', 'Davis’s Kind of Blue blues uses Wynton Kelly on piano instead of Bill Evans and gives solo space to Kelly, Davis, John Coltrane, Cannonball Adderley and Paul Chambers.', 'Track how the twelve-bar blues opens room for each soloist. Kelly’s appearance changes the piano colour at exactly this point on the album.', 'Freddie Freeloader', 'https://en.wikipedia.org/wiki/Freddie_Freeloader', 'Track page identifies its twelve-bar blues form, Wynton Kelly substitution, and soloists.'],
    ['Blue In Green', 'This Kind of Blue ballad is the album’s only piece without Cannonball Adderley and unfolds through a ten-measure circular form after a four-measure introduction.', 'Follow the returning solo sequence rather than expecting a standard chorus. Its circular form is central to the record’s suspended mood.', 'Blue in Green', 'https://en.wikipedia.org/wiki/Blue_in_Green', 'Track page identifies its album position, absence of Adderley, and Bill Evans’s form description.']
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
console.log(`Applied ${Object.values(updates).flat().length} source-backed track guides for ranks 18, 19, 20, 22, 23, 26, and 31.`);
