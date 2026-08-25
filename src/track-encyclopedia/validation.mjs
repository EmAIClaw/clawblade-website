// validation.mjs — Quality gates for the versioned track-encyclopedia.
// Imported by the test suite and the build script.

import { canonicalizeSourceUrl, sourceIdentityForRef } from './canonical-url.mjs';
import {
  computeEvidenceSnapshotHash,
  computeTrackEncyclopediaContentHash,
  normalizeEvidenceText,
} from './hash.mjs';
import { validateSourceArtifact, validateSourceReference } from './source-artifacts.mjs';
import { validateSemanticReviewBinding } from './review-artifacts.mjs';

export { canonicalizeSourceUrl, computeEvidenceSnapshotHash };

// ─── Legacy evidence snapshot migration (audit item 3) ────────────

/**
 * Migrate legacy evidence snapshots that lack an internal `id` field.
 * This is a separately named path that does not weaken normal validation.
 * The outer map key is injected as the snapshot's `id`.
 * Hashes are recomputed to include the newly injected `id` (self-describing).
 *
 * @param {{ snapshots: Record<string, object> }} data
 * @returns {{ snapshots: Record<string, object> }}
 */
export function migrateLegacyEvidenceSnapshots(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('migrateLegacyEvidenceSnapshots requires a data object with a snapshots map.');
  }
  const snapshots = data.snapshots ?? {};
  const migrated = {};
  for (const [id, snapshot] of Object.entries(snapshots)) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error(`Legacy snapshot "${id}" is not an object.`);
    }
    const migratedSnapshot = { ...snapshot, id: snapshot.id ?? id };
    // Recompute hash to include the id (self-describing)
    migratedSnapshot.contentHash = computeEvidenceSnapshotHash(migratedSnapshot);
    migrated[id] = migratedSnapshot;
  }
  return { ...data, snapshots: migrated };
}

// ─── Semantic evidence-review gate ────────────────────────────────

/**
 * Semantic evidence-review gate requiring a recorded independent human
 * semantic decision beyond term-overlap heuristics.
 *
 * @param {{ claim: string, sourceExtract: string, humanReview?: { reviewer: string, reviewedAt: string, semanticDecision: 'supported' | 'unsupported' | 'uncertain', notes?: string } }} input
 * @returns {{ approved: boolean }}
 */
export function reviewEvidenceGate({ claim, sourceExtract, humanReview } = {}) {
  if (!claim || typeof claim !== 'string' || claim.trim() === '') {
    throw new Error('reviewEvidenceGate requires a claim.');
  }
  if (!sourceExtract || typeof sourceExtract !== 'string' || sourceExtract.trim() === '') {
    throw new Error('reviewEvidenceGate requires a sourceExtract.');
  }
  if (!humanReview || typeof humanReview !== 'object') {
    throw new Error('reviewEvidenceGate requires a recorded independent human semantic review; term-overlap alone is not sufficient.');
  }
  if (typeof humanReview.reviewer !== 'string' || humanReview.reviewer.trim() === '') {
    throw new Error('reviewEvidenceGate humanReview requires a reviewer identity.');
  }
  if (typeof humanReview.reviewedAt !== 'string' || humanReview.reviewedAt.trim() === '') {
    throw new Error('reviewEvidenceGate humanReview requires a reviewedAt timestamp.');
  }
  if (!humanReview.semanticDecision || !['supported', 'unsupported', 'uncertain'].includes(humanReview.semanticDecision)) {
    throw new Error('reviewEvidenceGate humanReview requires an explicit semanticDecision: supported, unsupported, or uncertain.');
  }
  if (humanReview.semanticDecision === 'unsupported') {
    throw new Error(`reviewEvidenceGate: human semantic review marked claim as unsupported: "${claim.slice(0, 80)}"`);
  }
  if (humanReview.semanticDecision === 'uncertain') {
    throw new Error(`reviewEvidenceGate: human semantic review marked claim as uncertain — cannot approve without resolved decision: "${claim.slice(0, 80)}"`);
  }
  return { approved: true };
}

export const EVIDENCE_LEVELS = ['documented', 'contextual', 'limited', 'insufficient-evidence', 'unresearched'];
export const EVIDENCE_STATUSES = ['retrieved', 'checked', 'unavailable'];
export const EXTRACT_TYPES = ['verbatim', 'paraphrase'];

const BOILERPLATE_PATTERNS = [
  /no confident track-specific external source was found/i,
  /this entry uses static track metadata only/i,
  /track \d+ of \d+,.*is the album's.*and runs/i,
  /in the album sequence it (follows|opens|closes|leads into)/i,
];

const SUBJECTIVE_MARKERS = [
  /\b(best|worst|greatest|most amazing|incredible|perfect)\b/i,
  /\b(I (think|feel|believe|love|hate))\b/i,
  /\b(my favorite|all time|underrated|overrated)\b/i,
];

const VALID_SCHEMES = ['https:'];

export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return VALID_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateSourceRef(source, { allowLegacyNonCanonicalSourceUrls = false } = {}) {
  if (!source || typeof source !== 'object') {
    throw new Error('Source reference is required.');
  }
  if (!source.url || source.url.trim() === '') {
    throw new Error('Source ref URL is required.');
  }
  if (!isValidUrl(source.url)) {
    throw new Error(`Source ref URL must be a valid HTTPS URL: "${source.url}"`);
  }
  if (!allowLegacyNonCanonicalSourceUrls && canonicalizeSourceUrl(source.url) !== source.url) {
    throw new Error(`Source ref URL must be canonical: "${source.url}"`);
  }
  if (!source.label || source.label.trim() === '') {
    throw new Error('Source ref label is required.');
  }
  if (!source.title || source.title.trim() === '') {
    throw new Error('Source ref title is required.');
  }
  if (source.extract != null) {
    if (typeof source.extract !== 'string' || source.extract.trim() === '') {
      throw new Error('Source ref extract must be non-empty when provided.');
    }
    if (!source.extractType || !EXTRACT_TYPES.includes(source.extractType)) {
      throw new Error('Source ref with evidence extract requires extractType: verbatim or paraphrase.');
    }
    if (!source.evidenceStatus || !EVIDENCE_STATUSES.includes(source.evidenceStatus)) {
      throw new Error('Source ref with evidence extract requires explicit evidenceStatus retrieval state.');
    }
  }
}

export function validateEvidenceSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Evidence snapshot is required.');
  }
  if (!snapshot.id || typeof snapshot.id !== 'string' || snapshot.id.trim() === '') {
    throw new Error('Evidence snapshot id is required.');
  }
  if (!snapshot.canonicalUrl || typeof snapshot.canonicalUrl !== 'string') {
    throw new Error(`Evidence snapshot "${snapshot.id}" requires canonicalUrl.`);
  }
  if (canonicalizeSourceUrl(snapshot.canonicalUrl) !== snapshot.canonicalUrl) {
    throw new Error(`Evidence snapshot "${snapshot.id}" canonicalUrl is not canonical.`);
  }
  if (!snapshot.normalizedText || typeof snapshot.normalizedText !== 'string' || normalizeEvidenceText(snapshot.normalizedText) === '') {
    throw new Error(`Evidence snapshot "${snapshot.id}" requires normalizedText.`);
  }
  if (snapshot.normalizedText !== normalizeEvidenceText(snapshot.normalizedText)) {
    throw new Error(`Evidence snapshot "${snapshot.id}" normalizedText is not normalized.`);
  }
  const expectedHash = computeEvidenceSnapshotHash(snapshot);
  if (snapshot.contentHash !== expectedHash) {
    throw new Error(`Evidence snapshot hash mismatch for "${snapshot.id}": expected "${expectedHash}".`);
  }
}

export function isBoilerplate(text) {
  if (!text || typeof text !== 'string') return false;
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isSubjectiveClaim(text) {
  if (!text || typeof text !== 'string') return false;
  return SUBJECTIVE_MARKERS.some((pattern) => pattern.test(text));
}

export function sourceClaimIsConsistentWithEvidence(claim, sourceText) {
  const claimTerms = significantTerms(claim);
  const sourceTerms = new Set(significantTerms(sourceText));
  if (claimTerms.length === 0 || sourceTerms.size === 0) return false;

  let overlap = 0;
  for (const term of claimTerms) {
    if (sourceTerms.has(term)) overlap += 1;
  }
  return overlap >= 3 && overlap / claimTerms.length >= 0.22;
}

export function validateTrackEntry(track, {
  requireIdentity = false,
  albumId = null,
  entry = null,
  evidenceSnapshots = null,
  sourceArtifacts = null,
  reviewArtifacts = null,
  allowLegacySelfAttestedEvidence = false,
  allowLegacyNonCanonicalSourceUrls = false,
} = {}) {
  if (!track || typeof track !== 'object') {
    throw new Error('Track entry is required.');
  }
  if (!track.trackTitle || track.trackTitle.trim() === '') {
    throw new Error('Track entry must have a trackTitle.');
  }
  if (requireIdentity && (!track.albumId || track.albumId.trim() === '')) {
    throw new Error(`Track "${track.trackTitle}": albumId is required for stable identity.`);
  }
  if (requireIdentity && track.albumId !== albumId) {
    throw new Error(`Track "${track.trackTitle}": track albumId must match entry albumId.`);
  }
  if (requireIdentity && (!Number.isInteger(track.discNumber) || track.discNumber < 1)) {
    throw new Error(`Track "${track.trackTitle}": discNumber is required for stable identity.`);
  }
  if (requireIdentity && (!Number.isInteger(track.trackNumber) || track.trackNumber < 1)) {
    throw new Error(`Track "${track.trackTitle}": trackNumber is required for stable identity.`);
  }
  if (!track.evidenceLevel || !EVIDENCE_LEVELS.includes(track.evidenceLevel)) {
    throw new Error(`Track "${track.trackTitle}": evidence level is required and must be one of ${EVIDENCE_LEVELS.join(', ')}.`);
  }

  // Reject contradictory completed-research state before attempting to
  // validate claim evidence, so callers receive the governing schema error.
  if (track.evidenceLevel === 'insufficient-evidence' && (track.verifiedFacts ?? []).length > 0) {
    throw new Error(`Track "${track.trackTitle}": insufficient-evidence entry cannot contain verifiedFacts.`);
  }

  // verifiedFacts: every claim must have at least one source ref
  for (const fact of track.verifiedFacts ?? []) {
    if (!fact.claim || fact.claim.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": factual claim cannot be empty.`);
    }
    if (isSubjectiveClaim(fact.claim)) {
      throw new Error(`Track "${track.trackTitle}": claim appears to be fan perspective masquerading as fact: "${fact.claim.slice(0, 80)}"`);
    }
    if (!fact.sourceRefs || fact.sourceRefs.length === 0) {
      throw new Error(`Track "${track.trackTitle}": factual claim requires sourceRef — "${fact.claim.slice(0, 80)}"`);
    }
    let supported = false;
    for (const ref of fact.sourceRefs) {
      validateSourceRef(ref, { allowLegacyNonCanonicalSourceUrls });
      validateSourceRefAgainstArtifact(ref, {
        evidenceSnapshots,
        sourceArtifacts,
        context: `Track "${track.trackTitle}": factual claim sourceRef`,
        allowLegacySelfAttestedEvidence,
        allowLegacyNonCanonicalSourceUrls,
      });
      if (sourceClaimIsConsistentWithEvidence(fact.claim, ref.extract)) {
        supported = true;
      }
    }
    if (!supported) {
      throw new Error(`Track "${track.trackTitle}": verbatim extract is not consistent with factual claim — "${fact.claim.slice(0, 80)}"`);
    }
    if (sourceArtifacts !== null || reviewArtifacts !== null) {
      validateSemanticReviewBinding({ entry, fact, sourceArtifacts, reviewArtifacts });
    }
  }

  // criticalReception: each critic view must have publication or attribution
  for (const view of track.criticalReception ?? []) {
    if (!view.view || view.view.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": critic view cannot be empty.`);
    }
    if ((!view.publication || view.publication.trim() === '') && (!view.critic || view.critic.trim() === '')) {
      throw new Error(`Track "${track.trackTitle}": critic view requires publication or critic attribution: "${view.view.slice(0, 80)}"`);
    }
    if (!view.sourceRef) {
      throw new Error(`Track "${track.trackTitle}": critic view requires sourceRef verification: "${view.view.slice(0, 80)}"`);
    }
    validateSourceRef(view.sourceRef, { allowLegacyNonCanonicalSourceUrls });
    validateSourceRefAgainstArtifact(view.sourceRef, {
      evidenceSnapshots,
      sourceArtifacts,
      context: `Track "${track.trackTitle}": critic sourceRef`,
      allowLegacySelfAttestedEvidence,
      allowLegacyNonCanonicalSourceUrls,
    });
    if (!view.sourceRef.extract || view.sourceRef.extractType !== 'verbatim' || !sourceClaimIsConsistentWithEvidence(view.view, view.sourceRef.extract)) {
      throw new Error(`Track "${track.trackTitle}": critic sourceRef is not consistent with critical reception claim.`);
    }
  }

  // fanPerspective: must be labelled and sufficiently grounded
  for (const fan of track.fanPerspective ?? []) {
    if (!fan.perspective || fan.perspective.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": fan perspective cannot be empty.`);
    }
    if (!fan.label || fan.label.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": fan perspective must be labelled.`);
    }
    if (fan.grounded !== true && (!fan.grounding || fan.grounding.trim() === '')) {
      throw new Error(`Track "${track.trackTitle}": fan perspective must be labelled and sufficiently grounded.`);
    }
    if (!Array.isArray(fan.sourceRefs) || fan.sourceRefs.length === 0) {
      throw new Error(`Track "${track.trackTitle}": fan perspective requires explicit community sourceRefs; grounded text alone is not enough.`);
    }
    for (const ref of fan.sourceRefs) {
      validateSourceRef(ref, { allowLegacyNonCanonicalSourceUrls });
      if (!ref.extract || ref.extractType !== 'verbatim' || (ref.evidenceStatus !== 'retrieved' && ref.evidenceStatus !== 'checked')) {
        throw new Error(`Track "${track.trackTitle}": fan perspective sourceRefs require retrieved verbatim excerpts.`);
      }
    }
    if (/\b(consensus|generally|widely|most fans|fans (consider|regard|cite))\b/i.test(`${fan.label} ${fan.perspective}`) && fan.sourceRefs.length < 2) {
      throw new Error(`Track "${track.trackTitle}": fan consensus requires at least two independent community sourceRefs.`);
    }
    if (/\b(consensus|generally|widely|most fans|fans (consider|regard|cite))\b/i.test(`${fan.label} ${fan.perspective}`)) {
      validateIndependentSourceRefs(fan.sourceRefs, `Track "${track.trackTitle}": fan consensus`);
    }
  }

  // discoveryConnections: each must have a rationale
  for (const conn of track.discoveryConnections ?? []) {
    if (!conn.relatedTrackTitle || conn.relatedTrackTitle.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": discovery connection must have a relatedTrackTitle.`);
    }
    if (!conn.rationale || conn.rationale.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": discovery connection to "${conn.relatedTrackTitle}" requires a rationale.`);
    }
  }

  // Reject unsupported artist intent claims in verifiedFacts
  for (const fact of track.verifiedFacts ?? []) {
    if (/artist (intended|meant|wanted to)/i.test(fact.claim) && fact.sourceRefs.length === 0) {
      throw new Error(`Track "${track.trackTitle}": unsupported artist intent claim requires a source: "${fact.claim.slice(0, 80)}"`);
    }
  }

  // musicalCharacter: reject boilerplate as publishable prose
  if (isBoilerplate(track.musicalCharacter)) {
    throw new Error(`Track "${track.trackTitle}": metadata-only boilerplate is not publishable prose for musicalCharacter.`);
  }
  if (isBoilerplate(track.albumContext)) {
    throw new Error(`Track "${track.trackTitle}": metadata-only boilerplate is not publishable prose for albumContext.`);
  }
  if (isBoilerplate(track.listeningNotes)) {
    throw new Error(`Track "${track.trackTitle}": metadata-only boilerplate is not publishable prose for listeningNotes.`);
  }

  // For documented/contextual entries, require some content beyond limitations
  if ((track.evidenceLevel === 'documented' || track.evidenceLevel === 'contextual') &&
      (track.verifiedFacts ?? []).length === 0 &&
      (track.criticalReception ?? []).length === 0 &&
      !(track.musicalCharacter || '').trim() &&
      !(track.albumContext || '').trim() &&
      !(track.listeningNotes || '').trim()) {
    throw new Error(`Track "${track.trackTitle}": ${track.evidenceLevel} entry must have substantive content beyond limitations.`);
  }

  // A completed insufficient-evidence disposition must be distinguishable from
  // an entry that was never researched.
  if (track.evidenceLevel === 'insufficient-evidence') {
    const disposition = track.researchDisposition;
    if (!disposition || typeof disposition !== 'object') {
      throw new Error(`Track "${track.trackTitle}": insufficient-evidence entry requires a completed research disposition with searched queries and source classes.`);
    }
    if (typeof disposition.completedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(disposition.completedAt)) {
      throw new Error(`Track "${track.trackTitle}": research disposition requires completedAt in YYYY-MM-DD format.`);
    }
    if (!Array.isArray(disposition.searchedQueries) || disposition.searchedQueries.length === 0 || disposition.searchedQueries.some((query) => typeof query !== 'string' || query.trim() === '')) {
      throw new Error(`Track "${track.trackTitle}": research disposition requires non-empty searchedQueries.`);
    }
    if (!Array.isArray(disposition.sourceClasses) || disposition.sourceClasses.length === 0 || disposition.sourceClasses.some((sourceClass) => typeof sourceClass !== 'string' || sourceClass.trim() === '')) {
      throw new Error(`Track "${track.trackTitle}": research disposition requires non-empty source classes.`);
    }
    if (typeof disposition.outcome !== 'string' || disposition.outcome.trim() === '') {
      throw new Error(`Track "${track.trackTitle}": research disposition requires an explicit outcome.`);
    }

    if (!Array.isArray(track.limitations) || track.limitations.length === 0) {
      throw new Error(`Track "${track.trackTitle}": insufficient-evidence entry requires explicit limitations.`);
    }
  }

  // For unresearched entries, limitations are required
  if (track.evidenceLevel === 'unresearched' && (!track.limitations || track.limitations.length === 0)) {
    throw new Error(`Track "${track.trackTitle}": unresearched entry must include limitations explaining what is missing.`);
  }
}

export function validateEntry(entry, {
  evidenceSnapshots = null,
  sourceArtifacts = null,
  reviewArtifacts = null,
  allowLegacySelfAttestedEvidence = false,
} = {}) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Entry is required.');
  }
  if (!entry.albumId || entry.albumId.trim() === '') {
    throw new Error('Entry must have an albumId.');
  }
  if (typeof entry.editionNumber !== 'number' || entry.editionNumber < 1) {
    throw new Error('Entry must have a valid editionNumber >= 1.');
  }
  if (typeof entry.published !== 'boolean') {
    throw new Error('Entry must have a published boolean.');
  }
  if (!entry.contentHash || entry.contentHash.trim() === '') {
    throw new Error('Entry must have a contentHash.');
  }
  const expectedHash = computeTrackEncyclopediaContentHash(entry);
  if (entry.contentHash !== expectedHash) {
    throw new Error(`Entry contentHash mismatch: stale hash "${entry.contentHash}", expected "${expectedHash}".`);
  }
  if (!entry.changeNote || entry.changeNote.trim() === '') {
    throw new Error('Entry must have a changeNote.');
  }
  if (!entry.generationMetadata || typeof entry.generationMetadata !== 'object') {
    throw new Error('Entry must have generationMetadata.');
  }
  if (!entry.reviewMetadata || typeof entry.reviewMetadata !== 'object') {
    throw new Error('Entry must have reviewMetadata.');
  }
  if (!Array.isArray(entry.trackEntries)) {
    throw new Error('Entry must have a trackEntries array.');
  }
  const candidateClaimIds = new Set();
  const reviewRecordIds = new Set();
  for (const track of entry.trackEntries) {
    for (const fact of track.verifiedFacts ?? []) {
      if (sourceArtifacts !== null && (typeof fact.claimId !== 'string' || !fact.claimId.trim())) {
        throw new Error(`Track "${track.trackTitle}": evidence-bearing claim requires a stable claimId.`);
      }
      if (fact.claimId) {
        const claimPrefix = `${entry.albumId}:${track.discNumber}:${track.trackNumber}:fact-`;
        if (!fact.claimId.startsWith(claimPrefix) || !/^[1-9]\d*$/.test(fact.claimId.slice(claimPrefix.length))) {
          throw new Error(`Claim ${fact.claimId} must use globally unique stable identity ${claimPrefix}<ordinal>.`);
        }
        if (candidateClaimIds.has(fact.claimId)) throw new Error(`Duplicate candidate claimId ${fact.claimId}.`);
        candidateClaimIds.add(fact.claimId);
      }
      if (sourceArtifacts !== null && fact.semanticReview?.recordId) reviewRecordIds.add(fact.semanticReview.recordId);
    }
  }
  const allowLegacyNonCanonicalSourceUrls = entry.albumId === '004-stevie-wonder-songs-in-the-key-of-life-0518d4f8' && entry.editionNumber <= 2;
  for (const track of entry.trackEntries) {
    validateTrackEntry(track, {
      requireIdentity: true,
      albumId: entry.albumId,
      entry,
      evidenceSnapshots,
      sourceArtifacts,
      reviewArtifacts,
      allowLegacySelfAttestedEvidence,
      allowLegacyNonCanonicalSourceUrls,
    });
  }
  if (sourceArtifacts !== null && candidateClaimIds.size > 0) {
    if (reviewRecordIds.size !== 1) throw new Error('Candidate claims must bind to exactly one immutable review record.');
    const [recordId] = reviewRecordIds;
    const record = reviewArtifacts?.[recordId];
    if (!record) throw new Error(`Missing semantic review record ${recordId}.`);
    if (entry.reviewMetadata.reviewer !== record.reviewer.identity || entry.reviewMetadata.reviewedAt !== record.reviewedAt || entry.reviewMetadata.notes !== `Imported immutable independent review ${record.recordId}.`) {
      throw new Error('Entry reviewMetadata must exactly match the bound immutable review record.');
    }
    const reviewedClaimIds = new Set(record.decisions.map((decision) => decision.claimId));
    if (record.decisions.length !== candidateClaimIds.size || reviewedClaimIds.size !== candidateClaimIds.size || [...candidateClaimIds].some((claimId) => !reviewedClaimIds.has(claimId))) {
      throw new Error('Semantic review decision claim set must exactly match the candidate claim set.');
    }
  }
}

function validateSourceRefAgainstArtifact(ref, {
  evidenceSnapshots,
  sourceArtifacts,
  context,
  allowLegacySelfAttestedEvidence = false,
  allowLegacyNonCanonicalSourceUrls = false,
}) {
  if (!ref.extract || ref.extract.trim() === '') {
    throw new Error(`${context} requires extract text for automated retained-evidence checking.`);
  }
  if (ref.extractType !== 'verbatim') {
    throw new Error(`${context} extract must be verbatim, not paraphrase.`);
  }
  if (ref.evidenceStatus !== 'retrieved' && ref.evidenceStatus !== 'checked') {
    throw new Error(`${context} requires retrieved or checked evidenceStatus.`);
  }
  if (sourceArtifacts !== null) {
    if (!ref.artifactId || typeof ref.artifactId !== 'string') {
      throw new Error(`${context} requires artifactId for independently fetched evidence.`);
    }
    const artifact = sourceArtifacts?.[ref.artifactId];
    if (!artifact) throw new Error(`${context} references missing source artifact "${ref.artifactId}".`);
    validateSourceArtifact(artifact, { excerpt: ref.extract });
    validateSourceReference(ref, artifact, { allowLegacyNonCanonicalSourceUrls });
    return;
  }
  if (allowLegacySelfAttestedEvidence && !ref.snapshotId) return;
  if (!ref.snapshotId || typeof ref.snapshotId !== 'string' || ref.snapshotId.trim() === '') {
    throw new Error(`${context} requires snapshotId for independently retained evidence.`);
  }
  if (!evidenceSnapshots || typeof evidenceSnapshots !== 'object') {
    throw new Error(`${context} requires an independently loaded evidence snapshot store.`);
  }
  const snapshot = evidenceSnapshots[ref.snapshotId];
  if (!snapshot) {
    throw new Error(`${context} references missing retained evidence snapshot "${ref.snapshotId}".`);
  }
  validateEvidenceSnapshot(snapshot);
  if (canonicalizeSourceUrl(ref.url) !== snapshot.canonicalUrl) {
    throw new Error(`${context} URL does not match retained evidence snapshot canonical URL.`);
  }
  const normalizedExtract = normalizeEvidenceText(ref.extract);
  if (!normalizeEvidenceText(snapshot.normalizedText).includes(normalizedExtract)) {
    throw new Error(`${context} verbatim extract is not an exact normalized substring of retained evidence snapshot "${ref.snapshotId}".`);
  }
}

function validateIndependentSourceRefs(refs, context) {
  const urls = new Set();
  const identities = new Set();
  for (const ref of refs) {
    urls.add(canonicalizeSourceUrl(ref.url));
    identities.add(sourceIdentityForRef(ref));
  }
  if (urls.size < 2) {
    throw new Error(`${context} requires at least two distinct canonical source URLs.`);
  }
  if (identities.size < 2) {
    throw new Error(`${context} requires at least two distinct source identities.`);
  }
}

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'album', 'also', 'and', 'any', 'are', 'been',
  'being', 'but', 'can', 'direction', 'does', 'for', 'from', 'had', 'has',
  'have', 'her', 'his', 'into', 'its', 'listeners', 'material', 'not', 'one',
  'rather', 'record', 'same', 'song', 'than', 'that', 'the', 'their', 'then',
  'this', 'through', 'toward', 'track', 'was', 'with',
]);

function significantTerms(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
    .map(stem);
}

function stem(term) {
  return term
    .replace(/ies$/, 'y')
    .replace(/ing$/, '')
    .replace(/ed$/, '')
    .replace(/s$/, '');
}

// ─── Boilerplate detection ──────────────────────────────────────

export function detectBoilerplate(tracks) {
  const results = [];
  const normalized = tracks.map((t) => ({
    trackTitle: t.trackTitle,
    normalized: normalizeForComparison(t.guide || t.musicalCharacter || ''),
  }));

  // Check for near-duplicate text
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const sim = textSimilarity(normalized[i].normalized, normalized[j].normalized);
      if (sim >= 0.85) {
        results.push({
          type: 'near-duplicate',
          trackTitles: [normalized[i].trackTitle, normalized[j].trackTitle],
          similarity: sim,
        });
      }
    }
  }

  // Check for boilerplate template text
  const boilerplateTracks = normalized.filter((t) => isBoilerplate(t.normalized));
  if (boilerplateTracks.length >= 2) {
    results.push({
      type: 'template-boilerplate',
      trackTitles: boilerplateTracks.map((t) => t.trackTitle),
      similarity: 1.0,
    });
  }

  return results;
}

function normalizeForComparison(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.split(' ').filter(Boolean));
  const wordsB = new Set(b.split(' ').filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap += 1;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}
