import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../types';
import { success, serverError } from '../utils/responseHelper';
import { getReceipts } from '../services/dynamoService';

/**
 * GET /api/receipts
 * Fetch all receipts for the current user
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('List receipts request received', {
            requestId: event.requestContext?.requestId,
            sourceIp: event.requestContext?.identity?.sourceIp,
        });
        const receipts = await getReceipts();

        // Sort by createdAt descending (newest first)
        receipts.sort((a, b) => b.createdAt - a.createdAt);

        console.log(`Retrieved ${receipts.length} receipts`);
        const response = success(receipts);
        return {
            ...response,
            headers: {
                ...response.headers,
                'Cache-Control': 'no-store',
            },
        };
    } catch (error: any) {
        console.error('Error fetching receipts:', error);
        return serverError(error.message || 'Failed to fetch receipts');
    }
};

/**
 * Handler for Express.js local development
 */
export const getReceiptsHandler = async () => {
    const receipts = await getReceipts();
    // Sort by createdAt descending (newest first)
    return receipts.sort((a, b) => b.createdAt - a.createdAt);
};
