import type { VercelRequest, VercelResponse } from '@vercel/node';

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
        const { ids } = req.body;

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
