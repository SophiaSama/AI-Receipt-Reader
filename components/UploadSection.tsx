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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.match('image.*')) {
        alert("Only image files are allowed");
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isProcessing = status.step === 'uploading' || status.step === 'analyzing';

  return (
    <div className="w-full" data-testid="upload-section">
      <div className="mb-4">
        <label htmlFor="ai-model-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          AI Model
        </label>
        <select
          id="ai-model-select"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
      </div>
      <div
        className={`relative flex flex-col items-center justify-center w-full h-36 border-[1.5px] border-dashed rounded-xl transition-all duration-300 ease-out group/dropzone
          ${dragActive ? 'border-primary bg-primary/5' : 'border-pink-200 bg-blush/30'}
          ${isProcessing ? 'opacity-70 pointer-events-none' : 'hover:border-primary/50 hover:bg-blush/50 cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-full cursor-pointer relative z-10 px-4">
          <div className="flex flex-col items-center justify-center">
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 border-2 border-primary/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                  <div className="absolute inset-0 w-8 h-8 border-t-2 border-primary rounded-full animate-spin"></div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-700">{status.step === 'analyzing' ? 'Mistral AI Analyzing' : 'Uploading...'}</p>
                  <p className="text-xs text-slate-400 italic">
                    "{status.message || 'Extracting data...'}"
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 p-2.5 bg-lavender-50 rounded-xl border border-lavender-100 group-hover/dropzone:scale-110 group-hover/dropzone:border-primary/20 transition-all duration-300">
                  <svg className="w-5 h-5 text-secondary group-hover/dropzone:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-600 mb-0.5">Click to upload receipt, or drag and drop</h3>
                <p className="text-xs text-slate-400 font-medium text-center">Supports PNG, JPG (Max 10MB)</p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, .png, .jpg, .jpeg"
            onChange={handleChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      {status.step === 'error' && (
        <div className="mt-3 p-2.5 bg-rose-50 text-rose-500 rounded-xl flex items-center gap-2.5 text-xs border border-rose-200">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span className="font-medium">{status.message}</span>
        </div>
      )}
    </div>
  );
};