import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Camera,
  RefreshCw,
} from 'lucide-react';

interface AnimalImageUploadProps {
  value?: string;
  /**
   * Phase 2A: the selected image is handed to the caller as a File/BLOB.
   *
   * The previous behaviour produced a base64 data URL. That cannot be stored:
   * `animals.photo` is varchar(500) and a realistic thumbnail is 150-400 KB of
   * base64, so every save would fail. The backend now stores image bytes in
   * `animal_photos` (LONGBLOB) and takes the binary upload directly.
   *
   * `previewUrl` is a short-lived LOCAL object URL used only to show the
   * operator their selection. It is never persisted.
   */
  onChange: (file: File | null, previewUrl: string) => void;
  defaultMaxMb?: number;
  label?: string;
  helperText?: string;
  compact?: boolean;
}

export const AnimalImageUpload: React.FC<AnimalImageUploadProps> = ({
  value,
  onChange,
  defaultMaxMb = 5,
  label = 'Animal Photo',
  helperText = 'Upload a clear profile picture of the animal for identification and visual audit.',
  compact = false,
}) => {
  const [maxMb, setMaxMb] = useState<number>(defaultMaxMb);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [uploadedMeta, setUploadedMeta] = useState<{ name?: string; sizeMb?: number } | null>(null);
  /** Local object URL for the chosen file, or an already-saved photo URL. */
  const [previewUrl, setPreviewUrl] = useState<string>(value || '');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Validate and read file
  const processFile = (file: File) => {
    setError(null);

    // 1. Client-side type check. The SERVER re-validates from the file's magic
    //    bytes - this is only to fail fast and give a nicer message.
    if (!file.type.startsWith('image/')) {
      setError(`Invalid file type "${file.type}". Please upload an image file (JPEG, PNG, WebP).`);
      return;
    }

    const sizeMb = file.size / (1024 * 1024);

    if (sizeMb > maxMb) {
      setError(
        `File size (${sizeMb.toFixed(2)} MB) exceeds the maximum allowed space of ${maxMb} MB. Please choose a smaller photo or compress it.`
      );
      return;
    }

    setIsProcessing(true);

    // The File itself is passed through untouched. No base64 is produced, so
    // nothing oversized is ever handed to the API or stored in a varchar.
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadedMeta({ name: file.name, sizeMb: Number(sizeMb.toFixed(2)) });
    setIsProcessing(false);

    onChange(file, objectUrl);
  };

  // Client-side image optimization helper (kept for callers that still need a
  // downscaled preview). The BYTES uploaded to the server are the original
  // File unless the caller re-reads this data URL - the server enforces the
  // 2 MB limit regardless.
  const compressImage = (dataUrl: string, callback: (compressed: string) => void) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        callback(dataUrl);
      }
    };
    img.onerror = () => callback(dataUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleRemove = () => {
    // Clear the selection entirely. The caller decides whether that means
    // "delete the stored photo on the server" or "revert the form field".
    onChange(null, '');
    setPreviewUrl(value || '');
    setUploadedMeta(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Maximum Space Configuration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-slate-700 text-xs block">{label}</label>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Max: {maxMb} MB
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1 transition"
          title="Adjust maximum file size limit"
        >
          <Sliders className="w-3 h-3" />
          <span>{showConfig ? 'Hide Settings' : 'Set Max Size'}</span>
        </button>
      </div>

      {/* Max MB Configuration Dropdown/Pill Strip */}
      {showConfig && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Select Maximum Upload Limit:</span>
            <div className="flex items-center gap-1">
              {[2, 5, 10, 15].map((mb) => (
                <button
                  key={mb}
                  type="button"
                  onClick={() => {
                    setMaxMb(mb);
                    if (error && error.includes('exceeds the maximum')) {
                      setError(null);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    maxMb === mb
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Files exceeding {maxMb} MB will be rejected with an alert to preserve bandwidth and database performance.
          </p>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        id="animal-image-file-input"
      />

      {/* Current Image Preview Mode */}
      {value ? (
        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-900/5 shrink-0 border border-slate-200 shadow-2xs">
            <img
              src={value}
              alt="Animal preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/holstein_cow.jpg';
              }}
            />
            <div className="absolute top-1 left-1 bg-emerald-600/90 text-white rounded-full p-0.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">
                {uploadedMeta?.name || 'Animal Photo Ready'}
              </span>
              {uploadedMeta?.sizeMb && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {uploadedMeta.sizeMb} MB
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Image loaded and validated under the {maxMb} MB upload limit.
            </p>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition"
              >
                <X className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
              : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDragging ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-800">
                <span className="text-emerald-700 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-slate-500">
                Supports JPEG, PNG, WebP (Strict maximum <span className="font-bold text-slate-700">{maxMb} MB</span>)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 leading-tight">
            <span className="font-bold block">Upload Rejected</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/*
        PRESET PHOTOS REMOVED (Phase 2A)

        These were external Unsplash URLs. They required an Internet connection,
        which the target deployment - a local Windows server on a farm LAN with
        no required Internet access - does not have, and they were fabricated
        stock images that would have been stored as if they were real animal
        photographs. Only a genuine operator-supplied file is accepted now.
      */}
    </div>
  );
};
