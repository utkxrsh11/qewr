import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, Trash2, Sparkles, AlertCircle, FileCheck, Info } from 'lucide-react';
import { SAMPLE_COURSE } from '../data/sampleCourse.ts';
import { Course } from '../types/course.ts';

interface UploadViewProps {
  onStartExtraction: (payload: { pdfBase64?: string; text?: string; fileName?: string }) => void;
  onLoadSample: (course: Course) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onStartExtraction,
  onLoadSample,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    base64: string;
    formattedSize: string;
  } | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size in KB or MB
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Immediate file validation as required by prompt
  const validateAndProcessFile = (file: File) => {
    setValidationError(null);

    // 1. Check if empty
    if (file.size === 0) {
      setSelectedFile(null);
      setValidationError('This file appears to be empty.');
      return;
    }

    // 2. Reject non-PDF
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setSelectedFile(null);
      setValidationError("That doesn't look like a PDF. Please choose a .pdf file.");
      return;
    }

    // 3. Reject files > 20 MB (20 * 1024 * 1024 bytes)
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setSelectedFile(null);
      setValidationError('This file is too large (max 20 MB).');
      return;
    }

    // Read file as Base64 for server delivery
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      // Strip data:application/pdf;base64, prefix
      const base64Data = resultStr.includes(',')
        ? resultStr.split(',')[1]
        : resultStr;

      setSelectedFile({
        file,
        base64: base64Data,
        formattedSize: formatFileSize(file.size),
      });
      setValidationError(null);
    };

    reader.onerror = () => {
      setValidationError('Failed to read the file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isTextValid = pastedText.trim().length >= 300;
  const isReadyToBuild = isTextMode ? isTextValid : selectedFile !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReadyToBuild) return;

    if (isTextMode) {
      onStartExtraction({
        text: pastedText.trim(),
        fileName: 'Pasted Study Text',
      });
    } else if (selectedFile) {
      onStartExtraction({
        pdfBase64: selectedFile.base64,
        fileName: selectedFile.file.name,
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
      {/* 1. App Title & Tagline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-[#F5C542] rotate-45 shadow-sm shadow-amber-500/50" />
          <h1 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-[#F5C542] drop-shadow-[0_2px_10px_rgba(245,197,66,0.3)]">
            StudyQuest
          </h1>
          <div className="w-3 h-3 bg-[#F5C542] rotate-45 shadow-sm shadow-amber-500/50" />
        </div>
        <p className="text-slate-300 text-sm sm:text-base font-medium max-w-md mx-auto">
          Turn your study material into a game.
        </p>
      </div>

      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-5 sm:p-7 shadow-2xl relative">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isTextMode ? (
            /* 2. Drag & Drop Upload Area */
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                id="pdf-upload-input"
                onChange={handleFileInputChange}
              />

              {!selectedFile ? (
                <label
                  htmlFor="pdf-upload-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  tabIndex={0}
                  role="button"
                  aria-label="Drop your PDF here or click to browse"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#F5C542] block ${
                    isDragging
                      ? 'border-[#F5C542] bg-[#F5C542]/10 scale-[1.01]'
                      : 'border-[#303A63] bg-[#0E1224] hover:border-teal-400/80 hover:bg-[#151B33]'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-[#1C2344] border border-[#2E3A68] flex items-center justify-center text-[#2DD4BF] shadow-inner mb-1 mx-auto">
                    <UploadCloud className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <p className="text-base font-semibold text-white">
                    Drop your PDF here or click to browse
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports syllabus, lecture notes, textbook chapters
                  </p>
                </label>
              ) : (
                /* Selected File Card */
                <div className="p-4 rounded-lg bg-[#0E1224] border-2 border-[#2DD4BF]/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-teal-950/80 border border-teal-500/40 text-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {selectedFile.file.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {selectedFile.formattedSize}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded hover:bg-[#202747] text-slate-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Remove selected file ${selectedFile.file.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 3. Paste Text Mode */
            <div className="flex flex-col gap-2">
              <label
                htmlFor="pasted-study-text"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider"
              >
                Paste your study text
              </label>
              <textarea
                id="pasted-study-text"
                rows={7}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Paste lecture notes, study outlines, or reading material here (minimum 300 characters)..."
                className="w-full p-3.5 rounded-lg bg-[#0E1224] border-2 border-[#252E52] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition-colors resize-y font-sans"
              />

              <div className="flex items-center justify-between text-xs px-1">
                <span
                  className={
                    pastedText.length >= 300
                      ? 'text-[#22C55E] font-medium'
                      : 'text-slate-400'
                  }
                >
                  {pastedText.length} / 300 characters minimum
                </span>
                <span className="text-slate-400">
                  {pastedText.length < 300
                    ? `Need ${300 - pastedText.length} more`
                    : 'Ready'}
                </span>
              </div>

              {/* Required note for pasted text */}
              <div className="flex items-start gap-2 p-2.5 rounded bg-[#181E38] border border-[#2B355E] text-xs text-slate-300 mt-1">
                <Info className="w-4 h-4 text-[#2DD4BF] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Pasted text has no pages, so all concepts are marked as page 1.
                </span>
              </div>
            </div>
          )}

          {/* Error Message Box (Under upload area) */}
          {validationError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-950/80 border-2 border-[#EF4444] text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* 3. Secondary Toggle: Paste text instead */}
          <div className="flex justify-center -mt-1">
            <button
              type="button"
              onClick={() => {
                setIsTextMode(!isTextMode);
                setValidationError(null);
              }}
              className="text-xs font-semibold text-[#2DD4BF] hover:text-teal-300 underline underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded px-1"
            >
              {isTextMode ? '← Back to PDF upload' : 'Paste text instead'}
            </button>
          </div>

          {/* 4. Small Info Row */}
          <div className="text-center text-xs text-slate-400 font-mono py-1 border-t border-[#1C223D]">
            PDF only, max 20 MB, text-based PDFs work best.
          </div>

          {/* 5. Build My Course Primary Button */}
          <button
            type="submit"
            disabled={!isReadyToBuild}
            className="btn-pixel-gold w-full py-3 sm:py-3.5 px-6 rounded-lg text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-amber-900" aria-hidden="true" />
            <span>Build my course</span>
          </button>

          {/* 6. Secondary Button: Load Sample Course */}
          <div className="pt-2 flex flex-col items-center">
            <button
              type="button"
              onClick={() => onLoadSample(SAMPLE_COURSE)}
              className="btn-pixel-dark px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#2DD4BF]" aria-hidden="true" />
              <span>Load sample course (Water Cycle)</span>
            </button>
            <span className="text-[11px] text-slate-500 mt-1">
              Test course overview immediately with sample data
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
