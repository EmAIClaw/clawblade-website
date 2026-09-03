You are a separate read-only semantic evidence reviewer for AlbumVault Track Encyclopedia.

Repository: /Users/ai/.hermes/workspace/projects/albumvault/.worktrees/t_3f763104
Review input JSON: reports/rank26-horses-review-input.json

Read the review input JSON and inspect every candidate verified fact and its embedded source artifact. Do not modify files.

For each of the 8 candidate claims, verify all of the following:
1. The referenced artifact exists in sourceArtifacts.
2. The sourceRef artifact ID and canonical URL bind to that artifact.
3. The declared character offsets slice artifact.retainedText to exactly the sourceRef extract.
4. The extract genuinely supports the complete claim without inference, title/duration/sequence filler, generic album prose, or listening analysis.
5. The evidence is specific to the named catalog track.
6. The archive provenance is explicit: the canonical URL is the New York Times article, while artifact.finalUrl identifies the Wayback snapshot dated 2025-11-10.

Decide every claim exactly once as supported, unsupported, or uncertain. Be strict. Do not rescue an overbroad claim with context outside its declared extract.

Output only one JSON object to stdout, no markdown or commentary, with this exact shape:
{
  "schemaVersion": 1,
  "albumId": "026-patti-smith-horses-2807d0f1",
  "editionNumber": 1,
  "candidateContentHash": "<copy exactly from input>",
  "reviewer": {
    "identity": "codex-independent-evidence-reviewer",
    "runId": "rank26-final-readonly-review-20260903",
    "process": "codex exec --sandbox read-only"
  },
  "reviewedAt": "<current ISO timestamp>",
  "decisions": [
    {
      "claimId": "<candidate claimId>",
      "decisionId": "<same as claimId>",
      "decision": "supported|unsupported|uncertain",
      "artifactIds": ["<exact candidate artifact IDs>"],
      "sourceUrls": ["<exact candidate canonical source URLs>"],
      "rationale": "<specific evidence-based rationale>"
    }
  ]
}

The decisions array must contain all 8 candidate claims and no extras.
