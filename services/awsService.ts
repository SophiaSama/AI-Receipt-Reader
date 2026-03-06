import { ReceiptData } from "../types";

const API_BASE = '/api';

export type ProcessReceiptResponse = ReceiptData | {
  duplicateDetected: true;
  matchType: 'imageHash' | 'ocrFingerprint';
  candidateReceipt: Pick<ReceiptData, 'id' | 'merchantName' | 'date' | 'total' | 'currency'>;
  pendingReceipt: ReceiptData;
};

/**
 * Sends a receipt image to the backend for full processing.
 * According to architecture: 
 * Frontend -> API Gateway -> Lambda -> (S3 + OCR/LLM + DynamoDB)
 */
export interface ProcessReceiptOptions {
  modelId?: string;
}

export const processAndSaveReceipt = async (
  file: File,
  options: ProcessReceiptOptions = {}
): Promise<ProcessReceiptResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options.modelId) {
    formData.append('model', options.modelId);
  }

  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  });

  console.log('Upload response status:', response.status);

  if (!response.ok) {
    let errorMessage = `Server processing failed: ${response.statusText} (${response.status})`;

    try {
      // Read text ONCE to avoid "Body is disturbed" error
      const errorText = await response.text();
      console.log('Raw backend error response:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = `Error: ${errorData.error}`;
        }
      } catch (jsonError) {
        // If not JSON, use the text directly (truncated)
        if (errorText) errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
    } catch (readError) {
      console.error('Failed to read error response body:', readError);
    }

    console.error('Final error message throwing:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('Upload successful, received data:', data);
  return data;
};

export const confirmDuplicateReceiptDecision = async (
  action: 'ignore' | 'save',
  pendingReceipt: ReceiptData
): Promise<{ ignored: true } | ReceiptData> => {
  const response = await fetch(`${API_BASE}/receipts/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, pendingReceipt }),
  });

  if (!response.ok) {
    let errorMessage = `Confirm failed: ${response.statusText} (${response.status})`;
    try {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) errorMessage = `Error: ${errorData.error}`;
      } catch {
        if (errorText) errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Manual Save: Directly save user-entered data to DynamoDB.
 */
export const saveManualReceiptToDB = async (receipt: Partial<ReceiptData>, file?: File): Promise<ReceiptData> => {
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(receipt));
  if (file) formData.append('file', file);

  const response = await fetch(`${API_BASE}/receipts/manual`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Manual save failed: ${response.statusText} (${response.status})`;

    try {
      const errorText = await response.text();
      console.log('Raw manual save error response:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) errorMessage = `Error: ${errorData.error}`;
      } catch (jsonError) {
        if (errorText) errorMessage += ` - ${errorText.substring(0, 200)}`;
      }
    } catch (readError) {
      console.error('Failed to read error response body:', readError);
    }

    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Fetch all receipts from DynamoDB
 */
export const fetchReceiptsFromDB = async (): Promise<ReceiptData[]> => {
  const response = await fetch(`${API_BASE}/receipts`);

  if (!response.ok) {
    console.warn("Failed to fetch receipts, returning empty list.");
    return [];
  }

  const data = await response.json();
  return data.sort((a: ReceiptData, b: ReceiptData) => b.createdAt - a.createdAt);
};

export const deleteReceiptFromDB = async (id: string): Promise<void> => {
  // Backend exposes DELETE /api/receipts/:id (see backend/local/server.ts)
  const response = await fetch(`${API_BASE}/receipts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = `Failed to delete receipt: ${response.statusText} (${response.status})`;
    try {
      const txt = await response.text();
      try {
        const j = JSON.parse(txt);
        if (j?.error) message = `Failed to delete receipt: ${j.error}`;
      } catch {
        if (txt) message += ` - ${txt.substring(0, 200)}`;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
};

/**
 * Delete multiple receipts and associated assets
 */
export const deleteReceiptsFromDB = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;

  const response = await fetch(`${API_BASE}/receipts/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    let message = `Failed to bulk delete receipts: ${response.statusText} (${response.status})`;
    try {
      const txt = await response.text();
      try {
        const j = JSON.parse(txt);
        if (j?.error) message = `Failed to bulk delete: ${j.error}`;
      } catch {
        if (txt) message += ` - ${txt.substring(0, 200)}`;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
};