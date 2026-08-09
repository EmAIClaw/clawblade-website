export function allowedCorsOrigin(requestOrigin: string | null, allowedOrigin: string | undefined) {
  if (!allowedOrigin || !requestOrigin) return null;
  return requestOrigin === allowedOrigin ? allowedOrigin : null;
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

export class PayloadTooLargeError extends Error {
  constructor() {
    super("payload-too-large");
    this.name = "PayloadTooLargeError";
  }
}

export async function readLimitedText(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
