import { createHash } from 'crypto';
import { ReceiptData } from '../types';

export type DuplicateMatchType = 'imageHash' | 'ocrFingerprint';

export interface DuplicateMatch {
  matchType: DuplicateMatchType;
  existingReceipt: ReceiptData;
}

export function computeImageHash(fileBuffer: Buffer): string {
  return createHash('sha256').update(fileBuffer).digest('hex');
}

function normalizeMerchantName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(date: string): string {
  // Expecting YYYY-MM-DD; fall back to first 10 chars when ISO timestamp.
  const d = (date || '').trim();
  if (d.length >= 10) return d.slice(0, 10);
  return d;
}

function normalizeCurrency(currency: string): string {
  return (currency || '').trim().toUpperCase();
}

function normalizeTotal(total: number): string {
  const n = Number(total);
  if (!Number.isFinite(n)) return '';
  // 2dp string to stabilize float differences.
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function computeOcrFingerprint(receipt: Pick<ReceiptData, 'merchantName' | 'date' | 'total' | 'currency'>): string {
  const merchant = normalizeMerchantName(receipt.merchantName);
  const date = normalizeDate(receipt.date);
  const total = normalizeTotal(receipt.total);
  const currency = normalizeCurrency(receipt.currency);
  return `${merchant}|${date}|${total}|${currency}`;
}

export function findDuplicateReceipt(existingReceipts: ReceiptData[], candidate: ReceiptData): DuplicateMatch | null {
  if (!existingReceipts || existingReceipts.length === 0) return null;

  const candidateHash = candidate.imageHash;
  const candidateFp = candidate.ocrFingerprint || computeOcrFingerprint(candidate);

  for (const r of existingReceipts) {
    if (candidateHash && r.imageHash && r.imageHash === candidateHash) {
      return { matchType: 'imageHash', existingReceipt: r };
    }
  }

  for (const r of existingReceipts) {
    const fp = r.ocrFingerprint || computeOcrFingerprint(r);
    if (fp && candidateFp && fp === candidateFp) {
      return { matchType: 'ocrFingerprint', existingReceipt: r };
    }
  }

  return null;
}
