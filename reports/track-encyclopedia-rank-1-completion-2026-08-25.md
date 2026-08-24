# Rank 1 track-encyclopedia completion — Marvin Gaye, *What's Going On*

Date: 2026-08-25
Album ID: `001-marvin-gaye-what-s-going-on-fd00dde9`
Draft edition: 4 (`published: false`)
Scope: rank 1 only; exact catalog identity preserved (disc 1, tracks 1–9).

## Research disposition

| # | Track | Disposition | Retained support |
|---:|---|---|---|
| 1 | What's Going On | documented | Performing Songwriter quotation from Renaldo Benson on Gaye's lyric and melody contribution |
| 2 | What's Happening Brother | documented | Library of Congress-hosted essay on Frankie Gaye's Vietnam-return stories |
| 3 | Flyin' High (In the Friendly Sky) | documented | Library of Congress-hosted essay on the United Airlines slogan reference |
| 4 | Save the Children | documented | Wikipedia bounded songwriter and album metadata |
| 5 | God Is Love | documented | Library of Congress-hosted essay's attributed characterization |
| 6 | Mercy Mercy Me (The Ecology) | documented | Wikipedia bounded single-release metadata |
| 7 | Right On | documented | Library of Congress-hosted essay on the title phrase |
| 8 | Wholy Holy | documented | Library of Congress-hosted essay on the play-on-words title and thematic link |
| 9 | Inner City Blues (Make Me Wanna Holler) | documented | Wikipedia bounded single-release metadata |

## Per-track searches

Each track was searched independently. Search-result snippets were used only for discovery.

1. `Marvin Gaye "What's Going On" song interview Renaldo Benson Al Cleveland writing recording Motown`
2. `Marvin Gaye "What's Happening Brother" interview James Nyx Frankie Vietnam song`
3. `Marvin Gaye "Flyin' High (In the Friendly Sky)" interview song writing meaning source`
4. `Marvin Gaye "Save the Children" song interview Al Cleveland Renaldo Benson source`
5. `Marvin Gaye "God Is Love" song source interview writers What's Going On`
6. `Marvin Gaye "Mercy Mercy Me (The Ecology)" interview environment source`
7. `Marvin Gaye "Right On" song What's Going On source interview analysis`
8. `Marvin Gaye "Wholy Holy" song source interview meaning`
9. `Marvin Gaye "Inner City Blues (Make Me Wanna Holler)" James Nyx interview source`

Source classes/sites checked included artist/songwriter interview material, label/history pages, the Library of Congress National Recording Registry essay, reputable music journalism/reference pages, Wikipedia track pages for bounded metadata, MusicBrainz/AllMusic discovery records, and lower-quality song-meaning/community pages that were rejected as evidence. AllMusic's track-3 page was discovered but could not be fetched and was not retained as evidence.

## Retained canonical sources

- https://performingsongwriter.com/marvin-gaye-whats-going-on
- https://www.loc.gov/static/programs/national-recording-preservation-board/documents/Whats-Going-On_Howard.pdf
- https://en.wikipedia.org/wiki/Save_the_Children_(song)
- https://en.wikipedia.org/wiki/Mercy_Mercy_Me_(The_Ecology)
- https://en.wikipedia.org/wiki/Inner_City_Blues_(Make_Me_Wanna_Holler)

All retained URLs returned HTTP 200 when checked on 2026-08-25. A distinct minimum excerpt snapshot is retained for each track, even when several tracks use the same Library of Congress-hosted essay, preventing one track's excerpt from standing in for another.

Additional actual page checked but not retained as claim evidence:

- https://360degreesound.com/author-talk-marvin-gayes-whats-going-on-at-50 (HTTP 200; useful corroborating interview with journalist Travis Atria)

## Claims removed or limited

- No listening/audio-analysis claim is displayed; no audio was analyzed for this edition.
- Unsupported flute, recording-session, and general musical-character prose remains removed.
- Generic album context is not used as track-specific evidence.
- Track 1 is limited to Benson's quoted account of Gaye's writing contribution.
- Track 2 is explicitly attributed to the Library of Congress-hosted guest essay.
- Track 3 is limited to the source-backed title/slogan reference; no addiction interpretation is displayed.
- Track 4 is limited to bounded songwriter and album metadata.
- Track 5 is an attributed critical characterization, not an artist-intent claim.
- Track 6 and track 9 are limited to source-backed single-release metadata.
- Track 7 is limited to the source's explanation of the title phrase.
- Track 8 is an attributed critical characterization, not an artist-intent claim.
- Songfacts references from edition 3 were removed from displayed source lists where they did not support retained claims.

## Independent semantic audit

Independent audit session `20260825_010400_9544ea` reviewed the current authoring file, snapshots, and catalog identity after the final excerpt tightening.

- Decisions: 9 supported; 0 unsupported; 0 uncertain.
- Critical findings: none.
- Exact identity preserved: yes.
- Claim-to-snapshot URL matches: 9/9.
- Verbatim extract containment: 9/9.
- Borrowed evidence: none; each track has its own snapshot ID and excerpt.
- Boilerplate: none.
- Unsupported listening claims: none.
- Track 9's claim conservatively omits the source's additional “climactic song” wording; this is narrowing, not overstatement.

The nine supported decisions are recorded in the draft's `semanticReview` objects with the independent reviewer identity and review timestamp.

## Build and verification

- Draft edition: 4; `published: false`; content hash `449c11738b4a4676`.
- Generated release: `c078419a1ed414fc`.
- Build counts: 3 versioned albums, 34 tracks; 11 documented and 23 unresearched.
- `node scripts/test-track-encyclopedia-backend.mjs`: 49/49 passed.
- `node scripts/test-track-encyclopedia-pilot-repairs.mjs`: passed.
- `node scripts/test-track-encyclopedia-ui.mjs`: 5/5 passed.
- `node scripts/test-track-encyclopedia.mjs`: 71/71 passed.
- `npx tsc --noEmit`: passed.
- `npm run test:data`: passed for 243 albums.
- `npm run test:all`: passed.
- `npm run build:track-encyclopedia`: passed.
- `npm run build`: passed (Vite emitted its existing large-chunk advisory).
- `git diff --check`: passed.
- Prior edition SHA-256 hashes remained unchanged:
  - edition 1: `9b927b4d312d5da8c773d430e61713dd0dac6df3bda53c514bbd0f339b4f8702`
  - edition 2: `77ecca67a08f128701245d77984619718190c9a674d8393ed603ec1d597be14f`
  - edition 3: `4c038059b3708a1893a4fa1893906079c206fbf2ebdeddd095dfeb7041e6c79f`

## Completion decision

Rank 1 is genuinely completion-eligible as an unpublished draft. All nine exact catalog tracks are `documented`; none remain contextual, insufficient-evidence, limited, or unresearched. No catalog/Gym data, publication state, remote branch, or deployment was changed.
