import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRawBody } from '../_lib/readRawBody.js';

/**
 * Vercel Serverless Function:
 *   POST /api/receipts/confirm
 * Body (JSON): { action: 'ignore'|'save', pendingReceipt: ReceiptData }
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: confirmHandler } = await import('../../backend/dist/src/handlers/confirmReceipt.js');

    const contentType = req.headers['content-type'] || 'application/json';

    // Use robust raw body reader for consistency across runtimes/tests
    const rawBody = await readRawBody(req);

    const event = {
      body: rawBody.toString('utf8'),
      headers: {
        'content-type': String(contentType),
        'Content-Type': String(contentType),
      },
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/api/receipts/confirm',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await confirmHandler(event as any);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    // Body is JSON for 200/400/500
    if (!result.body) {
      res.status(result.statusCode).send('');
      return;
    }

    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err: any) {
    console.error('Vercel /api/receipts/confirm error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
