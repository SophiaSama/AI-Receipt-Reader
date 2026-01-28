import { describe, it, expect } from 'vitest';
import { extractTextFromImage, structureReceiptData } from '../../backend/src/services/mistralService';

describe('Mistral AI Integration with MSW Mocks', () => {
    it('should intercept OCR request and return mock text', async () => {
        // Ensuring MISTRAL_API_KEY is set so it doesn't use mock fallback in the code
        process.env.MISTRAL_API_KEY = 'real-key-for-test';

        // We pass dummy image data
        const result = await extractTextFromImage('dummy-base64', 'image/jpeg');

        expect(result.rawText).toContain('MOCK STORE');
        expect(result.rawText).toContain('TOTAL: $7.50');
    });

    it('should intercept structuring request and return mock JSON', async () => {
        process.env.MISTRAL_API_KEY = 'real-key-for-test';

        const result = await structureReceiptData('some raw text');

        expect(result.merchantName).toBe('Mock Store');
        expect(result.total).toBe(7.50);
        expect(result.items).toHaveLength(2);
        expect(result.items[0].description).toBe('Coffee');
    });
});
