import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handler as manualHandler } from '../../backend/src/handlers/manualSave';

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
    const contentType = req.headers['content-type'] || '';

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });

    const rawBody = Buffer.concat(chunks);

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

    const result = await manualHandler(event);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }

    res.status(result.statusCode).send(result.body);
  } catch (err: any) {
    console.error('Vercel /api/receipts/manual error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
