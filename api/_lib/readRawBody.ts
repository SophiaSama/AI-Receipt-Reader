/**
 * Utility to read raw body from various request shapes
 * 
 * Handles multiple scenarios:
 * - Vercel production: req is a Node IncomingMessage stream
 * - Tests: req.body is already parsed/provided
 * - Some frameworks: req.rawBody is a Buffer
 */

export async function readRawBody(req: any): Promise<Buffer> {
  // If a rawBody Buffer/string was provided (some frameworks attach this)
  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody));
  }

  // If body is already parsed (object) or provided as string
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    // If it's an object (JSON), stringify it to preserve contents for handler
    return Buffer.from(JSON.stringify(req.body));
  }

  // Fallback to streaming read if request is an actual Node stream
  if (typeof req.on === 'function') {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: Buffer | string) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    return Buffer.concat(chunks);
  }

  throw new Error('Unable to read request body: unsupported request shape');
}
