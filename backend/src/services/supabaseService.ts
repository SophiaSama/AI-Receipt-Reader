import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { LineItem, OcrRoute, ProcessingMetrics, ReceiptData } from '../types';

export const RECEIPTS_BUCKET = 'receipts';
export const SIGNED_URL_TTL_SECONDS = 3600;

/** Shape of a row in public.receipts (snake_case, as stored in Postgres). */
export interface ReceiptRow {
    id: string;
    user_id?: string;
    date: string | null;
    total: number | string | null;
    currency: string | null;
    merchant_name: string | null;
    items: LineItem[] | null;
    image_url: string | null;
    image_hash: string | null;
    ocr_fingerprint: string | null;
    raw_text: string | null;
    ocr_route: string | null;
    processing_metrics: ProcessingMetrics | null;
    created_at: string;
}

/** Insert payload — DB fills user_id (auth.uid()) and created_at (now()). */
export type ReceiptInsert = Omit<ReceiptRow, 'user_id' | 'created_at'>;

/**
 * Extracts a JWT from an Authorization header. Accepts either casing and a
 * case-insensitive "Bearer" prefix. Returns null when missing or malformed.
 */
export function extractBearerToken(
    headers: { [key: string]: string | undefined } | undefined | null
): string | null {
    if (!headers) return null;
    const raw = headers['authorization'] ?? headers['Authorization'];
    if (!raw) return null;
    const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
    return match ? match[1].trim() : null;
}

/**
 * Creates a request-scoped Supabase client authenticated as the calling user.
 * Uses the publishable (anon) key plus the user's JWT so that all queries run
 * under that user's RLS policies.
 *
 * `clientFactory` is injectable for testing (defaults to the real createClient).
 */
export function createUserClient(
    jwt: string,
    clientFactory: typeof createClient = createClient
): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        throw new Error(
            'Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.'
        );
    }
    return clientFactory(url, key, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

/** Maps a Postgres row to the shared ReceiptData shape. */
export function mapRowToReceipt(row: ReceiptRow, signedUrl?: string): ReceiptData {
    return {
        id: row.id,
        date: row.date ?? '',
        total: row.total != null ? Number(row.total) : 0,
        currency: row.currency ?? '',
        merchantName: row.merchant_name ?? '',
        items: row.items ?? [],
        imageUrl: signedUrl ?? row.image_url ?? undefined,
        imageHash: row.image_hash ?? undefined,
        ocrFingerprint: row.ocr_fingerprint ?? undefined,
        rawText: row.raw_text ?? undefined,
        ocrRoute: (row.ocr_route as OcrRoute | null) ?? undefined,
        processingMetrics: row.processing_metrics ?? undefined,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
}

/** Maps a ReceiptData to an insert payload (user_id + created_at left to the DB). */
export function mapReceiptToRow(receipt: ReceiptData): ReceiptInsert {
    return {
        id: receipt.id,
        date: receipt.date ?? null,
        total: receipt.total ?? null,
        currency: receipt.currency ?? null,
        merchant_name: receipt.merchantName ?? null,
        items: receipt.items ?? [],
        image_url: receipt.imageUrl ?? null,
        image_hash: receipt.imageHash ?? null,
        ocr_fingerprint: receipt.ocrFingerprint ?? null,
        raw_text: receipt.rawText ?? null,
        ocr_route: receipt.ocrRoute ?? null,
        processing_metrics: receipt.processingMetrics ?? null,
    };
}

export interface SupabaseReceiptService {
    /** Returns the authenticated user id (from the JWT), or throws. */
    getUserId(): Promise<string>;
    /** Uploads an image under `${userId}/${uuid}.${ext}` and returns the storage path. */
    uploadImage(userId: string, fileBuffer: Buffer, filename: string, contentType: string): Promise<string>;
    /** Removes a storage object (best-effort cleanup). */
    removeImage(path: string | null | undefined): Promise<void>;
    /** Creates a short-lived signed URL for a stored path. */
    createSignedUrl(path: string | null | undefined): Promise<string | undefined>;
    /** Lists the calling user's receipts (RLS-scoped), newest first. */
    listReceipts(): Promise<ReceiptData[]>;
    /** Inserts a receipt row and returns the persisted record. */
    insertReceipt(receipt: ReceiptData): Promise<ReceiptData>;
}

export interface SupabaseReceiptServiceOptions {
    generateId?: () => string;
    signedUrlTtlSeconds?: number;
}

export function createSupabaseReceiptService(
    client: SupabaseClient,
    options: SupabaseReceiptServiceOptions = {}
): SupabaseReceiptService {
    const generateId = options.generateId ?? uuidv4;
    const ttl = options.signedUrlTtlSeconds ?? SIGNED_URL_TTL_SECONDS;

    async function createSignedUrl(path: string | null | undefined): Promise<string | undefined> {
        if (!path) return undefined;
        const { data, error } = await client.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, ttl);
        if (error) {
            console.warn('Failed to create signed URL for', path, error.message);
            return undefined;
        }
        return data?.signedUrl ?? undefined;
    }

    return {
        async getUserId() {
            const { data, error } = await client.auth.getUser();
            if (error || !data?.user) {
                throw new Error('Unauthorized: invalid or missing session.');
            }
            return data.user.id;
        },

        async uploadImage(userId, fileBuffer, filename, contentType) {
            const ext = (filename?.split('.').pop() || contentType?.split('/')[1] || 'jpg').toLowerCase();
            const path = `${userId}/${generateId()}.${ext}`;
            const { error } = await client.storage.from(RECEIPTS_BUCKET).upload(path, fileBuffer, {
                contentType,
                upsert: false,
            });
            if (error) throw new Error(`Image upload failed: ${error.message}`);
            return path;
        },

        async removeImage(path) {
            if (!path) return;
            await client.storage.from(RECEIPTS_BUCKET).remove([path]);
        },

        createSignedUrl,

        async listReceipts() {
            const { data, error } = await client
                .from('receipts')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw new Error(`Failed to load receipts: ${error.message}`);
            return ((data ?? []) as ReceiptRow[]).map((row) => mapRowToReceipt(row));
        },

        async insertReceipt(receipt) {
            const { data, error } = await client
                .from('receipts')
                .insert(mapReceiptToRow(receipt))
                .select('*')
                .single();
            if (error) throw new Error(`Failed to save receipt: ${error.message}`);
            return mapRowToReceipt(data as ReceiptRow);
        },
    };
}
