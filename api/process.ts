import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // Vercel provides the raw (unparsed) request body on req.body only if body parsing ran.
    // We explicitly read the raw body from the stream so multipart uploads work reliably.
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
      path: '/api/process',
      pathParameters: null,
      queryStringParameters: null,
      requestContext: {},
    };

    const result = await processHandler(event as any);

    // Forward status + headers + body
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }

    res.status(result.statusCode).send(result.body);
  } catch (err: any) {
    console.error('Vercel /api/process error:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
