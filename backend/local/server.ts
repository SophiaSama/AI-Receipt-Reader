import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

// Load environment variables
import { config } from 'dotenv';
config({ path: path.join(__dirname, '..', '.env') });

// Import handlers
import { processReceiptHandler } from '../src/handlers/processReceipt';
import { manualSaveHandler } from '../src/handlers/manualSave';
import { getReceiptsHandler } from '../src/handlers/getReceipts';
import { deleteReceiptHandler } from '../src/handlers/deleteReceipt';
import { batchDeleteReceiptsHandler } from '../src/handlers/batchDeleteReceipts';
import { getLocalImage } from '../src/services/s3Service';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve local images
app.get('/images/*', (req: Request, res: Response) => {
    const key = req.path.replace('/images/', '');
    const imageData = getLocalImage(key);

    if (!imageData) {
        return res.status(404).json({ error: 'Image not found' });
    }

    res.contentType(imageData.contentType);
    res.send(imageData.data);
});

/**
 * POST /api/process
 * Unified receipt processing endpoint
 */
app.post('/api/process', upload.single('file'), async (req: Request, res: Response) => {
    try {
        console.log('Received process request');
        console.log('Headers:', req.headers['content-type']);
        console.log('File present:', !!req.file);

        if (!req.file) {
            console.error('No file in request. Multer failed or empty.');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`Processing file: ${req.file.originalname}`);

        const receipt = await processReceiptHandler(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            typeof req.body?.model === 'string' ? req.body.model : undefined
        );

        res.json(receipt);
    } catch (error: any) {
        console.error('Error processing receipt:', error);
        res.status(500).json({ error: error.message || 'Processing failed' });
    }
});

/**
 * DELETE /api/receipts/delete?id=:id
 * Compatibility endpoint used by older clients/tests.
 */
app.delete('/api/receipts/delete', async (req: Request, res: Response) => {
    try {
        const idRaw = req.query.id;
        const id = typeof idRaw === 'string' ? idRaw.trim() : '';

        if (!id) {
            return res.status(400).json({ error: 'Receipt ID is required' });
        }

        await deleteReceiptHandler(id);
        return res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting receipt (compat):', error);
        if (typeof error?.message === 'string' && error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Delete failed' });
    }
});

/**
 * POST /api/receipts/manual
 * Manual receipt entry endpoint
 */
app.post('/api/receipts/manual', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const metadataStr = req.body.metadata;

        if (!metadataStr) {
            return res.status(400).json({ error: 'metadata field is required' });
        }

        let metadata;
        try {
            metadata = JSON.parse(metadataStr);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid metadata JSON' });
        }

        const receipt = await manualSaveHandler(
            metadata,
            req.file?.buffer,
            req.file?.originalname,
            req.file?.mimetype
        );

        res.json(receipt);
    } catch (error: any) {
        console.error('Error saving manual receipt:', error);
        if (error.message && error.message.includes('required')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Save failed' });
    }
});

/**
 * GET /api/receipts
 * Get all receipts
 */
app.get('/api/receipts', async (req: Request, res: Response) => {
    try {
        const receipts = await getReceiptsHandler();
        res.json(receipts);
    } catch (error: any) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({ error: error.message || 'Fetch failed' });
    }
});

/**
 * DELETE /api/receipts/:id
 * Delete a receipt
 */
app.delete('/api/receipts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Receipt ID is required' });
        }

        await deleteReceiptHandler(id);
        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting receipt:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: error.message || 'Delete failed' });
    }
});

/**
 * POST /api/receipts/batch-delete
 * Bulk delete receipts
 */
app.post('/api/receipts/batch-delete', async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of receipt IDs is required' });
        }

        // Use the handler implementation that works for local too
        const { batchDeleteReceiptsHandler } = await import('../src/handlers/batchDeleteReceipts');
        await batchDeleteReceiptsHandler(ids);

        res.status(204).send();
    } catch (error: any) {
        console.error('Error bulk deleting receipts:', error);
        res.status(500).json({ error: error.message || 'Bulk delete failed' });
    }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        localMode: process.env.USE_LOCAL_STORAGE === 'true'
    });
});

// Return 405 for wrong methods to known endpoints tested by E2E
app.all('/api/health', (req: Request, res: Response) => {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
});

// Catch-all for unknown API endpoints (so they become 404, not 500)
app.all('/api/*', (req: Request, res: Response) => {
    return res.status(404).json({ error: 'Not Found' });
});

// Start server
// Start server only if not running in serverless environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║           SmartReceipt Backend Server                     ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}              ║
║  📦 Local storage mode: ${process.env.USE_LOCAL_STORAGE === 'true' ? 'ENABLED' : 'DISABLED'}                     ║
║  🤖 Mistral AI: ${process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY !== 'your_mistral_api_key_here' ? 'CONFIGURED' : 'MOCK MODE (no API key)'}               ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    POST   /api/process         - Process receipt image    ║
║    POST   /api/receipts/manual - Manual entry             ║
║    GET    /api/receipts        - Get all receipts         ║
║    DELETE /api/receipts/:id    - Delete receipt           ║
║    POST   /api/receipts/batch-delete - Bulk delete        ║
║    GET    /api/health          - Health check             ║
╚═══════════════════════════════════════════════════════════╝
    `);
    });
}

export default app;

