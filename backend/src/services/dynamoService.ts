import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    ScanCommand,
    DeleteCommand,
    BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { ReceiptData } from '../types';

const isLocalMode = process.env.USE_LOCAL_STORAGE === 'true';

// In-memory storage for local development
const localReceiptStore: Map<string, ReceiptData> = new Map();

// DynamoDB Client (only initialized if not in local mode)
const dynamoClient = isLocalMode ? null : DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
    })
);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'smart-receipts';

/**
 * Save a receipt to DynamoDB or local storage
 */
export const saveReceipt = async (receipt: ReceiptData): Promise<ReceiptData> => {
    if (isLocalMode) {
        localReceiptStore.set(receipt.id, receipt);
        return receipt;
    }

    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: receipt,
    });

    await dynamoClient!.send(command);
    return receipt;
};

/**
 * Get all receipts from DynamoDB or local storage
 */
export const getReceipts = async (): Promise<ReceiptData[]> => {
    if (isLocalMode) {
        return Array.from(localReceiptStore.values());
    }

    const command = new ScanCommand({
        TableName: TABLE_NAME,
        ConsistentRead: true,
    });

    const result = await dynamoClient!.send(command);
    return (result.Items || []) as ReceiptData[];
};

/**
 * Get a single receipt by ID
 */
export const getReceiptById = async (id: string): Promise<ReceiptData | null> => {
    if (isLocalMode) {
        return localReceiptStore.get(id) || null;
    }

    const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ConsistentRead: true,
    });

    const result = await dynamoClient!.send(command);
    return (result.Item as ReceiptData) || null;
};

/**
 * Delete a receipt by ID
 */
export const deleteReceipt = async (id: string): Promise<void> => {
    if (isLocalMode) {
        localReceiptStore.delete(id);
        return;
    }

    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
    });

    await dynamoClient!.send(command);
};

/**
 * Delete multiple receipts by ID
 */
export const batchDeleteReceipts = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;

    if (isLocalMode) {
        ids.forEach(id => localReceiptStore.delete(id));
        return;
    }

    // DynamoDB BatchWrite has a limit of 25 items per request
    const CHUNK_SIZE = 25;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const deleteRequests = chunk.map(id => ({
            DeleteRequest: {
                Key: { id }
            }
        }));

        const command = new BatchWriteCommand({
            RequestItems: {
                [TABLE_NAME]: deleteRequests
            }
        });

        await dynamoClient!.send(command);
    }
};

/**
 * Get all receipts from local store (for debugging)
 */
export const getLocalStore = (): Map<string, ReceiptData> => localReceiptStore;
