import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readRawBody } from '../_lib/readRawBody.js';

/**
 * Vercel Serverless Function:
 *   POST /api/receipts/batch-delete
 *   Body: { ids: string[] }
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
        let body: any = req.body;
        if (!body || typeof body === 'string') {
            const rawBody = await readRawBody(req);
            const rawText = rawBody.toString('utf8');
            body = rawText ? JSON.parse(rawText) : {};
        }

        const { ids } = body;

        console.log('Vercel batch-delete request', {
            method: req.method,
            idsCount: Array.isArray(ids) ? ids.length : 0,
            hasAwsRegion: Boolean(process.env.AWS_REGION),
            hasTable: Boolean(process.env.DYNAMODB_TABLE_NAME),
            hasBucket: Boolean(process.env.S3_BUCKET_NAME),
        });

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Array of receipt IDs is required' });
            return;
        }

        // TEST MODE: Check if we should use in-memory store
        try {
            const { batchDeleteReceipts } = await import('../_lib/receiptsStore.js');
            if (batchDeleteReceipts && process.env.NODE_ENV === 'test') {
                await batchDeleteReceipts(ids);
                return res.status(204).send('');
            }
        } catch (e) {
            // Store not available or method missing, fall through to backend handler
        }

        // @ts-ignore - resolved at runtime on Vercel
        const { batchDeleteReceiptsHandler } = await import('../../backend/dist/src/handlers/batchDeleteReceipts.js');

        await batchDeleteReceiptsHandler(ids);

        res.status(204).send('');
    } catch (err: any) {
        console.error('Vercel /api/receipts/batch-delete error:', err);
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
}
