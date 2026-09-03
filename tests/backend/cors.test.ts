import { describe, it, expect } from 'vitest';
import { isOriginAllowed, normalizeOrigin } from '../../backend/local/corsHelper';
import { isOriginAllowed as isVercelOriginAllowed } from '../../api/_lib/cors';

describe('CORS Origin Matching (Backend & Serverless)', () => {
  describe('normalizeOrigin', () => {
    it('strips trailing slashes and trims whitespace', () => {
      expect(normalizeOrigin('  https://example.com/  ')).toBe('https://example.com');
      expect(normalizeOrigin('https://example.com')).toBe('https://example.com');
    });
  });

  describe('isOriginAllowed', () => {
    it('allows any origin when allowedOrigins is empty (permissive mode)', () => {
      expect(isOriginAllowed('https://any-site.com', [])).toBe(true);
      expect(isOriginAllowed('http://localhost:3000', [])).toBe(true);
    });

    it('allows requests without origin header (server-to-server, curl, mobile)', () => {
      expect(isOriginAllowed(undefined, ['https://example.com'])).toBe(true);
      expect(isOriginAllowed(null, ['https://example.com'])).toBe(true);
      expect(isOriginAllowed('', ['https://example.com'])).toBe(true);
    });

    it('allows all origins when wildcard * is specified in allowedOrigins', () => {
      const allowed = ['*'];
      expect(isOriginAllowed('https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://random-site.com', allowed)).toBe(true);
    });

    it('matches exact origins', () => {
      const allowed = ['https://smart-receipt-reader.vercel.app', 'http://localhost:5173'];
      expect(isOriginAllowed('https://smart-receipt-reader.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://smart-receipt-reader.vercel.app/', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
      expect(isOriginAllowed('https://other-site.com', allowed)).toBe(false);
    });

    it('supports wildcard glob patterns in allowed origins', () => {
      const allowed = ['https://*.vercel.app', 'http://localhost:*'];
      expect(isOriginAllowed('https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://preview-123.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:8080', allowed)).toBe(true);
      expect(isOriginAllowed('https://malicious-vercel.app.attacker.com', allowed)).toBe(false);
      expect(isOriginAllowed('https://other-domain.com', allowed)).toBe(false);
    });

    it('supports specific project wildcard glob patterns', () => {
      const allowed = ['https://smart-receipt-reader-*.vercel.app'];
      expect(isOriginAllowed('https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://smart-receipt-reader-abc123.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://another-app-xyz.vercel.app', allowed)).toBe(false);
    });

    it('automatically matches Vercel preview URLs when production vercel.app domain is in allowed list', () => {
      // User sets production URL: https://smart-receipt-reader.vercel.app
      const allowed = ['https://smart-receipt-reader.vercel.app'];

      // Should automatically allow branch / git previews for smart-receipt-reader
      expect(isOriginAllowed('https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://smart-receipt-reader-xyz-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isOriginAllowed('https://smart-receipt-reader.vercel.app', allowed)).toBe(true);

      // Should NOT allow unrelated projects on vercel.app
      expect(isOriginAllowed('https://unrelated-project.vercel.app', allowed)).toBe(false);
      expect(isOriginAllowed('https://unrelated-project-git-branch.vercel.app', allowed)).toBe(false);
    });

    it('rejects disallowed external origins when allowlist is populated', () => {
      const allowed = ['https://smart-receipt-reader.vercel.app'];
      expect(isOriginAllowed('https://attacker.com', allowed)).toBe(false);
      expect(isOriginAllowed('https://fake-smart-receipt-reader.com', allowed)).toBe(false);
    });

    it('behaves consistently in api/_lib/cors as well', () => {
      const allowed = ['https://smart-receipt-reader.vercel.app'];
      expect(isVercelOriginAllowed('https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app', allowed)).toBe(true);
      expect(isVercelOriginAllowed('https://attacker.com', allowed)).toBe(false);
      expect(isVercelOriginAllowed('https://any.com', ['*'])).toBe(true);
    });
  });

  describe('Express OPTIONS preflight response (in-memory)', () => {
    let app: any;

    beforeEach(async () => {
      process.env.NODE_ENV = 'test';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';
      process.env.MISTRAL_API_KEY = 'test-key';
      process.env.VERCEL = '1';
      process.env.CORS_ORIGINS = 'https://smart-receipt-reader.vercel.app';

      const mod = await import('../../backend/dist/local/server.js');
      app = mod.default;
    });

    it('returns Access-Control-Allow-Origin for Vercel preview deployment on OPTIONS /api/process', async () => {
      const previewOrigin = 'https://smart-receipt-reader-git-feat-imple-3ee773-sophiawangs-projects.vercel.app';
      const headers: Record<string, string> = {};

      const req: any = {
        method: 'OPTIONS',
        url: '/api/process',
        headers: {
          origin: previewOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, content-type',
        },
      };

      const res: any = {
        statusCode: 200,
        setHeader(k: string, v: string) {
          headers[k.toLowerCase()] = v;
        },
        getHeader(k: string) {
          return headers[k.toLowerCase()];
        },
        end: vi.fn(),
      };

      await new Promise<void>((resolve) => {
        res.end = vi.fn(() => resolve());
        app(req, res, () => resolve());
      });

      expect(res.statusCode).toBe(204);
      expect(headers['access-control-allow-origin']).toBe(previewOrigin);
      expect(headers['access-control-allow-methods']).toContain('POST');
    });

    it('does not set Access-Control-Allow-Origin for unauthorized origin', async () => {
      const unauthorizedOrigin = 'https://malicious-site.com';
      const headers: Record<string, string> = {};

      const req: any = {
        method: 'OPTIONS',
        url: '/api/process',
        headers: {
          origin: unauthorizedOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, content-type',
        },
      };

      const res: any = {
        statusCode: 200,
        setHeader(k: string, v: string) {
          headers[k.toLowerCase()] = v;
        },
        getHeader(k: string) {
          return headers[k.toLowerCase()];
        },
        end: vi.fn(),
      };

      await new Promise<void>((resolve) => {
        const done = () => resolve();
        res.end = vi.fn(done);
        app(req, res, done);
      });

      expect(headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
