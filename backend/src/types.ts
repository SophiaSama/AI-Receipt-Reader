export interface LineItem {
    description: string;
    price: number;
}

export interface ReceiptData {
    id: string;
    date: string; // YYYY-MM-DD
    total: number;
    currency: string;
    merchantName: string;
    items: LineItem[];
    imageUrl?: string;
    /** SHA-256 of the original uploaded image bytes (hex). Used for exact duplicate detection. */
    imageHash?: string;
    /** Normalized fingerprint from OCR fields for fuzzy-ish duplicate detection. */
    ocrFingerprint?: string;
    rawText?: string;
    createdAt: number;
}

export type AiProvider = 'mistral' | 'openrouter';

export interface AiModelConfig {
    id: string;
    label: string;
    provider: AiProvider;
    ocrModel: string;
    structModel: string;
}

export const AI_MODEL_CATALOG: AiModelConfig[] = [
    {
        id: 'google/gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        provider: 'openrouter',
        ocrModel: 'google/gemini-2.5-flash',
        structModel: 'google/gemini-2.5-flash',
    },
    {
        id: 'google/gemini-2.5-flash-lite',
        label: 'Gemini 2.5 Flash Lite',
        provider: 'openrouter',
        ocrModel: 'google/gemini-2.5-flash-lite',
        structModel: 'google/gemini-2.5-flash-lite',
    },
    {
        id: 'qwen/qwen-vl-plus',
        label: 'Qwen VL Plus',
        provider: 'openrouter',
        ocrModel: 'qwen/qwen-vl-plus',
        structModel: 'qwen/qwen-vl-plus',
    },
    {
        id: 'pixtral-12b-2409',
        label: 'Pixtral 12B (Mistral)',
        provider: 'mistral',
        ocrModel: 'pixtral-12b-2409',
        structModel: 'mistral-large-latest',
    },
    {
        id: 'qwen/qwen3-vl-235b-a22b-instruct',
        label: 'Qwen3 VL 235B',
        provider: 'openrouter',
        ocrModel: 'qwen/qwen3-vl-235b-a22b-instruct',
        structModel: 'qwen/qwen3-vl-235b-a22b-instruct',
    },
];

export const DEFAULT_AI_MODEL_ID = 'google/gemini-2.5-flash';

export interface APIGatewayProxyEvent {
    body: string | null;
    headers: { [key: string]: string | undefined };
    httpMethod: string;
    isBase64Encoded: boolean;
    path: string;
    pathParameters: { [key: string]: string | undefined } | null;
    queryStringParameters: { [key: string]: string | undefined } | null;
    requestContext: any;
}

export interface APIGatewayProxyResult {
    statusCode: number;
    headers?: { [key: string]: string };
    body: string;
}

export interface ParsedMultipartData {
    fields: { [key: string]: string };
    files: {
        filename: string;
        content: Buffer;
        contentType: string;
    }[];
}

export interface MistralOCRResult {
    rawText: string;
}

export interface MistralStructuredResult {
    merchantName: string;
    date: string;
    total: number;
    currency: string;
    items: LineItem[];
}
