import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRawBody } from '../_lib/readRawBody.js';

/**
 * Vercel Serverless Function: POST /api/receipts/manual
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
    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: manualHandler } = await import('../../backend/dist/src/handlers/manualSave.js');

    const contentType = req.headers['content-type'] || '';

    // Use the robust utility that handles streams, rawBody, and body from various request shapes
    const rawBody = await readRawBody(req);

    const event = {
      body: rawBody.toString('base64'),
      headers: {
        'content-type': String(contentType),
        'Content-Type': String(contentType),
      },
      httpMethod: 'POST',
      isBase64Encoded: true,
      path: '/api/receipts/manual',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await manualHandler(event as any);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    // Parse JSON body and use .json() for proper test compatibility
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err: any) {
    console.error('Vercel /api/receipts/manual error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
