export function allowedCorsOrigin(requestOrigin: string | null, allowedOrigin: string | undefined) {
  if (!allowedOrigin || !requestOrigin) return "null";
  return requestOrigin === allowedOrigin ? allowedOrigin : "null";
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
};

export function createRateLimiter(options: RateLimitOptions) {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return (key: string, now = Date.now()) => {
    const existing = attempts.get(key);
    if (!existing || existing.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (existing.count >= options.maxAttempts) return false;
    existing.count += 1;
    return true;
  };
}
