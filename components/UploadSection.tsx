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
        className={`relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-2xl transition-all duration-500 ease-in-out group/dropzone
          ${dragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/[0.02]'}
          ${isProcessing ? 'opacity-70 pointer-events-none' : 'hover:border-primary/50 hover:bg-white/[0.05] cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-full cursor-pointer relative z-10 px-6">
          <div className="flex flex-col items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary/20 rounded-full animate-[spin_3s_linear_infinite]"></div>
                  <div className="absolute inset-0 w-20 h-20 border-t-4 border-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white mb-2">{status.step === 'analyzing' ? 'Mistral AI Analyzing' : 'Uploading...'}</p>
                  <p className="text-slate-400 font-medium max-w-[200px] leading-relaxed italic">
                    "{status.message || 'Extracting structured data from your image...'}"
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/5 group-hover/dropzone:scale-110 group-hover/dropzone:bg-primary/10 group-hover/dropzone:border-primary/20 transition-all duration-300">
                  <svg className="w-12 h-12 text-slate-400 group-hover/dropzone:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Drop your receipt here</h3>
                <p className="text-slate-400 font-medium mb-6 text-center">AI-powered OCR will extract items & totals automatically</p>

                <div className="flex flex-wrap justify-center gap-3">
                  <span className="px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">PNG</span>
                  <span className="px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">JPG</span>
                  <span className="px-3 py-1 bg-white/5 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">PDF Soon</span>
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
      </div>

      {status.step === 'error' && (
        <div className="mt-6 p-5 bg-red-500/10 text-red-400 rounded-2xl flex items-center gap-4 text-sm border border-red-500/20 backdrop-blur-md">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold">Processing Failed</span>
            <span className="opacity-80">{status.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};