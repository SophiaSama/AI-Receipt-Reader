import { Mistral } from '@mistralai/mistralai';
import { MistralOCRResult, MistralStructuredResult, LineItem } from '../types';

const apiKey = process.env.MISTRAL_API_KEY;

// Initialize Mistral client only if API key is provided
const mistralClient = apiKey && apiKey !== 'your_mistral_api_key_here'
    ? new Mistral({ apiKey })
    : null;

/**
 * Extract text from a receipt image using Mistral AI vision capabilities
 */
export const extractTextFromImage = async (imageBase64: string, mimeType: string): Promise<MistralOCRResult> => {
    if (!mistralClient) {
        console.warn('Mistral API key not configured - using mock OCR response');
        return mockOCRResponse();
    }

    try {
        const response = await mistralClient.chat.complete({
            model: 'pixtral-12b-2409',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Extract all text from this receipt image. Include merchant name, date, items, prices, and total. Return only the extracted text, no formatting or analysis.',
                        },
                        {
                            type: 'image_url',
                            imageUrl: `data:${mimeType};base64,${imageBase64}`,
                        },
                    ],
                },
            ],
        });

        const rawText = response.choices?.[0]?.message?.content || '';
        return { rawText: typeof rawText === 'string' ? rawText : '' };
    } catch (error) {
        console.error('Mistral OCR error:', error);
        throw new Error('Failed to extract text from image');
    }
};

/**
 * Structure raw receipt text into structured JSON using Mistral LLM
 */
export const structureReceiptData = async (rawText: string): Promise<MistralStructuredResult> => {
    if (!mistralClient) {
        console.warn('Mistral API key not configured - using mock structured response');
        return mockStructuredResponse(rawText);
    }

    try {
        const response = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: [
                {
                    role: 'system',
                    content: `You are a receipt parsing assistant. Your task is to extract structured data from receipt text.
          
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "merchantName": "Store name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "SGD",
  "items": [{"description": "Item name", "price": 0.00}]
}

Rules:
- merchantName: The name of the store/merchant
- date: Format as YYYY-MM-DD. If unclear, use today's date
- total: The final total amount as a number
- currency: Default to "SGD" if not specified
- items: Array of purchased items with description and price`,
                },
                {
                    role: 'user',
                    content: `Parse this receipt text and return structured JSON:\n\n${rawText}`,
                },
            ],
            responseFormat: { type: 'json_object' },
        });

        const content = response.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

        return {
            merchantName: parsed.merchantName || 'Unknown Merchant',
            date: parsed.date || new Date().toISOString().split('T')[0],
            total: typeof parsed.total === 'number' ? parsed.total : 0,
            currency: parsed.currency || 'SGD',
            items: Array.isArray(parsed.items) ? parsed.items : [],
        };
    } catch (error) {
        console.error('Mistral LLM error:', error);
        throw new Error('Failed to structure receipt data');
    }
};

/**
 * Mock OCR response for development without API key
 */
const mockOCRResponse = (): MistralOCRResult => {
    return {
        rawText: `DEMO GROCERY STORE
123 Main Street
Date: ${new Date().toISOString().split('T')[0]}

Milk 2% Gallon          $4.99
Bread Whole Wheat       $3.49
Eggs Dozen              $5.99
Bananas 2lb             $1.99
Coffee Ground           $8.99

Subtotal:              $25.45
Tax (8%):               $2.04
TOTAL:                 $27.49

Thank you for shopping!`,
    };
};

/**
 * Mock structured response for development without API key
 */
const mockStructuredResponse = (rawText: string): MistralStructuredResult => {
    // Try to extract a total from the raw text
    const totalMatch = rawText.match(/TOTAL[:\s]*\$?([\d.]+)/i);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 27.49;

    return {
        merchantName: 'Demo Grocery Store',
        date: new Date().toISOString().split('T')[0],
        total: total,
        currency: 'SGD',
        items: [
            { description: 'Milk 2% Gallon', price: 4.99 },
            { description: 'Bread Whole Wheat', price: 3.49 },
            { description: 'Eggs Dozen', price: 5.99 },
            { description: 'Bananas 2lb', price: 1.99 },
            { description: 'Coffee Ground', price: 8.99 },
        ],
    };
};
