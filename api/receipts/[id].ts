import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Deprecated: use `api/receipts/[id]/index.ts`.
 * This file is kept temporarily to avoid ambiguous routing during deployment rollouts.
 */
export default async function (_req: VercelRequest, res: VercelResponse) {
  res.status(410).json({ error: 'Deprecated endpoint. Please redeploy and use /api/receipts/:id.' });
}
