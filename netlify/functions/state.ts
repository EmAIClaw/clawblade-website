import { getStore } from "@netlify/blobs";
import type { VaultState } from "../../src/types";
import { normalizeVaultState } from "../../src/vaultState";
import {
  allowedCorsOrigin,
  createRateLimiter,
  getClientIp,
  PayloadTooLargeError,
  readLimitedText
} from "./security";

const baseHeaders = {
  "access-control-allow-methods": "GET,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-albumvault-passcode,authorization",
  "content-type": "application/json",
  "cache-control": "no-store"
};

const maxBodyBytes = 1_000_000;
const allowAuthAttempt = createRateLimiter({ maxAttempts: 10, windowMs: 60_000 });

function headersFor(request: Request) {
  const allowedOrigin = allowedCorsOrigin(
    request.headers.get("origin"),
    process.env.ALBUMVAULT_ALLOWED_ORIGIN
  );
  return {
    ...baseHeaders,
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin } : {}),
    vary: "Origin"
  };
}

function emptyState(): VaultState {
  return {
    albums: {},
    sessions: [],
    updatedAt: new Date().toISOString()
  };
}

function authorized(request: Request) {
  const configured = process.env.ALBUMVAULT_PASSCODE;
  if (!configured) return false;
  const headerPasscode = request.headers.get("x-albumvault-passcode");
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerPasscode === configured || auth === configured;
}

function json(request: Request, body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...headersFor(request),
      ...(init.headers ?? {})
    }
  });
}

async function readLimitedJson(request: Request) {
  return JSON.parse(await readLimitedText(request, maxBodyBytes));
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headersFor(request) });
  }

  if (!authorized(request)) {
    const clientIp = getClientIp(request);
    if (!allowAuthAttempt(clientIp)) {
      return json(request, { error: "Too many failed authorization attempts. Try again later." }, { status: 429 });
    }
    return json(request, { error: "Unauthorized. Check ALBUMVAULT_PASSCODE and your app passcode." }, { status: 401 });
  }

  const store = getStore({ name: "albumvault-state" });
  const key = "personal-vault.json";

  if (request.method === "GET") {
    const existing = await store.get(key, { type: "json" });
    return json(request, existing ? normalizeVaultState(existing) : emptyState());
  }

  if (request.method === "PUT") {
    let next: VaultState;
    try {
      next = normalizeVaultState(await readLimitedJson(request));
      next.updatedAt = new Date().toISOString();
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return json(request, { error: "Payload too large" }, { status: 413 });
      }
      return json(request, { error: "Invalid vault state payload" }, { status: 400 });
    }

    await store.setJSON(key, next);
    return json(request, next);
  }

  return json(request, { error: "Method not allowed" }, { status: 405 });
}
