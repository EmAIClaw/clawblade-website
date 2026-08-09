/**
 * Spotify Search Netlify Function
 * 
 * Handles server-side Spotify API access using the Client Credentials OAuth flow.
 * No user authentication required — searches the Spotify catalog for tracks and albums.
 * 
 * Environment variables needed:
 *   SPOTIFY_CLIENT_ID — Your Spotify Developer app's client ID
 *   SPOTIFY_CLIENT_SECRET — Your Spotify Developer app's client secret
 * 
 * Usage:
 *   GET /.netlify/functions/spotify?q=artist+track+album
 *   Returns track URI, album URI, and external Spotify URL (or error).
 */

import {
  allowedCorsOrigin,
  createRateLimiter,
  getClientIp
} from "./security";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

// Cache token across warm invocations
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const allowSearch = createRateLimiter({ maxAttempts: 120, windowMs: 60_000 });
const maxQueryLength = 300;

class SpotifyNotConfiguredError extends Error {}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SpotifyNotConfiguredError("Spotify client credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // 60s buffer
  return cachedToken;
}

interface SpotifySearchResult {
  spotifyTrackUrl: string | null;
  spotifyAlbumUrl: string | null;
  spotifyAlbumUri: string | null;
  spotifyTrackUri: string | null;
  spotifyAlbumArtworkUrl: string | null;
  spotifyAlbumId: string | null;
  spotifyTrackId: string | null;
  artistName: string | null;
  albumName: string | null;
  trackName: string | null;
  configured: boolean; // whether Spotify is configured
  error?: string;
}

function notConfigured(): SpotifySearchResult {
  return {
    spotifyTrackUrl: null,
    spotifyAlbumUrl: null,
    spotifyAlbumUri: null,
    spotifyTrackUri: null,
    spotifyAlbumArtworkUrl: null,
    spotifyAlbumId: null,
    spotifyTrackId: null,
    artistName: null,
    albumName: null,
    trackName: null,
    configured: false
  };
}

async function searchSpotify(query: string): Promise<SpotifySearchResult> {
  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({
      q: query,
      type: "track,album",
      limit: "3"
    });

    const response = await fetch(`${SPOTIFY_SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json() as {
      tracks?: { items: Array<{
        id: string;
        uri: string;
        name: string;
        external_urls: { spotify: string };
        album: {
          id: string;
          name: string;
          uri: string;
          external_urls: { spotify: string };
          images: Array<{ url: string; height: number }>;
          artists: Array<{ name: string }>;
        };
        artists: Array<{ name: string }>;
      }> };
      albums?: { items: Array<{
        id: string;
        name: string;
        uri: string;
        external_urls: { spotify: string };
        images: Array<{ url: string; height: number }>;
        artists: Array<{ name: string }>;
      }> };
    };

    const track = data.tracks?.items?.[0] ?? null;
    const album = data.albums?.items?.[0] ?? null;

    return {
      spotifyTrackUrl: track?.external_urls?.spotify ?? null,
      spotifyAlbumUrl: (track?.album?.external_urls?.spotify) ?? album?.external_urls?.spotify ?? null,
      spotifyAlbumUri: (track?.album?.uri) ?? album?.uri ?? null,
      spotifyTrackUri: track?.uri ?? null,
      spotifyAlbumArtworkUrl: track?.album?.images?.[0]?.url ?? album?.images?.[0]?.url ?? null,
      spotifyAlbumId: track?.album?.id ?? album?.id ?? null,
      spotifyTrackId: track?.id ?? null,
      artistName: track?.artists?.[0]?.name ?? album?.artists?.[0]?.name ?? null,
      albumName: track?.album?.name ?? album?.name ?? null,
      trackName: track?.name ?? null,
      configured: true
    };
  } catch (error) {
    if (error instanceof SpotifyNotConfiguredError) {
      return notConfigured();
    }
    return {
      ...notConfigured(),
      configured: true,
      error: "Spotify search temporarily unavailable"
    };
  }
}

const corsHeaders = {
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "content-type": "application/json"
};

function responseHeaders(
  baseHeaders: Record<string, string>,
  cacheControl: "success" | "no-store"
) {
  return {
    ...baseHeaders,
    "cache-control": cacheControl === "success" ? "max-age=3600" : "no-store"
  };
}

export default async function handler(request: Request) {
  const allowedOrigin = allowedCorsOrigin(
    request.headers.get("origin"),
    process.env.ALBUMVAULT_ALLOWED_ORIGIN
  );
  const baseHeaders: Record<string, string> = {
    ...corsHeaders,
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin } : {}),
    vary: "Origin"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: baseHeaders
    });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed", ...notConfigured() }), {
      status: 405,
      headers: responseHeaders(baseHeaders, "no-store")
    });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return new Response(JSON.stringify({ error: "Missing 'q' parameter", ...notConfigured() }), {
      status: 400,
      headers: responseHeaders(baseHeaders, "no-store")
    });
  }

  if (query.length > maxQueryLength) {
    return new Response(JSON.stringify({ error: "Query is too long", ...notConfigured() }), {
      status: 400,
      headers: responseHeaders(baseHeaders, "no-store")
    });
  }

  if (!allowSearch(getClientIp(request))) {
    return new Response(JSON.stringify({ error: "Too many Spotify searches", ...notConfigured() }), {
      status: 429,
      headers: {
        ...responseHeaders(baseHeaders, "no-store"),
        "retry-after": "60"
      }
    });
  }

  const result = await searchSpotify(query);
  return new Response(JSON.stringify(result), {
    status: result.error ? 502 : 200,
    headers: responseHeaders(baseHeaders, result.configured && !result.error ? "success" : "no-store")
  });
}
