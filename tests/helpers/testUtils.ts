// Test utilities and helpers

export interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export function createMockImageFile(filename = 'test-receipt.png'): MockFile {
  // Create a minimal valid image header
  const mockHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: mockHeader,
    size: mockHeader.length,
  };
}

export function createFormData(metadata: any, file?: MockFile) {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const parts: Buffer[] = [];

  // Add metadata
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="metadata"\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n`
  ));

  // Add file if provided
  if (file) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${file.originalname}"\r\n` +
      `Content-Type: ${file.mimetype}\r\n\r\n`
    ));
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  // End boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    buffer: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class TestReceiptStore {
  private receipts: Map<string, any> = new Map();

  add(receipt: any) {
    this.receipts.set(receipt.id, receipt);
  }

  get(id: string) {
    return this.receipts.get(id);
  }

  getAll() {
    return Array.from(this.receipts.values());
  }

  delete(id: string) {
    return this.receipts.delete(id);
  }

  clear() {
    this.receipts.clear();
  }

  count() {
    return this.receipts.size;
  }
}

export const testStore = new TestReceiptStore();
