import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { processFileForUpload, ProcessedUpload } from '../../lib/storage';

interface FileUploaderProps {
  shopSlug: string;
  onFilesSelected: (files: ProcessedUpload[]) => void;
  maxFileSizeMB?: number;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];

export const FileUploader: React.FC<FileUploaderProps> = ({
  shopSlug,
  onFilesSelected,
  maxFileSizeMB = 25,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const validFiles: File[] = [];
      const errors: string[] = [];

      Array.from(fileList).forEach((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errors.push(`"${file.name}" is not supported. Use PDF, Word, or JPG/PNG.`);
          return;
        }

        if (file.size > maxFileSizeMB * 1024 * 1024) {
          errors.push(`"${file.name}" exceeds maximum allowed size of ${maxFileSizeMB}MB.`);
          return;
        }

        validFiles.push(file);
      });

      if (errors.length > 0) {
        setErrorMessage(errors.join(' '));
      }

      if (validFiles.length > 0) {
        const processed = await Promise.all(
          validFiles.map((f) => processFileForUpload(f, shopSlug))
        );
        onFilesSelected(processed);
      }
    } catch (err) {
      console.error('File processing error', err);
      setErrorMessage('Upload failed. Please check your files and try again.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/60 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-3">
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            {isProcessing ? 'Reading files...' : 'Upload files to print'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            Tap to select or drag & drop files here from your phone or computer
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
              <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF Document
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> JPG / PNG Photo
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Word (.doc/.docx)
            </span>
          </div>

          <span className="mt-3 text-[11px] text-slate-400">Up to 25MB per file • Multiple files supported</span>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
