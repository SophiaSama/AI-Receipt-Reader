import { ReceiptData } from "../types";

const API_BASE = '/api';

/**
 * Sends a receipt image to the backend for full processing.
 * According to architecture: 
 * Frontend -> API Gateway -> Lambda -> (S3 + Mistral OCR + Mistral LLM + DynamoDB)
 */
export const processAndSaveReceipt = async (file: File): Promise<ReceiptData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Server processing failed: ${response.statusText}`);
  }

  // The backend returns the final saved ReceiptData object after OCR and DB save
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
    throw new Error(`Manual save failed: ${response.statusText}`);
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

/**
 * Delete receipt and associated S3 assets
 */
export const deleteReceiptFromDB = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/receipts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete receipt: ${response.statusText}`);
  }
};