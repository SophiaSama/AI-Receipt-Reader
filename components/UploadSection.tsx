import React, { useCallback, useState } from 'react';
import { ProcessingStatus } from '../types';

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  status: ProcessingStatus;
  modelId: string;
  modelOptions: { id: string; label: string }[];
  onModelChange: (modelId: string) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileSelect,
  status,
  modelId,
  modelOptions,
  onModelChange,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndSelect = (file: File) => {
    setLocalError(null);
    if (!file.type.match('image.*')) {
      setLocalError("Only image files (PNG, JPG, JPEG, WebP) are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setLocalError("File exceeds 50MB limit. Please select a receipt photo.");
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
      e.target.value = '';
    }
  };

  const isProcessing = Boolean(status.isProcessing || status.step === 'uploading' || status.step === 'analyzing');

  return (
    <div className="w-full space-y-3.5" data-testid="upload-section">
      {/* AI Model Selection */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="ai-model-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            AI Extraction Model
          </label>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Vision OCR
          </span>
        </div>
        <div className="relative">
          <select
            id="ai-model-select"
            className="w-full px-3.5 py-2.5 bg-white/90 border border-pink-100 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer pr-9 shadow-sm"
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isProcessing}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        className={`relative flex flex-col items-center justify-center w-full min-h-[150px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-out group/dropzone ${
          dragActive
            ? 'border-primary bg-primary/8 scale-[1.01]'
            : 'border-pink-200/80 bg-gradient-to-b from-white/80 to-blush/40 hover:border-primary/50 hover:bg-blush/60'
        } ${isProcessing ? 'opacity-85 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-full cursor-pointer relative z-10 p-5">
          <div className="flex flex-col items-center justify-center text-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-primary/20 rounded-full animate-spin border-t-primary"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {status.step === 'analyzing' ? 'Extracting Receipt Data' : 'Uploading & Optimizing'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {status.message || 'Scanning merchant, items and totals...'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2.5 p-3 bg-white rounded-2xl border border-pink-100 shadow-sm group-hover/dropzone:scale-110 group-hover/dropzone:border-primary/30 group-hover/dropzone:shadow-md transition-all duration-200">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">
                  Upload receipt photo
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-[240px]">
                  Drag and drop here, or <span className="text-primary underline underline-offset-2 font-semibold">browse file</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] font-semibold text-slate-400 bg-white/70 px-2 py-0.5 rounded-md border border-pink-100/50">
                    PNG, JPG, WebP
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-white/70 px-2 py-0.5 rounded-md border border-pink-100/50">
                    Auto-compression
                  </span>
                </div>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp, .png, .jpg, .jpeg, .webp"
            onChange={handleChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      {/* Local Validation Error */}
      {localError && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-between text-xs border border-rose-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <span className="font-medium">{localError}</span>
          </div>
          <button
            onClick={() => setLocalError(null)}
            className="text-rose-400 hover:text-rose-600 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Processing / Server Error */}
      {status.step === 'error' && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2.5 text-xs border border-rose-200 animate-in fade-in duration-200">
          <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span className="font-medium">{status.message}</span>
        </div>
      )}
    </div>
  );
};