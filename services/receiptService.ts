import type { SupabaseClient } from '@supabase/supabase-js';
import type { LineItem, ReceiptData } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { getAuthService } from './authService';

const BUCKET = 'receipts';
const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

const rawApiBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
const DEFAULT_API_BASE = rawApiBase && rawApiBase.trim().length > 0
  ? rawApiBase.trim().replace(/\/$/, '')
  : '/api';

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
  ocr_route?: string | null;
  processing_metrics?: unknown;
  created_at: string;
}

/** Row payload for inserts — DB fills user_id (auth.uid()) and created_at (now()). */
export type ReceiptInsert = Omit<ReceiptRow, 'user_id' | 'created_at'>;

export type ProcessReceiptResponse = ReceiptData | {
  duplicateDetected: true;
  matchType: 'imageHash' | 'ocrFingerprint';
  candidateReceipt: Pick<ReceiptData, 'id' | 'merchantName' | 'date' | 'total' | 'currency'>;
  pendingReceipt: ReceiptData;
};

export interface ProcessReceiptOptions {
  modelId?: string;
}

/**
 * Maps a Postgres row to the frontend ReceiptData shape. `signedUrl`, when
 * provided, becomes `imageUrl` for display (rows store the storage path, not a URL).
 */
export function mapRowToReceipt(row: ReceiptRow, signedUrl?: string): ReceiptData {
  return {
    id: row.id,
    date: row.date ?? '',
    total: row.total != null ? Number(row.total) : 0,
    currency: row.currency ?? '',
    merchantName: row.merchant_name ?? '',
    items: row.items ?? [],
    imageUrl: signedUrl ?? undefined,
    imageHash: row.image_hash ?? undefined,
    ocrFingerprint: row.ocr_fingerprint ?? undefined,
    rawText: row.raw_text ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

/**
 * Maps a frontend ReceiptData to an insert payload. `imageUrl` here is the
 * storage path (not a signed URL). user_id and created_at are left to the DB.
 */
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
  };
}

export interface ReceiptServiceDeps {
  client: SupabaseClient;
  /** Returns the current user's JWT for authorizing the server /process call. */
  getAccessToken?: () => Promise<string | null>;
  fetchFn?: typeof fetch;
  generateId?: () => string;
  apiBase?: string;
  signedUrlTtlSeconds?: number;
}

export interface ReceiptService {
  processAndSaveReceipt(file: File, options?: ProcessReceiptOptions): Promise<ProcessReceiptResponse>;
  confirmDuplicateReceiptDecision(action: 'ignore' | 'save', pendingReceipt: ReceiptData): Promise<{ ignored: true } | ReceiptData>;
  saveManualReceiptToDB(receipt: Partial<ReceiptData>, file?: File): Promise<ReceiptData>;
  fetchReceiptsFromDB(): Promise<ReceiptData[]>;
  deleteReceiptFromDB(id: string): Promise<void>;
  deleteReceiptsFromDB(ids: string[]): Promise<void>;
}

export function createReceiptService(deps: ReceiptServiceDeps): ReceiptService {
  const {
    client,
    fetchFn = fetch,
    generateId = () => crypto.randomUUID(),
    apiBase = DEFAULT_API_BASE,
    signedUrlTtlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
  } = deps;
  const getAccessToken = deps.getAccessToken ?? (() => Promise.resolve(null));

  async function getUserId(): Promise<string> {
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);
    const userId = data.session?.user?.id;
    if (!userId) throw new Error('Not authenticated.');
    return userId;
  }

  async function createSignedUrl(path: string | null | undefined): Promise<string | undefined> {
    if (!path) return undefined;
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, signedUrlTtlSeconds);
    if (error) {
      console.warn('Failed to create signed URL for', path, error.message);
      return undefined;
    }
    return data?.signedUrl ?? undefined;
  }

  async function uploadImage(file: File, userId: string): Promise<string> {
    const ext = (file.name?.split('.').pop() || file.type?.split('/')[1] || 'bin').toLowerCase();
    const path = `${userId}/${generateId()}.${ext}`;
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    return path;
  }

  return {
    async processAndSaveReceipt(file, options = {}) {
      const formData = new FormData();
      formData.append('file', file);
      if (options.modelId) formData.append('model', options.modelId);

      const headers: Record<string, string> = {};
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetchFn(`${apiBase}/process`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Server processing failed: ${response.statusText} (${response.status})`;
        try {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) errorMessage = `Error: ${errorData.error}`;
          } catch {
            if (errorText) errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        } catch {
          // ignore body read errors
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    },

    async confirmDuplicateReceiptDecision(action, pendingReceipt) {
      if (action === 'ignore') {
        // Remove the image the server already uploaded for this candidate.
        if (pendingReceipt.imageUrl) {
          const { error } = await client.storage.from(BUCKET).remove([pendingReceipt.imageUrl]);
          if (error) throw new Error(`Failed to discard duplicate image: ${error.message}`);
        }
        return { ignored: true };
      }

      // 'save': insert the row pointing at the already-uploaded image path.
      const { data, error } = await client
        .from('receipts')
        .insert(mapReceiptToRow(pendingReceipt))
        .select('*')
        .single();
      if (error) throw new Error(`Failed to save receipt: ${error.message}`);
      const signedUrl = await createSignedUrl((data as ReceiptRow).image_url);
      return mapRowToReceipt(data as ReceiptRow, signedUrl);
    },

    async saveManualReceiptToDB(receipt, file) {
      const userId = await getUserId();
      let imagePath: string | null = null;
      if (file) {
        imagePath = await uploadImage(file, userId);
      }

      const insertPayload: ReceiptInsert = {
        id: receipt.id ?? generateId(),
        date: receipt.date ?? null,
        total: receipt.total ?? null,
        currency: receipt.currency ?? null,
        merchant_name: receipt.merchantName ?? null,
        items: receipt.items ?? [],
        image_url: imagePath,
        image_hash: receipt.imageHash ?? null,
        ocr_fingerprint: receipt.ocrFingerprint ?? null,
        raw_text: receipt.rawText ?? null,
      };

      const { data, error } = await client
        .from('receipts')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) throw new Error(`Manual save failed: ${error.message}`);
      const signedUrl = await createSignedUrl((data as ReceiptRow).image_url);
      return mapRowToReceipt(data as ReceiptRow, signedUrl);
    },

    async fetchReceiptsFromDB() {
      const { data, error } = await client
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        // Previously this returned an empty list silently which caused the UI to appear blank.
        // Throw instead so callers can surface the error to users and developers.
        console.error('Failed to fetch receipts from Supabase:', error.message, error);
        throw new Error(`Failed to fetch receipts: ${error.message}`);
      }

      const rows = (data ?? []) as ReceiptRow[];
      return Promise.all(
        rows.map(async (row) => mapRowToReceipt(row, await createSignedUrl(row.image_url)))
      );
    },

    async deleteReceiptFromDB(id) {
      // Look up the image path so we can clean up storage too.
      const { data, error: selectError } = await client
        .from('receipts')
        .select('image_url')
        .eq('id', id)
        .single();
      if (selectError) throw new Error(`Failed to delete receipt: ${selectError.message}`);

      const imagePath = (data as Pick<ReceiptRow, 'image_url'>)?.image_url;
      if (imagePath) {
        await client.storage.from(BUCKET).remove([imagePath]);
      }

      const { error } = await client.from('receipts').delete().eq('id', id);
      if (error) throw new Error(`Failed to delete receipt: ${error.message}`);
    },

    async deleteReceiptsFromDB(ids) {
      if (!ids || ids.length === 0) return;

      const { data, error: selectError } = await client
        .from('receipts')
        .select('image_url')
        .in('id', ids);
      if (selectError) throw new Error(`Failed to bulk delete receipts: ${selectError.message}`);

      const paths = ((data ?? []) as Pick<ReceiptRow, 'image_url'>[])
        .map((r) => r.image_url)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await client.storage.from(BUCKET).remove(paths);
      }

      const { error } = await client.from('receipts').delete().in('id', ids);
      if (error) throw new Error(`Failed to bulk delete receipts: ${error.message}`);
    },
  };
}

let cachedReceiptService: ReceiptService | null = null;

function getReceiptService(): ReceiptService {
  if (!cachedReceiptService) {
    cachedReceiptService = createReceiptService({
      client: getSupabaseClient(),
      getAccessToken: () => getAuthService().getAccessToken(),
    });
  }
  return cachedReceiptService;
}

// Public API — preserves the function signatures App.tsx already consumes.
export const processAndSaveReceipt = (file: File, options?: ProcessReceiptOptions) =>
  getReceiptService().processAndSaveReceipt(file, options);

export const confirmDuplicateReceiptDecision = (action: 'ignore' | 'save', pendingReceipt: ReceiptData) =>
  getReceiptService().confirmDuplicateReceiptDecision(action, pendingReceipt);

export const saveManualReceiptToDB = (receipt: Partial<ReceiptData>, file?: File) =>
  getReceiptService().saveManualReceiptToDB(receipt, file);

export const fetchReceiptsFromDB = () => getReceiptService().fetchReceiptsFromDB();

export const deleteReceiptFromDB = (id: string) => getReceiptService().deleteReceiptFromDB(id);

export const deleteReceiptsFromDB = (ids: string[]) => getReceiptService().deleteReceiptsFromDB(ids);
