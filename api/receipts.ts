import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function:
 *   GET /api/receipts
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: getReceiptsHandler } = await import('../backend/dist/src/handlers/getReceipts.js');

    const event = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/api/receipts',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await getReceiptsHandler(event as any);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    res.status(result.statusCode).send(result.body);
  } catch (err: any) {
    console.error('Vercel /api/receipts error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
