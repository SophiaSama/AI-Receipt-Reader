/** Strip a single trailing slash so `https://x.com/` and `https://x.com` compare equal. */
export const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/$/, '');

export function isOriginAllowed(origin: string | undefined | null, allowedOrigins: string[]): boolean {
    if (!origin) return true;
    if (allowedOrigins.length === 0) return true;
    if (allowedOrigins.includes('*')) return true;

    const normalized = normalizeOrigin(origin);

    for (const pattern of allowedOrigins) {
        if (pattern === '*' || pattern === normalized) {
            return true;
        }

        // Support glob patterns like https://*.vercel.app or *.vercel.app or https://smart-receipt-reader-*.vercel.app
        if (pattern.includes('*')) {
            const regexPattern = '^' + pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*') + '$';
            try {
                if (new RegExp(regexPattern, 'i').test(normalized)) {
                    return true;
                }
                const originUrl = new URL(normalized);
                if (new RegExp(regexPattern, 'i').test(originUrl.host)) {
                    return true;
                }
            } catch {
                // Ignore URL parsing or RegExp test failures
            }
        }

        // If the allowed origin is a Vercel URL like https://smart-receipt-reader.vercel.app,
        // automatically allow preview deployments like https://smart-receipt-reader-git-*.vercel.app
        // and https://smart-receipt-reader-*.vercel.app
        if (pattern.includes('.vercel.app')) {
            try {
                const patternHost = new URL(pattern.startsWith('http') ? pattern : `https://${pattern}`).hostname;
                const originUrl = new URL(normalized);
                const baseProject = patternHost.replace('.vercel.app', '');
                if (
                    originUrl.hostname === patternHost ||
                    (originUrl.hostname.endsWith('.vercel.app') &&
                        (originUrl.hostname.startsWith(`${baseProject}-`) || originUrl.hostname.startsWith(baseProject)))
                ) {
                    return true;
                }
            } catch {
                // Ignore URL parsing errors
            }
        }
    }

    return false;
}

export const getCorsOrigins = (rawEnv: string = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || ''): string[] =>
    rawEnv
        .split(',')
        .map((item) => normalizeOrigin(item))
        .filter((item) => item.length > 0);
