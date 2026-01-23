/**
 * E2E Tests - Run against live server (vercel dev or deployed app)
 * 
 * These tests make real HTTP requests to test the full stack.
 * Run with: API_URL=http://localhost:3000 npm run test:e2e
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Helper to make HTTP requests
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, options);
}

describe('E2E: API Routes (Live Server)', () => {
  beforeAll(() => {
    console.log(`🌐 Testing against: ${API_URL}`);
    console.log('📝 Make sure the server is running!');
  });

  describe('Health Check', () => {
    it('GET /api/health should return healthy status', async () => {
      const response = await makeRequest('/api/health');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('service', 'SmartReceipt API');
    });
  });

  describe('Receipt CRUD Operations', () => {
    let createdReceiptId: string;

    it('POST /api/receipts/manual should create a receipt', async () => {
      const metadata = {
        merchantName: 'E2E Test Store',
        date: '2026-01-23',
        total: 123.45,
        currency: 'USD',
        items: [
          { name: 'E2E Test Item', quantity: 1, price: 123.45 }
        ],
      };

      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));

      const response = await makeRequest('/api/receipts/manual', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.merchantName).toBe('E2E Test Store');
      expect(data.total).toBe(123.45);
      
      createdReceiptId = data.id;
      console.log(`✅ Created receipt: ${createdReceiptId}`);
    });

    it('GET /api/receipts should list all receipts', async () => {
      const response = await makeRequest('/api/receipts');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Should include the receipt we just created
      const found = data.find((r: any) => r.id === createdReceiptId);
      expect(found).toBeDefined();
      expect(found.merchantName).toBe('E2E Test Store');
      
      console.log(`✅ Found ${data.length} receipts`);
    });

    it('DELETE /api/receipts/delete?id=xxx should delete the receipt', async () => {
      const response = await makeRequest(
        `/api/receipts/delete?id=${createdReceiptId}`,
        { method: 'DELETE' }
      );

      expect([200, 204]).toContain(response.status);
      console.log(`✅ Deleted receipt: ${createdReceiptId}`);
    });

    it('GET /api/receipts should not include deleted receipt', async () => {
      const response = await makeRequest('/api/receipts');
      const data = await response.json();
      
      const found = data.find((r: any) => r.id === createdReceiptId);
      expect(found).toBeUndefined();
      
      console.log(`✅ Verified deletion`);
    });
  });

  describe('Error Handling', () => {
    it('DELETE without id should return 400', async () => {
      const response = await makeRequest('/api/receipts/delete', {
        method: 'DELETE'
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('Invalid endpoint should return 404', async () => {
      const response = await makeRequest('/api/nonexistent');
      expect(response.status).toBe(404);
    });

    it('Wrong HTTP method should return 405', async () => {
      const response = await makeRequest('/api/health', {
        method: 'POST'
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Process Receipt (requires image)', () => {
    it.skip('POST /api/process should process receipt image', async () => {
      // Create a minimal JPEG file
      const jpegHeader = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);
      const blob = new Blob([jpegHeader], { type: 'image/jpeg' });
      const file = new File([blob], 'test-receipt.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await makeRequest('/api/process', {
        method: 'POST',
        body: formData,
      });

      // This test is skipped because it requires:
      // 1. Valid MISTRAL_API_KEY
      // 2. AWS credentials (if not using local storage)
      // 3. Actual image processing
      
      console.log(`⏭️ Skipped: Requires real API key and image processing`);
    });
  });
});
