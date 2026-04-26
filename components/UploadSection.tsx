import React, { useCallback, useState } from 'react';
import { ProcessingStatus } from '../types';

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  status: ProcessingStatus;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onFileSelect, status }) => {
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
    <div className="w-full">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-3xl transition-all duration-700 ease-in-out group/dropzone overflow-hidden
          ${dragActive ? 'border-accent bg-accent/5' : 'border-white/5 bg-black/20'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-accent/40 hover:bg-white/[0.03] cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-full cursor-pointer relative z-10 px-8">
          <div className="flex flex-col items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-accent/10 rounded-full"></div>
                  <div className="absolute inset-0 w-24 h-24 border-t-4 border-accent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-foreground mb-2 tracking-tight uppercase">{status.step === 'analyzing' ? 'Mistral Core' : 'Uploading'}</p>
                  <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed">
                    {status.message || 'Extracting schema objects from document...'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 p-6 bg-white/[0.03] rounded-3xl border border-white/5 group-hover/dropzone:scale-110 group-hover/dropzone:bg-accent/10 group-hover/dropzone:border-accent/20 transition-all duration-500 shadow-inner">
                  <svg className="w-12 h-12 text-slate-500 group-hover/dropzone:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">DROP SOURCE</h3>
                <p className="text-slate-500 font-medium mb-10 text-center max-w-[280px] text-sm leading-relaxed tracking-wide">AI-driven extraction for merchant data, line items, and VAT summaries.</p>

                <div className="flex flex-wrap justify-center gap-4">
                  <span className="px-3 py-1 bg-white/[0.03] rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest border border-white/5">Raw Image</span>
                  <span className="px-3 py-1 bg-white/[0.03] rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest border border-white/5">Mistral ready</span>
                </div>
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

        {/* Decorative corner accents */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/5 rounded-tl-lg"></div>
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/5 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/5 rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/5 rounded-br-lg"></div>
      </div>

      {status.step === 'error' && (
        <div className="mt-8 p-6 bg-red-500/[0.03] text-red-400 rounded-3xl flex items-center gap-5 border border-red-500/10 animate-in slide-in-from-top-2 duration-500">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest mb-1 text-red-500">System Error</span>
            <span className="text-sm font-medium opacity-80">{status.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};