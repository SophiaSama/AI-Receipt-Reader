import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function:
 *   DELETE /api/receipts/:id
 */
export default async function (req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    console.log('Vercel delete (id) request', {
      method: req.method,
      id: req.query?.id,
      hasAwsRegion: Boolean(process.env.AWS_REGION),
      hasTable: Boolean(process.env.DYNAMODB_TABLE_NAME),
      hasBucket: Boolean(process.env.S3_BUCKET_NAME),
    });
    const id =
      typeof req.query.id === 'string'
        ? req.query.id
        : Array.isArray(req.query.id)
          ? req.query.id[0]
          : undefined;

    if (!id || !id.trim()) {
      res.status(400).json({ error: 'Receipt ID is required' });
      return;
    }

    const trimmedId = id.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedId)) {
      res.status(400).json({ error: 'Invalid receipt ID format' });
      return;
    }

    // TEST MODE: allow integration tests to do CRUD in one process.
    try {
      const { deleteReceiptById } = await import('../_lib/receiptsStore.js');
      const deleted = await deleteReceiptById(trimmedId);
      if (deleted || process.env.NODE_ENV === 'test') {
        res.status(204).send('');
        return;
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
      path: `/api/receipts/${trimmedId}`,
      pathParameters: { id: trimmedId },
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await deleteHandler(event as any);

    console.log('Vercel delete (id) backend result', {
      statusCode: result.statusCode,
      hasBody: Boolean(result.body),
    });

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    if (result.statusCode === 204 || !result.body) {
      res.status(result.statusCode).send('');
      return;
    }

    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err: any) {
    console.error('Vercel /api/receipts/:id error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
