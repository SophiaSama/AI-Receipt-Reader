import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRawBody } from './_lib/readRawBody.js';

/**
 * Vercel Serverless Function: POST /api/process
 * Bridges Vercel's request/response model to the existing Lambda-style handler.
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  // CORS + preflight
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
    const { handler: processHandler } = await import('../backend/dist/src/handlers/processReceipt.js');

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
      path: '/api/process',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await processHandler(event as any);

    // Forward status + headers + body
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    // Parse JSON body and use .json() for proper test compatibility
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err: any) {
    console.error('Vercel /api/process error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
