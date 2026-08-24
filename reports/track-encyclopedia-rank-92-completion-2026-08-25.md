# Rank-92 Track Encyclopedia Completion — The Stooges, *Fun House*

Date: 2026-08-25
Album ID: `092-the-stooges-fun-house-9896fe5c`
Catalog rank: 92
Decision: completion-eligible unpublished draft

## Inventory and outcome

The current catalog contains exactly seven rank-92 tracks, all on disc 1. Edition 3 preserves their exact catalog titles and order. Every track is documented; none is contextual, insufficient-evidence, limited, or unresearched.

| # | Exact catalog track | Disposition | Retained claim scope |
|---:|---|---|---|
| 1 | Down On the Street | documented | Iggy Pop's statement that the track has two lead guitars, adding action to the space.[1] |
| 2 | Loose | documented | Iggy Pop's statement that Ron Asheton overdubbed a single-string counterpart to himself.[1] |
| 3 | T.V. Eye | documented | Iggy Pop's account of asking Asheton to begin in a John Lee Hooker style with single notes against a one-string drone.[1] |
| 4 | Dirt | documented | Iggy Pop's description of the chorus guitar overdub through a Leslie speaker complementing the basic-track wah-wah guitar.[1] |
| 5 | 1970 | documented | Steve Mackay's recollection that Iggy had the song prepared for his contribution and gave him the “Mace Parker … on acid” direction.[2] |
| 6 | Fun House | documented | Mackay's identification of the song as his favorite and his description of playing its riff with Ron Asheton.[2] |
| 7 | L.A. Blues | documented | Mackay's account of the freeform concert ending becoming its own live-in-studio track at Don Gallucci's suggestion.[2] |

## Per-track research record

Each track received an independent search pass. Search snippets were used only to find pages; retained evidence came from fetched pages.

| Track | Representative track-specific queries | Source classes/sites checked | Result and limitation |
|---|---|---|---|
| Down On the Street | `Iggy Pop Down on the Street Fun House recording`; `Don Gallucci Down on the Street interview`; Rhino/Stooges-site searches | Iggy/Stooges first-person essay; producer interview; Rhino archive; major music journalism | Retained the minimum track-specific Iggy Pop excerpt. No listening claim retained. |
| Loose | `Iggy Pop Loose Fun House interview`; `Ron Asheton Loose interview`; `Don Gallucci Loose takes` | First-person essay; band/producer interviews; session/reissue coverage | Retained the minimum track-specific Iggy Pop excerpt. |
| T.V. Eye | `Iggy Pop T.V. Eye meaning interview`; `Ron Asheton T.V. Eye John Lee Hooker`; oral-history searches | First-person essay; guitarist interviews; reputable oral histories | Retained Iggy Pop's track-specific writing account. |
| Dirt | `Iggy Pop Dirt Fun House interview`; `Ron Asheton Dirt Leslie`; `Don Gallucci Dirt recording` | First-person essay; guitarist/producer interviews; music journalism | Retained Iggy Pop's track-specific technical statement. |
| 1970 | `Iggy Pop 1970 Fun House interview`; `Steve Mackay 1970 saxophone`; `Elektra Rhino 1970 notes` | Band/saxophonist interviews; Rhino archive; reputable obituaries and journalism | Retained Mackay's track-specific recollection. |
| Fun House | `Iggy Pop interview Fun House title track Steve Mackay`; `Steve Mackay Funhouse favorite song`; `Ron Asheton Fun House riff` | Mackay interview; band interviews; public-radio and music journalism | Retained Mackay's first-person, track-specific statement. |
| L.A. Blues | `Iggy Pop L.A. Blues Freak Out`; `Steve Mackay L.A. Blues freeform`; `Don Gallucci L.A. Blues`; Rhino session search | Mackay interview; Iggy first-person essay; producer interview; Rhino session documentation; reputable journalism | Retained Mackay's first-person origin/recording account. |

## Evidence retained

- Seven unique self-describing snapshot IDs, one per track.
- Seven unique minimum verbatim excerpts.
- Canonical HTTPS source URL, `checkedAt: 2026-08-25`, retrieval status, snapshot ID, and 64-hex content hash on every claim.
- Four excerpts from Iggy Pop's first-person recording essay.[1]
- Three excerpts from Kernan Andrews' Steve Mackay interview, archived by Cult of Estel.[2]
- All seven snapshot hashes reproduce through `computeEvidenceSnapshotHash`.

Sources considered but not retained as claim evidence included search-result snippets, Wikipedia/MusicBrainz metadata, Rhino session-level copy, and secondary commentary from Rolling Stone, Wisconsin Public Radio, The Guardian, Trouser Press, and other music journalism. They were discovery/context checks, not substitutes for the narrower first-person excerpts.

## Removed or narrowed material

- Removed all previous limited listening prose.
- Cleared unsupported `musicalCharacter`, `albumContext`, and `listeningNotes` content.
- Retained one narrow fact per track instead of inferring track specifics from generic album context.
- Added explicit limitations stating that no independent listening or audio analysis is claimed.
- Documented two source-page spelling corrections: `Ron Ashton` → `Ron Asheton` and `Don Galucci` → `Don Gallucci`.

## Independent evidence audit

Audit ID: `audit-092-funhouse-20260825-semantic`

Result: 7 supported, 0 unsupported, 0 uncertain.

The independent reviewer fetched both actual pages and checked exact page/excerpt containment under NFKC plus whitespace normalization, local snapshot containment, canonical URL identity, snapshot URL identity, project hash reproduction, semantic entailment, catalog identity/order/title, distinct per-track evidence, cross-track borrowing, boilerplate, and unsupported analysis.

- Critical findings: 0
- Important findings: 0
- Minor findings: 2 source-name misspellings. Both were resolved by adding explicit limitations.

## Edition and generated release

- New immutable edition: `edition-3.json`
- Published: `false`
- Content hash: `ee805c782c56bc4a`
- Edition-3 file SHA-256: `007f887da888e1ade4cd95c5b2fb519e3632645c87792a62aaa627bae76dc2ab`
- Generated release hash: `0e1155d463a6187e`
- Edition 1 preserved SHA-256: `027d70be7b9f605461d761e0e3d00b61bb543d308667321c82525dec3cbd3b04`
- Edition 2 preserved SHA-256: `78e158369564a2b4d0761de441f56835e63a9ff3f8b92659c3dbc033e0be27e1`

## Verification

All requested gates passed:

- Lifecycle validate: edition 3 valid; unpublished
- Backend tests: 49/49
- Pilot completion acceptance: passed
- UI evidence/state tests: 5/5
- Core track-encyclopedia tests: 71/71
- TypeScript: passed
- Data integrity: passed for 243 albums
- Full `npm run test:all`: passed
- Track build: 3 albums, 34 tracks; 34 documented, 0 contextual, 0 limited, 0 insufficient-evidence, 0 unresearched
- Production build: passed
- `git diff --check`: passed
- Post-build prior-edition hash verification: passed

The first core-test run exposed two stale pilot-era assertions: one required multiple evidence levels, and another expected *Fun House* to remain limited and unsourced. The tests were updated to enforce completion-eligible levels and the new seven-track documented evidence contract; the focused 71-test suite and full suite then passed.

## Safety and scope

- No other album was researched or authored.
- No catalog or Gym data was changed.
- No edition was published.
- No push, deployment, or external communication occurred.
- Unrelated untracked historical research reports were left untouched and excluded from the intended commit.

## Sources

[1] https://iggyandthestoogesmusic.com/news/building-fun-house-by-iggy-pop — Building Fun House by Iggy Pop
    > "Ron was over-dubbing a single string counter part to himself on Loose. On Down On The Street there are 2 lead guitars which added more action to the space. Dirt has a single over-dub guitar on the chorus through a Leslie speaker to complement the Wah-wah guitar on the basic track."
[2] https://cultofestel.wordpress.com/2011/01/05/steve-mackay-sax-man-talks-the-stooges-iggy-and-estel — Steve Mackay interview — Galway Advertiser archive
    > "Steve’s favourite song is ‘Funhouse’, where he and guitarist Ron Ashton belt out the riff with gusto (“What a chance to blow funky and free!”). However the album’s most uncompromising track is the ‘free jazz’ of ‘LA Blues’, which these days Iggy describes as something akin to “a demonic howl”."
