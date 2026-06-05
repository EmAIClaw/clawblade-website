/**
 * Spotify Auth Netlify Function
 *
 * Handles Spotify OAuth Authorization Code + PKCE flow.
 * Refresh tokens are stored in an httpOnly cookie, not browser storage.
 *
 * Environment variables needed:
 *   SPOTIFY_CLIENT_ID — Spotify Developer app client ID
 *   SPOTIFY_CLIENT_SECRET — Spotify Developer app client secret
 *   SPOTIFY_REDIRECT_URI — Must match registered redirect URI
 *   ALBUMVAULT_ALLOWED_ORIGIN — e.g. https://clawblade.ai
 */

import { allowedCorsOrigin } from "./security";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const refreshCookieName = "albumvault_spotify_refresh";

function corsHeaders(request: Request) {
  return {
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-origin": allowedCorsOrigin(
      request.headers.get("origin"),
      process.env.ALBUMVAULT_ALLOWED_ORIGIN
    ),
    "access-control-allow-credentials": "true",
    "content-type": "application/json",
    vary: "Origin"
  };
}

function refreshCookie(value: string, maxAge: number) {
  return `${refreshCookieName}=${encodeURIComponent(value)}; Path=/.netlify/functions/spotify-auth; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

async function exchangeCode(code: string, codeVerifier: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Spotify server configuration");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    }).toString()
  });

  if (!response.ok) {
    console.error("Spotify token exchange failed", response.status, await response.text());
    throw new Error("Token exchange failed");
  }

  return response.json();
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify server configuration");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    }).toString()
  });

  if (!response.ok) {
    console.error("Spotify token refresh failed", response.status, await response.text());
    throw new Error("Token refresh failed");
  }

  return response.json();
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders(request)
    });
  }

  try {
    const body = await request.json() as { action: string; code?: string; code_verifier?: string };

    if (body.action === "config") {
      return new Response(JSON.stringify({
        client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
        configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_REDIRECT_URI)
      }), { headers: corsHeaders(request) });
    }

    if (body.action === "logout") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          ...corsHeaders(request),
          "set-cookie": refreshCookie("", 0)
        }
      });
    }

    if (body.action === "token" && body.code && body.code_verifier) {
      const tokenData = await exchangeCode(body.code, body.code_verifier);
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      }), {
        headers: {
          ...corsHeaders(request),
          "set-cookie": refreshCookie(tokenData.refresh_token, 60 * 60 * 24 * 30)
        }
      });
    }

    if (body.action === "refresh") {
      const currentRefreshToken = getCookie(request, refreshCookieName);
      if (!currentRefreshToken) {
        return new Response(JSON.stringify({ error: "Spotify session expired" }), {
          status: 401,
          headers: corsHeaders(request)
        });
      }
      const tokenData = await refreshAccessToken(currentRefreshToken);
      const headers: Record<string, string> = { ...corsHeaders(request) };
      if (tokenData.refresh_token) {
        headers["set-cookie"] = refreshCookie(tokenData.refresh_token, 60 * 60 * 24 * 30);
      }
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      }), { headers });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: corsHeaders(request)
    });
  } catch (error) {
    console.error("Spotify auth function failed", error);
    return new Response(JSON.stringify({ error: "Spotify authentication failed" }), {
      status: 500,
      headers: corsHeaders(request)
    });
  }
}
