import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEvent, ReceiptData } from '@backend/types';
import { handler as confirmHandler } from '@backend/handlers/confirmReceipt';
import { saveReceipt, getReceiptById } from '@backend/services/dynamoService';

function makeEvent(body: any): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/api/receipts/confirm',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {},
  };
}

describe('confirmReceipt handler', () => {
  it('ignore action deletes receipt from storage if it exists', async () => {
    const pending: ReceiptData = {
      id: 'to-delete',
      merchantName: 'Dup Store',
      date: '2026-03-06',
      total: 12.34,
      currency: 'USD',
      items: [],
      createdAt: Date.now(),
    };

    await saveReceipt(pending);
    expect(await getReceiptById('to-delete')).not.toBeNull();

    const res = await confirmHandler(makeEvent({ action: 'ignore', pendingReceipt: pending }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ignored: true });

    expect(await getReceiptById('to-delete')).toBeNull();
  });
});
