/**
 * Spotify Auth Netlify Function
 * 
 * Handles Spotify OAuth Authorization Code + PKCE flow.
 * Exchange auth code for access + refresh tokens, and refresh expired tokens.
 * 
 * Environment variables needed:
 *   SPOTIFY_CLIENT_ID — Your Spotify Developer app's client ID
 *   SPOTIFY_CLIENT_SECRET — Your Spotify Developer app's client secret
 *   SPOTIFY_REDIRECT_URI — Must match registered redirect URI (https://clawblade.ai/.netlify/functions/spotify-auth)
 * 
 * Endpoints:
 *   POST { action: "token" } — Exchange authorization code for tokens
 *   POST { action: "refresh", refresh_token: "..." } — Refresh expired access token
 */

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const corsHeaders = {
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-origin": "*",
  "content-type": "application/json"
};

async function exchangeCode(code: string, codeVerifier: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REDIRECT_URI");
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
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} — ${errorText}`);
  }

  return response.json();
}

async function refreshToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
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
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json() as { action: string; code?: string; code_verifier?: string; refresh_token?: string };

    if (body.action === "token" && body.code && body.code_verifier) {
      const tokenData = await exchangeCode(body.code, body.code_verifier);
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      }), { headers: corsHeaders });
    }

    if (body.action === "refresh" && body.refresh_token) {
      const tokenData = await refreshToken(body.refresh_token);
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? body.refresh_token,
        expires_in: tokenData.expires_in
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Invalid request. Provide action=token with code+code_verifier, or action=refresh with refresh_token" }), {
      status: 400,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
