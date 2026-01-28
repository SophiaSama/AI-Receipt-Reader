import { describe, it, expect } from 'vitest';
import receiptsHandler from '@/api/receipts';
import manualHandler from '@/api/receipts/manual';
import batchDeleteHandler from '@/api/receipts/batch-delete';

// Helper to create mock Vercel request/response
function createMockRequest(options: {
    method: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
}) {
    return {
        method: options.method,
        url: options.url || '/',
        headers: options.headers || {},
        body: options.body,
        query: options.query || {},
    } as any;
}

function createMockResponse() {
    let statusCode = 200;
    let responseData: any = null;
    let headers: Record<string, string> = {};

    return {
        status: function (code: number) {
            statusCode = code;
            return this;
        },
        json: function (data: any) {
            responseData = data;
            return this;
        },
        send: function (data: any) {
            responseData = data;
            return this;
        },
        setHeader: function (key: string, value: string) {
            headers[key] = value;
            return this;
        },
        end: function () {
            return this;
        },
        getStatus: () => statusCode,
        getData: () => responseData,
        getHeaders: () => headers,
    } as any;
}

describe('Bulk Delete Integration Tests', () => {
    it('should delete multiple receipts', async () => {
        // 1. Create a few receipts
        const idsToCreate = ['Bulk1', 'Bulk2', 'Bulk3'];
        const createdIds: string[] = [];

        for (const name of idsToCreate) {
            const metadata = {
                merchantName: name,
                date: '2026-01-28',
                total: 10.00,
                currency: 'USD',
                items: [],
            };
            const req = createMockRequest({
                method: 'POST',
                body: { metadata: JSON.stringify(metadata) },
            });
            const res = createMockResponse();
            await manualHandler(req, res);
            expect(res.getStatus()).toBe(200);
            createdIds.push(res.getData().id);
        }

        // 2. Verify they exist
        const listReq = createMockRequest({ method: 'GET' });
        const listRes = createMockResponse();
        await receiptsHandler(listReq, listRes);
        expect(listRes.getStatus()).toBe(200);
        const allReceipts = listRes.getData();
        expect(allReceipts.length).toBeGreaterThanOrEqual(3);

        for (const id of createdIds) {
            expect(allReceipts.find((r: any) => r.id === id)).toBeDefined();
        }

        // 3. Batch delete two of them
        const idsToDelete = [createdIds[0], createdIds[1]];
        const deleteReq = createMockRequest({
            method: 'POST',
            body: { ids: idsToDelete },
        });
        const deleteRes = createMockResponse();
        await batchDeleteHandler(deleteReq, deleteRes);

        // Should return 204
        expect(deleteRes.getStatus()).toBe(204);

        // 4. Verify deletion
        const verifyReq = createMockRequest({ method: 'GET' });
        const verifyRes = createMockResponse();
        await receiptsHandler(verifyReq, verifyRes);
        const currentReceipts = verifyRes.getData();

        // Deleted ones should be gone
        expect(currentReceipts.find((r: any) => r.id === idsToDelete[0])).toBeUndefined();
        expect(currentReceipts.find((r: any) => r.id === idsToDelete[1])).toBeUndefined();

        // Kept one should still be there
        expect(currentReceipts.find((r: any) => r.id === createdIds[2])).toBeDefined();
    });

    it('should validate request body', async () => {
        const req = createMockRequest({
            method: 'POST',
            body: {}, // Missing ids
        });
        const res = createMockResponse();
        await batchDeleteHandler(req, res);
        expect(res.getStatus()).toBe(400);
    });
});
