import { getStore } from '@netlify/blobs';

import {
  allowedCorsOrigin,
  createRateLimiter,
  getClientIp,
  PayloadTooLargeError,
  readLimitedText,
} from './security';

const maxBodyBytes = 2_000_000;
const allowAuthAttempt = createRateLimiter({ maxAttempts: 10, windowMs: 60_000 });

type StoredBackup = {
  payload: string;
  updatedAt?: string;
};

function headersFor(request: Request) {
  const allowedOrigin = allowedCorsOrigin(
    request.headers.get('origin'),
    process.env.ALBUMVAULT_ALLOWED_ORIGIN,
  );
  return {
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,x-gym-tracker-passcode',
    ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin } : {}),
    'cache-control': 'no-store',
    'content-type': 'application/json',
    vary: 'Origin',
  };
}

function json(request: Request, body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...headersFor(request), ...(init.headers ?? {}) },
  });
}

function authorized(request: Request) {
  const configured = process.env.GYM_TRACKER_PASSCODE;
  return Boolean(configured && request.headers.get('x-gym-tracker-passcode') === configured);
}

function validBackupPayload(payload: unknown): payload is string {
  if (typeof payload !== 'string') return false;
  try {
    const parsed = JSON.parse(payload) as { version?: unknown };
    return parsed.version === 1;
  } catch {
    return false;
  }
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: headersFor(request) });
  }

  if (!authorized(request)) {
    if (!allowAuthAttempt(getClientIp(request))) {
      return json(request, { error: 'Too many failed authorization attempts. Try again later.' }, { status: 429 });
    }
    return json(request, { error: 'Unauthorized cloud backup request.' }, { status: 401 });
  }

  const store = getStore({ name: 'gym-tracker-state' });
  const key = 'personal-history.json';

  if (request.method === 'GET') {
    const existing = await store.get(key, { type: 'json' }) as StoredBackup | null;
    return json(request, existing ?? {});
  }

  if (request.method === 'PUT') {
    let text: string;
    try {
      text = await readLimitedText(request, maxBodyBytes);
    } catch (error) {
      if (!(error instanceof PayloadTooLargeError)) throw error;
      return json(request, { error: 'Backup payload is too large.' }, { status: 413 });
    }

    try {
      const body = JSON.parse(text) as StoredBackup;
      if (!validBackupPayload(body.payload)) {
        return json(request, { error: 'Invalid Gym Tracker backup payload.' }, { status: 400 });
      }
      const backup: StoredBackup = { payload: body.payload, updatedAt: body.updatedAt };
      await store.setJSON(key, backup);
      return json(request, { updatedAt: backup.updatedAt });
    } catch {
      return json(request, { error: 'Invalid request body.' }, { status: 400 });
    }
  }

  return json(request, { error: 'Method not allowed.' }, { status: 405 });
}
