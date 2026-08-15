import React, { useRef, useState } from 'react';
import { CloudUpload, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface GlassFolderUploaderProps {
  onFileSelect: (dataUrl: string, file: File) => void;
  selectedImageUrl?: string | null;
  onClear?: () => void;
  label?: string;
  error?: string;
}

export const GlassFolderUploader: React.FC<GlassFolderUploaderProps> = ({
  onFileSelect,
  selectedImageUrl,
  onClear,
  label = 'Upload Payment Receipt Screenshot',
  error,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { language } = useLanguage();
  const isAmharic = language === 'am';

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

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              {isAmharic ? 'ቀይር' : 'Change'}
            </button>
            {onClear && (
              <button
                type="button"
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
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border border-dashed transition-all duration-150 py-5 px-4 flex flex-col items-center justify-center text-center ${
            error
              ? 'border-red-400 dark:border-red-500/60 bg-red-50/20 dark:bg-red-950/10'
              : isDragging
                ? 'border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/80'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-500">
            <CloudUpload className="w-4 h-4 stroke-[2]" />
          </div>

          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {isAmharic ? 'የደረሰኝ ፎቶ እዚህ ይጫኑ (እስከ 5MB)' : 'Click or drop payment image here (Max 5MB)'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            JPG, JPEG, PNG, WEBP
          </p>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
        className="hidden"
      />
    </div>
  );
};
