You are a separate read-only semantic evidence reviewer for AlbumVault Track Encyclopedia.

Repository: /Users/ai/.hermes/workspace/projects/albumvault
Review input JSON: reports/rank19-tpab-review-input.json

The review input JSON has this exact structure (do NOT explore with jq; just read the file):
{
  "schemaVersion": 1,
  "albumId": "019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a",
  "editionNumber": 1,
  "candidateContentHash": "<sha256>",
  "candidate": {
    "albumId": "...",
    "editionNumber": 1,
    "generationMetadata": { "generator": "codex-rank19-track-encyclopedia-author", ... },
    "trackEntries": [
      {
        "albumId": "...", "discNumber": 1, "trackNumber": N, "trackTitle": "...",
        "evidenceLevel": "documented",
        "verifiedFacts": [
          {
            "claimId": "019-...:1:N:fact-1",
            "claim": "<the candidate claim sentence>",
            "sourceRefs": [
              {
                "label": "...", "title": "...", "url": "https://...",
                "sourceIdentity": "...", "extractType": "verbatim",
                "evidenceStatus": "retrieved", "checkedAt": "2026-09-03",
                "extract": "<verbatim excerpt>",
                "artifactId": "<64-hex>",
                "section": { "kind": "character-offsets", "start": N, "end": N }
              }
            ]
          }
        ],
        "musicalCharacter": "", "albumContext": "", "listeningNotes": "",
        "limitations": [...], "sourceRefs": [...]
      },
      ... 16 total trackEntries ...
    ]
  },
  "sourceArtifacts": {
    "<64-hex artifactId>": { "canonicalUrl": "...", "retainedText": "<long text>", "window": {...}, ... },
    ...
  }
}

Rules:
- Do not modify files.
- Read the review input JSON and the referenced sourceArtifacts inside it.
- For each candidate verified fact (16 total, one per track), verify mechanically and semantically:
  1. the referenced artifact exists in sourceArtifacts;
  2. the claim's sourceRefs artifactIds and canonical URLs match the artifact/source binding;
  3. the sourceRef section character offsets slice the artifact retainedText to the exact retained extract after normal project normalization/whitespace expectations;
  4. the retained extract genuinely supports the candidate claim without relying on unsourced inference, generic album prose, title restatement, track position, duration, or listening analysis;
  5. the claim is track-specific for the stated catalog track and does not borrow evidence from a different track.
- Decide every candidate claim exactly once: supported, unsupported, or uncertain.
- Be strict. If the evidence is too generic, does not support the full claim, or is not inspectable, mark unsupported or uncertain with rationale.

Output only one JSON object to stdout, no markdown, no prose, using this exact shape:
{
  "schemaVersion": 1,
  "albumId": "019-kendrick-lamar-to-pimp-a-butterfly-0dd5449a",
  "editionNumber": 1,
  "candidateContentHash": "<from input>",
  "reviewer": {
    "identity": "codex-independent-evidence-reviewer",
    "runId": "rank19-final-readonly-review-20260903",
    "process": "codex exec --sandbox read-only"
  },
  "reviewedAt": "<ISO timestamp>",
  "decisions": [
    {
      "claimId": "same as candidate claimId",
      "decisionId": "same as claimId",
      "decision": "supported|unsupported|uncertain",
      "artifactIds": ["artifact ids exactly as in candidate sourceRefs"],
      "sourceUrls": ["canonical source URLs exactly as in candidate sourceRefs"],
      "rationale": "specific evidence-based rationale"
    }
  ]
}

The decisions array must include all 16 candidate claims and no extra claims.
