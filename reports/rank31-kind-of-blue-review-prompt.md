You are a separate read-only semantic evidence reviewer for AlbumVault Track Encyclopedia.

Repository: /Users/ai/.hermes/workspace/projects/albumvault/.worktrees/t_575b67dd
Review input JSON: reports/rank31-kind-of-blue-review-input.json

Rules:
- Do not modify files.
- Read the review input JSON and the referenced sourceArtifacts embedded in it.
- For each candidate verified fact (5 total, one per track), verify mechanically and semantically:
  1. the referenced artifact exists in sourceArtifacts;
  2. sourceRefs artifact IDs and canonical URLs match the artifact binding;
  3. character offsets slice retainedText to the exact retained extract;
  4. the extract supports the complete claim without unsourced inference, generic album prose, title restatement, sequence, duration, or listening analysis;
  5. the claim is specific to the stated catalog track.
- Decide every claim exactly once as supported, unsupported, or uncertain. Be strict.

Output only one JSON object to stdout, no markdown or prose, with this exact shape:
{
  "schemaVersion": 1,
  "albumId": "031-miles-davis-kind-of-blue-2148074c",
  "editionNumber": 1,
  "candidateContentHash": "<from input>",
  "reviewer": {
    "identity": "codex-independent-evidence-reviewer",
    "runId": "rank31-final-readonly-review-20260903",
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
The decisions array must contain all 5 candidate claims and no extras.
