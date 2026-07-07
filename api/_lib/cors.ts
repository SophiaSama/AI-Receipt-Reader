import type { VercelRequest, VercelResponse } from '@vercel/node';

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function setOriginHeader(req: VercelRequest, res: VercelResponse): void {
  const origins = getAllowedOrigins();
  const requestOrigin = (req.headers.origin || '').toString();

  if (origins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return;
  }

  if (requestOrigin && origins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
}

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string): void {
  setOriginHeader(req, res);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', methods);
}

export function rejectDisallowedOriginIfNeeded(req: VercelRequest, res: VercelResponse): boolean {
  const origins = getAllowedOrigins();
  if (origins.length === 0) {
    return false;
  }

  const requestOrigin = (req.headers.origin || '').toString();
  if (!requestOrigin) {
    return false;
  }

  if (!origins.includes(requestOrigin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return true;
  }

  return false;
}
