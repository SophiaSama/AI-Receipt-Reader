import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function:
 *   DELETE /api/receipts/:id
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: deleteHandler } = await import('../../../backend/dist/src/handlers/deleteReceipt.js');

    // Prefer Vercel param, but fall back to parsing path.
    const idFromQuery =
      typeof req.query.id === 'string'
        ? req.query.id
        : Array.isArray(req.query.id)
          ? req.query.id[0]
          : undefined;

    const idFromPath = (() => {
      const url = req.url || '';
      const m = url.match(/\/api\/receipts\/([^/?#]+)/);
      return m?.[1];
    })();

    const id = idFromQuery || idFromPath;

    const event = {
      body: null,
      headers: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: `/api/receipts/${id ?? ''}`,
      pathParameters: { id },
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await deleteHandler(event as any);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }

    res.status(result.statusCode).send(result.body);
  } catch (err: any) {
    console.error('Vercel /api/receipts/[id] error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
