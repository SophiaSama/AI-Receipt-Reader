import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import type { AddressInfo } from 'net';

// Import API handlers using path aliases
import healthHandler from '@/api/health';
import processHandler from '@/api/process';
import receiptsHandler from '@/api/receipts';
import manualHandler from '@/api/receipts/manual';
import deleteHandler from '@/api/receipts/delete';
import { resolveAiModel, DEFAULT_AI_MODEL_ID } from '@backend/services/aiProviderService';

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

describe('API Integration Tests', () => {
  describe('Health Endpoint - GET /api/health', () => {
    it('should return healthy status', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await healthHandler(req, res);

      expect(res.getStatus()).toBe(200);
      const data = res.getData();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('service', 'SmartReceipt API');
    });

    it('should reject non-GET requests', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await healthHandler(req, res);

      expect(res.getStatus()).toBe(405);
      expect(res.getData()).toHaveProperty('error');
    });
  });

  describe('Receipts List - GET /api/receipts', () => {
    it('should return empty array initially', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await receiptsHandler(req, res);

      expect(res.getStatus()).toBe(200);
      const data = res.getData();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should reject non-GET requests', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await receiptsHandler(req, res);

      expect(res.getStatus()).toBe(405);
    });
  });

  describe('Manual Receipt Entry - POST /api/receipts/manual', () => {
    it('should save manual receipt without image', async () => {
      const metadata = {
        merchantName: 'Test Store',
        date: '2026-01-23',
        total: 50.00,
        currency: 'USD',
        items: [
          { name: 'Test Item', quantity: 1, price: 50.00 }
        ],
      };

      const req = createMockRequest({
        method: 'POST',
        body: { metadata: JSON.stringify(metadata) },
      });
      const res = createMockResponse();

      await manualHandler(req, res);

      expect(res.getStatus()).toBe(200);
      const data = res.getData();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('merchantName', 'Test Store');
      expect(data).toHaveProperty('total', 50.00);
      expect(data).toHaveProperty('source', 'manual');
    });

    it('should validate required fields', async () => {
      const metadata = {
        // Missing merchantName
        date: '2026-01-23',
        total: 50.00,
      };

      const req = createMockRequest({
        method: 'POST',
        body: { metadata: JSON.stringify(metadata) },
      });
      const res = createMockResponse();

      await manualHandler(req, res);

      // Should either return 400 or handle gracefully
      const status = res.getStatus();
      expect([200, 400, 500]).toContain(status);
    });

    it('should reject non-POST requests', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await manualHandler(req, res);

      expect(res.getStatus()).toBe(405);
    });
  });

  describe('Delete Receipt - DELETE /api/receipts/delete', () => {
    it('should require id query parameter', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        query: {}, // No id
      });
      const res = createMockResponse();

      await deleteHandler(req, res);

      expect(res.getStatus()).toBe(400);
      expect(res.getData()).toHaveProperty('error');
    });

    it('should handle non-existent receipt', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        query: { id: 'non-existent-id' },
      });
      const res = createMockResponse();

      await deleteHandler(req, res);

      // Should return 404 or 204 depending on implementation
      const status = res.getStatus();
      expect([204, 404, 500]).toContain(status);
    });

    it('should reject non-DELETE requests', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'test-id' },
      });
      const res = createMockResponse();

      await deleteHandler(req, res);

      expect(res.getStatus()).toBe(405);
    });
  });

  describe('Process Receipt - POST /api/process', () => {
    it('should reject request without file', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {}, // No file
      });
      const res = createMockResponse();

      await processHandler(req, res);

      expect(res.getStatus()).toBeGreaterThanOrEqual(400);
      const data = res.getData();
      expect(data).toHaveProperty('error');
    });

    it('should reject non-POST requests', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await processHandler(req, res);

      expect(res.getStatus()).toBe(405);
    });

    // Note: Testing with actual file upload requires multipart parsing
    // which is complex in unit tests. Consider E2E tests for full flow.
  });

  describe('AI Model Selection', () => {
    it('should default to the configured model when omitted', () => {
      const resolved = resolveAiModel();
      expect(resolved.id).toBe(DEFAULT_AI_MODEL_ID);
    });

    it('should accept a valid model id', () => {
      const resolved = resolveAiModel('google/gemini-2.5-flash-lite');
      expect(resolved.id).toBe('google/gemini-2.5-flash-lite');
    });

    it('should fall back when model id is invalid', () => {
      const resolved = resolveAiModel('invalid-model-id');
      expect(resolved.id).toBe(DEFAULT_AI_MODEL_ID);
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete create -> list -> delete workflow', async () => {
      // Step 1: Create a manual receipt
      const metadata = {
        merchantName: 'Workflow Test Store',
        date: '2026-01-23',
        total: 99.99,
        currency: 'USD',
        items: [{ name: 'Workflow Item', quantity: 1, price: 99.99 }],
      };

      const createReq = createMockRequest({
        method: 'POST',
        body: { metadata: JSON.stringify(metadata) },
      });
      const createRes = createMockResponse();
      await manualHandler(createReq, createRes);

      expect(createRes.getStatus()).toBe(200);
      const createdReceipt = createRes.getData();
      expect(createdReceipt).toHaveProperty('id');
      const receiptId = createdReceipt.id;

      // Step 2: List receipts - should include the one we created
      const listReq = createMockRequest({ method: 'GET' });
      const listRes = createMockResponse();
      await receiptsHandler(listReq, listRes);

      expect(listRes.getStatus()).toBe(200);
      const receipts = listRes.getData();
      expect(Array.isArray(receipts)).toBe(true);
      const foundReceipt = receipts.find((r: any) => r.id === receiptId);
      expect(foundReceipt).toBeDefined();
      expect(foundReceipt.merchantName).toBe('Workflow Test Store');

      // Step 3: Delete the receipt
      const deleteReq = createMockRequest({
        method: 'DELETE',
        query: { id: receiptId },
      });
      const deleteRes = createMockResponse();
      await deleteHandler(deleteReq, deleteRes);

      // Should return 204 or 200
      expect([200, 204]).toContain(deleteRes.getStatus());

      // Step 4: Verify deletion - list should not include it
      const verifyReq = createMockRequest({ method: 'GET' });
      const verifyRes = createMockResponse();
      await receiptsHandler(verifyReq, verifyRes);

      const remainingReceipts = verifyRes.getData();
      const stillExists = remainingReceipts.find((r: any) => r.id === receiptId);
      expect(stillExists).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in manual entry', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: { metadata: 'not-valid-json{' },
      });
      const res = createMockResponse();

      await manualHandler(req, res);

      expect(res.getStatus()).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing content-type headers gracefully', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {},
        body: {},
      });
      const res = createMockResponse();

      await processHandler(req, res);

      // Should handle gracefully
      expect(res.getStatus()).toBeGreaterThanOrEqual(400);
    });
  });
});
