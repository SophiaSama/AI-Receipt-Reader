import { describe, expect, it } from 'vitest';
import { computeImageHash, computeOcrFingerprint, findDuplicateReceipt } from '@backend/utils/duplicateDetection';
import type { ReceiptData } from '@backend/types';

function makeReceipt(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    id: overrides.id || 'r1',
    merchantName: overrides.merchantName || 'Test Store',
    date: overrides.date || '2026-03-06',
    total: overrides.total ?? 12.34,
    currency: overrides.currency || 'USD',
    items: overrides.items || [],
    imageUrl: overrides.imageUrl,
    imageHash: overrides.imageHash,
    ocrFingerprint: overrides.ocrFingerprint,
    rawText: overrides.rawText,
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

describe('duplicateDetection', () => {
  it('matches by exact image hash first', () => {
    const buf = Buffer.from('same-bytes');
    const hash = computeImageHash(buf);
    const existing = [makeReceipt({ id: 'existing', imageHash: hash })];
    const candidate = makeReceipt({ id: 'candidate', imageHash: hash, ocrFingerprint: computeOcrFingerprint(makeReceipt()) });

    const match = findDuplicateReceipt(existing, candidate);
    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('imageHash');
    expect(match!.existingReceipt.id).toBe('existing');
  });

  it('matches by OCR fingerprint when image hash is missing', () => {
    const existing = makeReceipt({
      id: 'existing',
      merchantName: 'Acme, Inc.',
      date: '2026-03-01T10:20:30.000Z',
      total: 9.5,
      currency: 'sgd',
    });
    existing.ocrFingerprint = computeOcrFingerprint(existing);

    const candidate = makeReceipt({
      id: 'candidate',
      merchantName: 'ACME INC',
      date: '2026-03-01',
      total: 9.5,
      currency: 'SGD',
      imageHash: undefined,
    });
    candidate.ocrFingerprint = computeOcrFingerprint(candidate);

    const match = findDuplicateReceipt([existing], candidate);
    expect(match).not.toBeNull();
    expect(match!.matchType).toBe('ocrFingerprint');
    expect(match!.existingReceipt.id).toBe('existing');
  });

  it('returns null when no match', () => {
    const existing = makeReceipt({ id: 'existing', merchantName: 'Other', date: '2026-03-01', total: 1.23, currency: 'USD' });
    const candidate = makeReceipt({ id: 'candidate', merchantName: 'Different', date: '2026-03-02', total: 4.56, currency: 'USD' });

    const match = findDuplicateReceipt([existing], candidate);
    expect(match).toBeNull();
  });
});
