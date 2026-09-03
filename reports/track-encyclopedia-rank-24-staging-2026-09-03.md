# Track Encyclopedia rank 24 staging — The Beatles, Sgt. Pepper's Lonely Hearts Club Band

Date: 2026-09-03
Album ID: `024-the-beatles-sgt-pepper-s-lonely-hearts-club-band-dad95673`
Edition: 1
Published: false
Content hash: `3f64c8ef4f3d5edb`

## Outcome

Rank 24 is staged as an immutable unpublished Track Encyclopedia edition.

- Catalog tracks: 13
- Documented tracks: 13
- Insufficient-evidence tracks: 0
- Unresearched tracks: 0
- Verified claims retained: 13
- Independent review decisions: 13 supported, 0 unsupported, 0 uncertain

Each catalog track retains one narrow, track-specific claim. Musical-character and listening-note fields remain empty rather than adding unsupported interpretation.

## Source provenance

Collection method: live HTTPS fetch (`http-fetch`), all responses HTTP 200. Each source record preserves the canonical and final URL, retrieval metadata, content type/encoding, fetched-response SHA-256, normalized retained text, and mechanically verified character offsets.

Referenced content-addressed source artifacts:

- `a44c1ce463a9f12fc7b85dca66956058b2c3a4104dce132cad4c189452935582`
- `844cb4c3f58e7bcc5298b06cc6931eb1eeb001bed6b16ba089e979e3159a1bf7`
- `493b9c8eef844ffcc2cc4f84a714888318d4bff8f100b4f5b5692076aa1b62b9`
- `d66b8d1e9fcba81574583666fbfeda7ef9ef77b02ec1e65f27e743fa00e1b0a3`
- `62207fef1e9f47806a0e9fba5b76d0a657f6719bd8bca7d643f6134946776cbe`
- `93e55209482d71b167aeeb0bf796c6b911d27f3b38bc74ae5d3b0eafbefc6d3f`
- `b5e21f10aa8db4c49624472de691d61bf27fef21dff624374aa65a6f9c8d40b0`
- `726cf7e735604c30f5db78a7a1fdb9ca308ead59c045d38a2808ad010a850b5b`
- `d934e6c5ee6257415e3799e9490d378c8b8b90cedec29a7a1d7dca8e44e66018`
- `12d42dc39688c08733f4fe4761cad95d79e88fad5c464ca9acf8fa2a41c3d5e7`
- `8e5dace1aa4613e7391dfe41643049be5c3a5eb9129cc6328b0d1cbda1bd36c6`
- `d0ad9f9b0249a9a17b4e11e6e60097471bf1e6dec5a1f944bdb83b04012310be`
- `c54b2688d859d060414257ce7c1f186c48093f8f1e93a84de5b1c39f914c1f2e`

The source collection ledger is `reports/rank24-sgt-pepper-source-collection.json`.

## Independent semantic review

- Review artifact: `98764f5d29e7b15e188cdd2e7b39c2375984f84d1c9286958e4604f1e00c6fdc`
- Reviewer identity: `codex-independent-evidence-reviewer`
- Process: `codex exec --sandbox read-only`
- Run ID: `rank24-final-readonly-review-20260903`
- Candidate content hash: `fbbee0eebc9589a4ef62b19ed3f97f675227592e5421ea50038dc533b5d2c31d`

The final read-only review returned supported decisions for all 13 claims. The validated output was imported by `import-track-encyclopedia-review.mjs`; the authoring process did not self-approve.

## TDD and validation

- RED observed: `node scripts/test-ranks-24-sgt-pepper-acceptance.mjs` failed with `ENOENT` because rank-24 authoring did not exist.
- GREEN observed after review import and edition persistence: focused acceptance passed for all 13 exact catalog identities, all 13 supported review bindings, and unpublished edition 1.
- `persist-track-encyclopedia-edition.mjs` validated source/review bindings and persisted edition 1 with content hash `3f64c8ef4f3d5edb`.
- `git diff --check` passed.

Aggregate runtime outputs were intentionally not generated or modified on this isolated staging branch.

## Scope and safety

This staging work adds only rank-24 collection/review records, content-addressed source and review artifacts, per-album authoring and edition files, the focused test, the narrow generator, and this report. No push, deployment, publication, external messaging, Gym/provider changes, or aggregate Track Encyclopedia integration was performed.
