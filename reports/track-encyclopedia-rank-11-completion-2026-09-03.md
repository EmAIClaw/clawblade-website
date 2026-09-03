# Rank 11 Track Encyclopedia Completion — The Beatles, *Revolver*

Date: 2026-09-03
Album ID: `011-the-beatles-revolver-b4f3c550`
Status: **complete in immutable unpublished local edition 1; all validation gates passed**

## Outcome

- Catalog tracks completed: **14/14**.
- Evidence level: **14 documented**, zero contextual, limited, insufficient-evidence, or unresearched.
- Retained claims: **14**; independent review: **14 supported, 0 unsupported, 0 uncertain**.
- Semantic content hash: `8284849f6f9913f3`.
- Publication state: `published: false`.

## Source provenance

Fourteen content-addressed source artifacts were fetched and hashed; every retained excerpt was mechanically located in the fetched body and bound with exact character offsets. All fourteen are The Beatles Bible song pages (one per track), collected via `http-fetch` with HTTP 200.

| Source | Canonical URL | Collection | HTTP |
|---|---|---|---|
| The Beatles Bible — Taxman | https://www.beatlesbible.com/songs/taxman | http-fetch | 200 |
| The Beatles Bible — Eleanor Rigby | https://www.beatlesbible.com/songs/eleanor-rigby/2 | http-fetch | 200 |
| The Beatles Bible — I'm Only Sleeping | https://www.beatlesbible.com/songs/im-only-sleeping | http-fetch | 200 |
| The Beatles Bible — Love You To | https://www.beatlesbible.com/songs/love-you-to | http-fetch | 200 |
| The Beatles Bible — Here, There and Everywhere | https://www.beatlesbible.com/songs/here-there-and-everywhere | http-fetch | 200 |
| The Beatles Bible — Yellow Submarine | https://www.beatlesbible.com/songs/yellow-submarine | http-fetch | 200 |
| The Beatles Bible — She Said She Said | https://www.beatlesbible.com/songs/she-said-she-said | http-fetch | 200 |
| The Beatles Bible — Good Day Sunshine | https://www.beatlesbible.com/songs/good-day-sunshine | http-fetch | 200 |
| The Beatles Bible — And Your Bird Can Sing | https://www.beatlesbible.com/songs/and-your-bird-can-sing | http-fetch | 200 |
| The Beatles Bible — For No One | https://www.beatlesbible.com/songs/for-no-one | http-fetch | 200 |
| The Beatles Bible — Doctor Robert | https://www.beatlesbible.com/songs/doctor-robert | http-fetch | 200 |
| The Beatles Bible — I Want to Tell You | https://www.beatlesbible.com/songs/i-want-to-tell-you | http-fetch | 200 |
| The Beatles Bible — Got to Get You Into My Life | https://www.beatlesbible.com/songs/got-to-get-you-into-my-life | http-fetch | 200 |
| The Beatles Bible — Tomorrow Never Knows | https://www.beatlesbible.com/songs/tomorrow-never-knows | http-fetch | 200 |

## Track claims

Each of the fourteen catalog tracks carries exactly one narrow, track-specific, attributed claim with a verbatim retained excerpt and exact character offsets, all sourced to The Beatles Bible.

1. **Taxman** — Harrison was grudgingly helped by Lennon; Lennon suggested naming Harold Wilson and Edward Heath, the first living people directly named in a Beatles song.
2. **Eleanor Rigby** — no Beatles played on the record; a closely-miked string octet was recorded in 14 takes, then Paul overdubbed lead vocals.
3. **I'm Only Sleeping** — recording began 27 April 1966 with 11 rhythm-track takes; Lennon added lead vocals two days later.
4. **Love You To** — following the "Norwegian Wood" sitar motif, the Beatles' first full attempt at a classical Indian-style piece.
5. **Here, There and Everywhere** — the title is combined lyrically, each verse taking one word ("here", "there", "everywhere").
6. **Yellow Submarine** — Donovan supplied the couplet "Sky of blue and sea of green/In our yellow submarine."
7. **She Said She Said** — the final track recorded for Revolver, inspired by an LSD-influenced conversation between Lennon and Peter Fonda.
8. **Good Day Sunshine** — George Martin's piano solo was recorded at half speed so it sounded faster and higher on playback.
9. **And Your Bird Can Sing** — notable for cryptic lyrics and twin guitar riffs played by McCartney and Harrison.
10. **For No One** — George Martin wrote down the melody Paul sang to him; Alan Civil performed it.
11. **Doctor Robert** — written about Dr Robert Freymann, who ran a discreet clinic on Manhattan's East 78th Street.
12. **I Want to Tell You** — Harrison's E7th-with-an-F-on-top chord, which he said he "literally invented."
13. **Got to Get You Into My Life** — the Beatles hired two members of Georgie Fame's Blue Flames.
14. **Tomorrow Never Knows** — the monumental closing track was also the first song recorded for the album.

## Independent semantic review

- Review artifact: `a54b62bab7d03a24dccc3c537e6965ab046b0cf00fb975b488ba9e250edc60fa`.
- Candidate content hash: `cb102e428a15f444676ef081df2ed26829f32c4e026f5fb5e7fe9f6a6a56a984`.
- Reviewer: `codex-independent-evidence-reviewer`.
- Process: `codex exec --sandbox read-only`.
- Run: `rank11-final-readonly-review-20260903`.
- Decisions: **14 supported, 0 unsupported, 0 uncertain**.

## Immutable outputs and hashes

- Authoring SHA-256: `d9f5022aa29dfb9057c09261e3e2d6b1309dc7ed71f7e90c77ce3b7c12705e2a`.
- Edition SHA-256: `62c6e2a87db43ffe326417a00172f7ed13797d757022c55d1dcd4af85799fad0`.
- Album object: `6d0dda580b0a4fa37e127b3c2fe301e46342921a16633592a04ea15488eb8f69`.
- Release: `ed2c5cec13e10541`.
- Review artifact file SHA-256: `6ea6c4f3fd018c673dbd418fc74b09d2f7191471cde71445f7f8b9e0d50cbde8`.
- Source artifact file SHA-256s (14): see `source-artifacts/` — each filename is its content-addressed artifactId, verified by the provenance suite.

## Verification

- Lifecycle validation: valid=true; edition 1; unpublished.
- Focused acceptance: `test-ranks-11-revolver-acceptance.mjs` passed (14 documented tracks, 14 supported review decisions, exact catalog identity).
- Provenance tests: 35/35 passed.
- Object-store tests: 13/13 passed.
- Core Track Encyclopedia tests: 72/72 passed.
- Backend tests: 51/51 passed.
- UI state/evidence tests: 5/5 passed.
- TypeScript: `npx tsc --noEmit` passed.
- Full suite: `npm run test:all` passed; data integrity confirmed 243 albums.
- Production build: passed; Vite transformed 1,574 modules and emitted the rank-11 immutable object.
- Zero-growth: two consecutive Track Encyclopedia builds created no new source, review, or album objects and preserved byte identity (object-set SHA-256 `1471ec11682bbfa921de44727318c84b7f80f40800f53f4aa92e50a2dfea428d`).
- GC: dry-run only; `deleted=false`; current release `ed2c5cec13e10541` referenced=true.
- Real Chrome smoke: production preview opened rank 11 and rendered the album, the Taxman claim, verbatim Beatles Bible evidence, and the Eleanor Rigby string-octet claim; zero captured runtime exceptions.

## Scope and next work

- The pre-existing unrelated catalog/data-integrity edits and untracked historical research reports were preserved and excluded from this milestone.
- No push, deployment, publication, provider-data edit, catalog-identity edit, Gym edit, or external messaging occurred.
- Next eligible album: rank 12, Michael Jackson — *Thriller* (`012-michael-jackson-thriller-a46ba2f6`).
