# Track encyclopedia pilot evidence audit — 2026-08-25

Status: **required pilot repairs resolved in new unpublished draft editions**

Resolution summary:

- Marvin Gaye is draft edition 3; unsupported flute/session/Frankie Gaye specifics and unsupported listening prose were removed, with an explicit provenance erratum.
- Liz Phair is draft edition 3; “Stratford-on-Guy” now has a retained-evidence verified fact and unsupported “Never Said” editorial/discovery prose was removed.
- The Stooges is draft edition 2; exact catalog capitalization is preserved and listening claims without retained audio provenance were removed.
- Every retained verified fact has a claim-to-snapshot link and recorded supported semantic review.
- All three editions remain `published: false`; no website data publication occurred.

Read-only evidence audit covered all 34 pilot tracks, all evidence snapshots, verified facts, source references, hashes, editions, and catalog alignment.

## Required repairs

1. **Liz Phair — “Stratford-on-Guy”**
   - Existing retained snapshot `wikipedia-exile-in-guyville-singles-2026-08-23` already documents the track as a single.
   - Replace the false unresearched/no-source disposition with a documented verified fact tied to the exact retained excerpt.
   - Update review metadata and counts through a new immutable edition.

2. **Documented tracks contain unlabelled listening-analysis prose**
   - Marvin Gaye: “Mercy Mercy Me (The Ecology)” and “Inner City Blues (Make Me Wanna Holler)”
   - Liz Phair: “Never Said”
   - Explicitly distinguish the verified fact from unsupported/editorial musical-character, album-context, listening-note, and discovery-connection prose. Prefer removing unsupported prose unless its provenance can be retained; otherwise label it clearly as non-source-verified editorial analysis.

3. **Marvin Gaye — “What’s Going On”**
   - “Distinctive flute intro” is unsupported by retained evidence.
   - The 1970/1971 Detroit/West Hollywood session claim lacks a retained excerpt.
   - Remove/soften unsupported specifics or add exact retained evidence and correct limitations.

4. **Marvin Gaye — “What’s Happening Brother”**
   - The claim naming Frankie Gaye is not supported by the retained excerpt.
   - Add exact support or soften to the supported statement about a Vietnam veteran returning home.

5. **Liz Phair — “Never Said”**
   - Mark the discovery-connection rationale as editorial analysis or remove it.

6. **The Stooges — “Down On the Street”**
   - Audit suggested standard capitalization “Down on the Street,” but catalog identity must remain authoritative. Do not change the versioned title unless the catalog title and verified edition are reconciled first; exact catalog alignment takes priority.

7. **Superseded Marvin Gaye edition 1 review note**
   - It incorrectly says three tracks were documented from Songfacts; actual sources were AllMusic/Wikipedia.
   - Because published editions are intended to be immutable, do not rewrite historical payloads silently. Record a correction note in the next edition or a dedicated provenance erratum.

## Confirmed sound

- 34/34 pilot tracks align with the current catalog.
- Evidence-level counts and content hashes match.
- Snapshot hashes validate and all snapshot IDs resolve.
- Verified-fact excerpts occur verbatim in retained snapshots.
- Verified facts checked against live Wikipedia were accurately paraphrased.
- No borrowed evidence, verified-fact fabrication, cross-album data, or repeated boilerplate was found.

## Gate

Do not call any pilot album complete until the relevant repairs are implemented via a new edition, focused tests pass, and the full pilot evidence audit is rerun.
