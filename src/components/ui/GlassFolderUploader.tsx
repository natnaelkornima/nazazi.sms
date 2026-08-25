import React, { useId, useRef, useState } from 'react';
import { CloudUpload, X, CheckCircle2, Upload } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface GlassFolderUploaderProps {
  onFileSelect: (dataUrl: string, file: File) => void;
  selectedImageUrl?: string | null;
  onClear?: () => void;
  label?: string;
  error?: string;
  id?: string;
}

export const GlassFolderUploader: React.FC<GlassFolderUploaderProps> = ({
  onFileSelect,
  selectedImageUrl,
  onClear,
  label = 'Upload Payment Receipt Screenshot',
  error,
  id,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { language } = useLanguage();
  const isAmharic = language === 'am';
  const generatedId = useId();
  const inputId = id || `payment-file-input-${generatedId}`;

  const handleFileChange = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onFileSelect(reader.result, file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const triggerUpload = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
        >
          {label}
        </label>
      )}

      {selectedImageUrl ? (
        <div className="relative rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 flex items-center gap-3 overflow-hidden shadow-2xs">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImageUrl}
              alt="Payment Receipt Screenshot"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isAmharic ? 'ደረሰኝ ተያይዟል' : 'Receipt Attached'}</span>
            </div>
            <p className="text-xs font-mono text-zinc-500 truncate mt-0.5">
              {fileName || 'receipt.jpg'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 relative z-10">
            <label
              htmlFor={inputId}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer inline-flex items-center"
            >
              {isAmharic ? 'ቀይር' : 'Change'}
            </label>
            {onClear && (
              <button
                type="button"
                id="payment-image-remove-btn"
                onClick={onClear}
                className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative overflow-hidden cursor-pointer rounded-xl border border-dashed transition-all duration-150 py-5 px-4 flex flex-col items-center justify-center text-center select-none ${
            error
              ? 'border-red-400 dark:border-red-500/60 bg-red-50/20 dark:bg-red-950/10'
              : isDragging
                ? 'border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80'
          }`}
        >
          {/* Transparent full-size native input overlay for TikTok, Instagram, and mobile WebViews */}
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-600 dark:text-zinc-300 shadow-2xs pointer-events-none">
            <CloudUpload className="w-5 h-5 stroke-[2]" />
          </div>

          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 pointer-events-none">
            {isAmharic ? 'የደረሰኝ ፎቶ እዚህ ይጫኑ (እስከ 5MB)' : 'Click or drop payment image here (Max 5MB)'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5 pointer-events-none">
            JPG, JPEG, PNG, WEBP
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs pointer-events-none">
            <Upload className="w-3.5 h-3.5" />
            <span>{isAmharic ? 'ምስል ጫን (Upload)' : 'Upload'}</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
};
