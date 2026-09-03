You are an independent read-only semantic reviewer for AlbumVault Track Encyclopedia rank 29: The Beatles — The Beatles (White Album).

Hermes owns Kanban lifecycle. Do not call Hermes kanban commands/tools. Do not commit or edit any file. Run in a read-only sandbox and return the reviewer output JSON as your final response; the invoking CLI will capture that response at:
reports/rank29-white-album-review-output.json

Input to review:
reports/rank29-white-album-review-input.json

Task:
- Read the candidate claims and sourceArtifacts in the input JSON.
- For each candidate verifiedFact, decide whether the claim is narrowly supported by the cited source artifact retainedText and exact sourceRefs extract/offsets.
- Reject generic album prose, unsupported interpretation, and any claim not actually present in the retained source text.
- This is semantic review only; do not author replacement claims.

Output JSON schema, exactly:
{
  "schemaVersion": 1,
  "albumId": "029-the-beatles-the-beatles-white-album-29eb84d8",
  "editionNumber": 1,
  "candidateContentHash": "a86b05b454508da1938418f4d866d2adc3f3203ede417474f2159559f3452745",
  "reviewer": {
    "identity": "codex-independent-evidence-reviewer",
    "runId": "rank29-final-readonly-review-20260903",
    "process": "codex exec --sandbox read-only"
  },
  "reviewedAt": "2026-09-03",
  "decisions": [
    {
      "claimId": "...",
      "decisionId": "same as claimId",
      "decision": "supported" or "unsupported",
      "rationale": "short specific rationale tied to the retained extract/source text",
      "artifactIds": ["..."] ,
      "sourceUrls": ["..."]
    }
  ]
}

Requirements:
- Include exactly one decision for every candidate claim in the input, in candidate track order.
- decisionId must equal claimId.
- artifactIds and sourceUrls must exactly match the candidate fact's sourceRefs.
- If a claim says only "Wikipedia states..." and the cited retained extract says the underlying fact, that is supported when the source/extract/offsets match.
- Return valid JSON only as the final response, with no markdown fences or commentary.
