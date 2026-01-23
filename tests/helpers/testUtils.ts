// Test utilities and helpers

export interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export function createMockImageFile(filename = 'test-receipt.jpg'): MockFile {
  // Create a minimal valid JPEG header
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  ]);
  
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: jpegHeader,
    size: jpegHeader.length,
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
