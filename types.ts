export interface LineItem {
  description: string;
  price: number;
}

export interface ReceiptData {
  id: string;
  date: string; // YYYY-MM-DD
  total: number;
  currency: string;
  merchantName: string;
  items: LineItem[];
  imageUrl?: string;
  rawText?: string;
  createdAt: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  step: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  message?: string;
}

export interface DailyTotal {
  date: string;
  total: number;
  count: number;
}