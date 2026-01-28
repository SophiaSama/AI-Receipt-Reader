/**
 * In-memory receipt store for integration tests
 * This allows the test workflow (create -> list -> delete) to work within the same process
 */

interface Receipt {
  id: string;
  merchantName: string;
  date: string;
  total: number;
  currency?: string;
  items?: any[];
  source?: string;
  imageUrl?: string;
  createdAt: string;
  [key: string]: any;
}

const receipts: Receipt[] = [];

export async function addReceipt(receipt: Receipt): Promise<void> {
  receipts.push(receipt);
}

export async function listReceipts(): Promise<Receipt[]> {
  return [...receipts]; // Return copy to prevent external mutations
}

export async function deleteReceiptById(id: string): Promise<boolean> {
  const idx = receipts.findIndex(r => r.id === id);
  if (idx === -1) return false;
  receipts.splice(idx, 1);
  return true;
}

export async function batchDeleteReceipts(ids: string[]): Promise<void> {
  const idsSet = new Set(ids);
  let i = receipts.length;
  while (i--) {
    if (idsSet.has(receipts[i].id)) {
      receipts.splice(i, 1);
    }
  }
}

export async function clearReceipts(): Promise<void> {
  receipts.length = 0;
}
