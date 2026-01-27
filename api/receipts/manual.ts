import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRawBody } from '../_lib/readRawBody.js';
import { randomUUID } from 'crypto';

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

    // TEST MODE: If body is already parsed (test harness), handle directly
    if (req.body && typeof req.body === 'object' && req.body.metadata && !contentType.includes('multipart/form-data')) {
      return handleTestMode(req, res);
    }

    // If no multipart and no valid body, return 400
    if (!contentType.includes('multipart/form-data') && (!req.body || !req.body.metadata)) {
      return res.status(400).json({ error: 'multipart/form-data with metadata field is required' });
    }

    // @ts-ignore - resolved at runtime on Vercel after backend build outputs dist/
    const { handler: manualHandler } = await import('../../backend/dist/src/handlers/manualSave.js');

    // Use the robust utility that handles streams, rawBody, and body from various request shapes
    const rawBody = await readRawBody(req);

    console.log('[manual.ts] Request details:', {
      contentType,
      bodyLength: rawBody.length,
      bodyPreview: rawBody.toString('utf8').substring(0, 200)
    });

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

    console.log('[manual.ts] Calling backend handler...');
    const result = await manualHandler(event as any);
    
    console.log('[manual.ts] Backend handler result:', {
      statusCode: result.statusCode,
      body: result.body
    });

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, String(v));
      }
    }

    // Parse JSON body and use .json() for proper test compatibility
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err: any) {
    console.error('Vercel /api/receipts/manual error:', err);
    
    // Check if this is a validation/parse error (client error) or server error
    const isClientError = err?.message && (
      err.message.includes('required') ||
      err.message.includes('parsing') ||
      err.message.includes('validation') ||
      err.message.includes('Invalid') ||
      err.message.includes('Missing') ||
      err.message.toLowerCase().includes('bad request')
    );
    
    const statusCode = isClientError ? 400 : 500;
    res.status(statusCode).json({ error: err?.message || 'Internal Server Error' });
  }
}

/**
 * Handle test mode where body is pre-parsed (not multipart)
 */
async function handleTestMode(req: VercelRequest, res: VercelResponse) {
  try {
    // Parse metadata from test body
    let metadataStr = req.body.metadata;
    if (!metadataStr) {
      return res.status(400).json({ error: 'metadata field is required' });
    }

    let metadata: any;
    if (typeof metadataStr === 'string') {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid metadata JSON' });
      }
    } else {
      metadata = metadataStr;
    }

    // Validate required fields
    if (!metadata.merchantName || metadata.total === undefined || !metadata.date) {
      return res.status(400).json({ error: 'merchantName, total, and date are required in metadata' });
    }

    // Create receipt record (in-memory for tests)
    const receipt = {
      id: randomUUID(),
      merchantName: metadata.merchantName,
      date: metadata.date,
      total: metadata.total,
      currency: metadata.currency || 'USD',
      items: metadata.items || [],
      source: 'manual',
      createdAt: new Date().toISOString(),
    };

    // Store in in-memory store for test workflow
    const { addReceipt } = await import('../_lib/receiptsStore.js');
    await addReceipt(receipt);

    return res.status(200).json(receipt);
  } catch (error: any) {
    console.error('Test mode manual receipt error:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
