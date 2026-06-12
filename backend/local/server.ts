import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

// Load environment variables
import { config } from 'dotenv';
config({ path: path.join(__dirname, '..', '.env') });

import { processReceiptCore } from '../src/handlers/processReceipt';
import {
    createUserClient,
    createSupabaseReceiptService,
    extractBearerToken,
} from '../src/services/supabaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

function isTruthy(value: unknown): boolean {
    const v = String(value ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

/**
 * POST /api/process
 * Authenticated, Supabase-backed receipt processing endpoint.
 * The client sends an `Authorization: Bearer <jwt>` header; all storage/DB
 * access runs under the caller's RLS context.
 */
app.post('/api/process', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const token = extractBearerToken(req.headers as Record<string, string | undefined>);
        if (!token) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const client = createUserClient(token);
        const service = createSupabaseReceiptService(client);

        let userId: string;
        try {
            userId = await service.getUserId();
        } catch {
            return res.status(401).json({ error: 'Invalid or expired session.' });
        }

        console.log(`Processing file: ${req.file.originalname} for user ${userId}`);

        const result = await processReceiptCore({
            service,
            userId,
            fileBuffer: req.file.buffer,
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            modelId: typeof req.body?.model === 'string' ? req.body.model : undefined,
            force: isTruthy(req.query.force),
        });

        res.json(result);
    } catch (error: any) {
        console.error('Error processing receipt:', error);
        res.status(500).json({ error: error.message || 'Processing failed' });
    }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

app.all('/api/health', (req: Request, res: Response) => {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
});

// Catch-all for unknown API endpoints (so they become 404, not 500)
app.all('/api/*', (req: Request, res: Response) => {
    return res.status(404).json({ error: 'Not Found' });
});

// Start server only if not running in a serverless environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`SmartReceipt backend running on http://localhost:${PORT}`);
        console.log(`  Supabase: ${process.env.SUPABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        console.log(`  Endpoints: POST /api/process (auth), GET /api/health`);
    });
}

export default app;
