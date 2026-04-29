import { getStore } from "@netlify/blobs";
import type { VaultState } from "../../src/types";

const baseHeaders = {
  "access-control-allow-methods": "GET,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-albumvault-passcode,authorization",
  "content-type": "application/json",
  "cache-control": "no-store"
};

const maxBodyBytes = 1_000_000;

function headersFor(request: Request) {
  const allowedOrigin = process.env.ALBUMVAULT_ALLOWED_ORIGIN;
  const requestOrigin = request.headers.get("origin");
  const origin = allowedOrigin ? (requestOrigin === allowedOrigin ? allowedOrigin : "null") : "*";
  return {
    ...baseHeaders,
    "access-control-allow-origin": origin,
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

function validState(body: unknown): body is VaultState {
  if (!body || typeof body !== "object") return false;
  const candidate = body as VaultState;
  if (!candidate.albums || typeof candidate.albums !== "object" || Array.isArray(candidate.albums)) return false;
  if (!Array.isArray(candidate.sessions)) return false;
  return true;
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

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headersFor(request) });
  }

  if (!authorized(request)) {
    return json(request, { error: "Unauthorized. Check ALBUMVAULT_PASSCODE and your app passcode." }, { status: 401 });
  }

  const store = getStore({ name: "albumvault-state" });
  const key = "personal-vault.json";

  if (request.method === "GET") {
    const existing = await store.get(key, { type: "json" });
    return json(request, existing ?? emptyState());
  }

  if (request.method === "PUT") {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxBodyBytes) {
      return json(request, { error: "Payload too large" }, { status: 413 });
    }

    let body: VaultState;
    try {
      const parsed = await request.json();
      if (!validState(parsed)) {
        return json(request, { error: "Invalid vault state payload" }, { status: 400 });
      }
      body = parsed;
    } catch {
      return json(request, { error: "Invalid JSON payload" }, { status: 400 });
    }

    const next: VaultState = {
      albums: body.albums ?? {},
      sessions: Array.isArray(body.sessions) ? body.sessions.slice(0, 500) : [],
      updatedAt: new Date().toISOString()
    };
    await store.setJSON(key, next);
    return json(request, next);
  }

  return json(request, { error: "Method not allowed" }, { status: 405 });
}
