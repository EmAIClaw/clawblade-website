import { createHash } from 'node:crypto';

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value, new WeakSet()));
}

export function canonicalize(value, seen = new WeakSet()) {
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new Error('Unsupported non-JSON number in canonical value.');
    return value;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    throw new Error(`Unsupported non-JSON value in canonical hash domain: ${type}.`);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('Unsupported cycle in canonical hash domain.');
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new Error('Unsupported sparse array in canonical hash domain.');
    }
    seen.add(value);
    const result = value.map((item) => canonicalize(item, seen));
    seen.delete(value);
    return result;
  }
  if (type === 'object') {
    if (seen.has(value)) throw new Error('Unsupported cycle in canonical hash domain.');
    if (!isPlainObject(value)) {
      throw new Error('Unsupported custom object prototype in canonical hash domain.');
    }
    seen.add(value);
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key], seen);
    }
    seen.delete(value);
    return result;
  }
  throw new Error('Unsupported value in canonical hash domain.');
}

export function computeTrackEncyclopediaContentHash(entry) {
  const content = {
    albumId: entry.albumId,
    trackEntries: entry.trackEntries ?? [],
  };
  return createHash('sha256')
    .update(canonicalStringify(content))
    .digest('hex')
    .slice(0, 16);
}

export function normalizeEvidenceText(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeEvidenceSnapshotHash(snapshot) {
  const content = {
    id: snapshot.id,
    canonicalUrl: snapshot.canonicalUrl,
    normalizedText: normalizeEvidenceText(snapshot.normalizedText),
  };
  return createHash('sha256')
    .update(canonicalStringify(content))
    .digest('hex');
}

function isPlainObject(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
