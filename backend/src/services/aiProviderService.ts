import { MistralOCRResult, MistralStructuredResult, AiModelConfig, AI_MODEL_CATALOG, DEFAULT_AI_MODEL_ID } from '../types';
import {
    extractTextFromImage as mistralExtractTextFromImage,
    structureReceiptData as mistralStructureReceiptData,
    mockOCRResponse,
    mockStructuredResponse,
} from './mistralService';

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const openRouterReferer = process.env.OPENROUTER_HTTP_REFERER || 'https://localhost';
const openRouterAppName = process.env.OPENROUTER_APP_NAME || 'SmartReceiptReader';

export const listAiModels = (): AiModelConfig[] => [...AI_MODEL_CATALOG];

const getMistralFallbackModel = (): AiModelConfig => {
    return (
        AI_MODEL_CATALOG.find((model) => model.provider === 'mistral') ||
        AI_MODEL_CATALOG[AI_MODEL_CATALOG.length - 1]
    );
};

export const resolveAiModel = (requestedId?: string): AiModelConfig => {
    if (requestedId) {
        const match = AI_MODEL_CATALOG.find((model) => model.id === requestedId);
        if (match) {
            if (match.provider === 'openrouter' && !openRouterApiKey) {
                console.warn('OPENROUTER_API_KEY not configured - falling back to Mistral model');
                return getMistralFallbackModel();
            }
            return match;
        }
    }

    const defaultModel =
        AI_MODEL_CATALOG.find((model) => model.id === DEFAULT_AI_MODEL_ID) ||
        AI_MODEL_CATALOG[0];

    if (defaultModel.provider === 'openrouter' && !openRouterApiKey) {
        console.warn('OPENROUTER_API_KEY not configured - defaulting to Mistral model(pixtral-12b-2409)');
        return getMistralFallbackModel();
    }

    return defaultModel;
};

export const extractTextFromImage = async (
    imageBase64: string,
    mimeType: string,
    modelId?: string
): Promise<MistralOCRResult> => {
    const model = resolveAiModel(modelId);

    if (model.provider === 'mistral') {
        return mistralExtractTextFromImage(imageBase64, mimeType, model.ocrModel);
    }

    if (!openRouterApiKey) {
        console.warn('OPENROUTER_API_KEY not configured - using mock OCR response');
        return mockOCRResponse();
    }

    try {
        const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': openRouterReferer,
                'X-Title': openRouterAppName,
            },
            body: JSON.stringify({
                model: model.ocrModel,
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
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter OCR error (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await response.json() as any;
        const rawText = data?.choices?.[0]?.message?.content || '';
        return { rawText: typeof rawText === 'string' ? rawText : '' };
    } catch (error) {
        console.error('OpenRouter OCR error:', error);
        throw new Error('Failed to extract text from image');
    }
};

export const structureReceiptData = async (
    rawText: string,
    modelId?: string
): Promise<MistralStructuredResult> => {
    const model = resolveAiModel(modelId);

    if (model.provider === 'mistral') {
        return mistralStructureReceiptData(rawText, model.structModel);
    }

    if (!openRouterApiKey) {
        console.warn('OPENROUTER_API_KEY not configured - using mock structured response');
        return mockStructuredResponse(rawText);
    }

    try {
        const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': openRouterReferer,
                'X-Title': openRouterAppName,
            },
            body: JSON.stringify({
                model: model.structModel,
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
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter LLM error (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(typeof content === 'string' ? content : '{}');

        return {
            merchantName: parsed.merchantName || 'Unknown Merchant',
            date: parsed.date || new Date().toISOString().split('T')[0],
            total: typeof parsed.total === 'number' ? parsed.total : 0,
            currency: parsed.currency || 'SGD',
            items: Array.isArray(parsed.items) ? parsed.items : [],
        };
    } catch (error) {
        console.error('OpenRouter LLM error:', error);
        throw new Error('Failed to structure receipt data');
    }
};
