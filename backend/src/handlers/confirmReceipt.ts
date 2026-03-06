import { APIGatewayProxyEvent, APIGatewayProxyResult, ReceiptData } from '../types';
import { success, badRequest, serverError } from '../utils/responseHelper';
import { deleteReceipt, saveReceipt } from '../services/dynamoService';
import { deleteImage } from '../services/s3Service';

type ConfirmAction = 'ignore' | 'save';

function parseJsonBody<T>(event: APIGatewayProxyEvent): T | null {
  if (!event.body) return null;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw) as T;
}

/**
 * POST /api/receipts/confirm
 * Body: { action: 'ignore'|'save', pendingReceipt: ReceiptData }
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod !== 'POST') {
      return badRequest('Method Not Allowed');
    }

    let body: { action?: ConfirmAction; pendingReceipt?: ReceiptData } | null = null;
    try {
      body = parseJsonBody(event);
    } catch (e: any) {
      return badRequest(`Invalid JSON body: ${e?.message || 'parse error'}`);
    }

    if (!body?.action || !body?.pendingReceipt) {
      return badRequest('action and pendingReceipt are required');
    }

    const action = body.action;
    const pending = body.pendingReceipt;

    if (action !== 'ignore' && action !== 'save') {
      return badRequest('action must be "ignore" or "save"');
    }

    if (action === 'ignore') {
      // Best-effort cleanup in BOTH storage layers.
      // In the normal flow we never persist duplicates, but this makes the endpoint safe
      // if a record was already written (race/force-save) or during future refactors.
      if (pending.id) {
        try {
          await deleteReceipt(pending.id);
        } catch (e) {
          console.warn('Failed to delete receipt during ignore:', e);
        }
      }

      if (pending.imageUrl) {
        try {
          await deleteImage(pending.imageUrl);
        } catch (e) {
          // Cleanup failure should not block ignoring a duplicate.
          console.warn('Failed to delete image during ignore:', e);
        }
      }
      return success({ ignored: true });
    }

    // Minimal validation before persisting
    if (!pending.id || !pending.merchantName || !pending.date || pending.total === undefined) {
      return badRequest('pendingReceipt must include id, merchantName, date, and total');
    }

    // Persist as-is (user confirmed this is not a duplicate)
    await saveReceipt(pending);
    return success(pending);
  } catch (error: any) {
    console.error('Error confirming receipt:', error);
    return serverError(error?.message || 'Internal server error');
  }
};
