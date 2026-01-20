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
    rawText?: string;
    createdAt: number;
}

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
