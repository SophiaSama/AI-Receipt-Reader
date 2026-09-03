import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Strip a single trailing slash so `https://x.com/` and `https://x.com` compare equal. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter((item) => item.length > 0);
}

export function isOriginAllowed(origin: string | undefined | null, allowedOrigins: string[] = getAllowedOrigins()): boolean {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes('*')) return true;

  const normalized = normalizeOrigin(origin);

  for (const pattern of allowedOrigins) {
    if (pattern === '*' || pattern === normalized) {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = '^' + pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*') + '$';
      try {
        if (new RegExp(regexPattern, 'i').test(normalized)) {
          return true;
        }
        const originUrl = new URL(normalized);
        if (new RegExp(regexPattern, 'i').test(originUrl.host)) {
          return true;
        }
      } catch {
        // Ignore URL parsing or RegExp test failures
      }
    }

    // Auto-match Vercel preview URLs when a vercel.app domain is allowed
    if (pattern.includes('.vercel.app')) {
      try {
        const patternHost = new URL(pattern.startsWith('http') ? pattern : `https://${pattern}`).hostname;
        const originUrl = new URL(normalized);
        const baseProject = patternHost.replace('.vercel.app', '');
        if (
          originUrl.hostname === patternHost ||
          (originUrl.hostname.endsWith('.vercel.app') &&
            (originUrl.hostname.startsWith(`${baseProject}-`) || originUrl.hostname.startsWith(baseProject)))
        ) {
          return true;
        }
      } catch {
        // Ignore URL parsing errors
      }
    }
  }

  return false;
}

function setOriginHeader(req: VercelRequest, res: VercelResponse): void {
  const origins = getAllowedOrigins();
  const requestOrigin = (req.headers.origin || '').toString();

  if (origins.length === 0 || origins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    if (requestOrigin) res.setHeader('Vary', 'Origin');
    return;
  }

  if (requestOrigin && isOriginAllowed(requestOrigin, origins)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
}

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string): void {
  setOriginHeader(req, res);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Methods', methods);
}

export function rejectDisallowedOriginIfNeeded(req: VercelRequest, res: VercelResponse): boolean {
  const origins = getAllowedOrigins();
  if (origins.length === 0 || origins.includes('*')) {
    return false;
  }

  const requestOrigin = (req.headers.origin || '').toString();
  if (!requestOrigin) {
    return false;
  }

  if (!isOriginAllowed(requestOrigin, origins)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return true;
  }

  return false;
}
