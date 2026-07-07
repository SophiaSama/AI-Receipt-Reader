import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, rejectDisallowedOriginIfNeeded } from './_lib/cors.js';

export default async function (req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET,OPTIONS');

  if (rejectDisallowedOriginIfNeeded(req, res)) {
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({
    status: 'healthy',
    service: 'SmartReceipt API',
    timestamp: new Date().toISOString(),
    vercel: true,
  });
}
