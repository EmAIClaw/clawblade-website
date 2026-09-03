You are codex-independent-evidence-reviewer. Perform a read-only semantic evidence review for AlbumVault Track Encyclopedia candidate claims.

Input file: reports/rank13-aretha-review-input.json

Rules:
- Do not edit files.
- Treat each source artifact retainedText as the only evidence.
- For every candidate claim, verify the source artifact id, canonical source URL, and declared offsets/extract support the full claim.
- Decision must be exactly one of: supported, unsupported, uncertain.
- Return JSON only, no markdown.
- Preserve candidateContentHash exactly from the input.
- Include one decision for every claim, decisionId equal to claimId.
- Use reviewer.identity exactly "codex-independent-evidence-reviewer".
- Use reviewer.process exactly "codex exec --sandbox read-only".
- Use reviewer.runId exactly "rank13-final-readonly-review-20260903".

Output schema:
{
  "schemaVersion": 1,
  "albumId": "013-aretha-franklin-i-never-loved-a-man-the-way-i-love-you-e41a23cf",
  "editionNumber": 1,
  "candidateContentHash": "<from input>",
  "reviewer": {"identity":"codex-independent-evidence-reviewer","runId":"rank13-final-readonly-review-20260903","process":"codex exec --sandbox read-only"},
  "reviewedAt": "<ISO timestamp>",
  "decisions": [
    {"decisionId":"<claimId>","claimId":"<claimId>","artifactIds":["<artifact ids from claim sourceRefs>"],"sourceUrls":["<canonical URLs from claim sourceRefs>"],"decision":"supported|unsupported|uncertain","rationale":"<brief evidence-specific rationale>"}
  ]
}
