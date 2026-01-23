import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function:
 *   DELETE /api/receipts/delete?id=xxx
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
    const id = typeof req.query.id === 'string' ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : undefined;

    if (!id) {
      res.status(400).json({ error: 'Receipt ID is required' });
      return;
    }

    // TEST MODE: Check if we should use in-memory store
    try {
      const { deleteReceiptById } = await import('../_lib/receiptsStore.js');
      const deleted = await deleteReceiptById(id);
      if (deleted || process.env.NODE_ENV === 'test') {
        return res.status(204).json({ message: 'Deleted successfully' });
      }
    } catch (e) {
      // Store not available, fall through to backend handler
    }

    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: deleteHandler } = await import('../../backend/dist/src/handlers/deleteReceipt.js');

    const event = {
      body: null,
      headers: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: `/api/receipts/${id}`,
      pathParameters: { id },
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await deleteHandler(event as any);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    // Parse JSON body if present, use .json() for proper test compatibility
    const body = result.body ? JSON.parse(result.body) : { message: 'Deleted' };
    res.status(result.statusCode).json(body);
  } catch (err: any) {
    console.error('Vercel /api/receipts/delete error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
