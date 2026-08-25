const TRACKING_QUERY_KEYS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
]);

export function canonicalizeSourceUrl(url) {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) {
    parsed.port = '';
  }
  parsed.hash = '';

  let pathname = parsed.pathname || '/';
  // Wayback replay paths embed the original absolute URL after the capture
  // token. Those two slashes are opaque replay data, not redundant path
  // separators, and collapsing them produces a non-replayable final URL.
  const archiveScheme = pathname.match(/^(\/web\/[^/]+\/https?:)\/\/(.*)$/);
  if (archiveScheme) {
    pathname = `${archiveScheme[1]}//${archiveScheme[2].replace(/\/{2,}/g, '/')}`;
  } else {
    pathname = pathname.replace(/\/{2,}/g, '/');
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  parsed.pathname = pathname;

  const keptParams = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lowerKey)) continue;
    keptParams.push([key, value]);
  }
  keptParams.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyOrder = leftKey.localeCompare(rightKey);
    return keyOrder || leftValue.localeCompare(rightValue);
  });
  parsed.search = '';
  for (const [key, value] of keptParams) parsed.searchParams.append(key, value);

  return parsed.toString();
}

export function sourceIdentityForRef(source) {
  if (source?.sourceIdentity && typeof source.sourceIdentity === 'string' && source.sourceIdentity.trim() !== '') {
    return normalizeIdentity(source.sourceIdentity);
  }
  const parsed = new URL(canonicalizeSourceUrl(source.url));
  const label = typeof source?.label === 'string' ? source.label : '';
  return normalizeIdentity(`${label}|${parsed.hostname}`);
}

function normalizeIdentity(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
