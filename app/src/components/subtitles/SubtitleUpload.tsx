'use client';

import { useState, useCallback, useRef, type DragEvent } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

export interface SubtitleUploadProps {
  seriesId?: number;
  episodeId?: number;
  movieId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  languageCode: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const ALLOWED_EXTENSIONS = ['.srt', '.sub', '.ass', '.vtt'] as const;
const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
] as const;

export function SubtitleUpload({
  seriesId,
  episodeId,
  movieId,
  onSuccess,
  onCancel,
}: SubtitleUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFile = useCallback((file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension as any);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(isValidFile);

      if (validFiles.length === 0 && files.length > 0) {
        // Show error about invalid files
        console.warn('No valid subtitle files dropped');
        return;
      }

      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        languageCode: selectedLanguage,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    },
    [isValidFile, selectedLanguage],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const validFiles = files.filter(isValidFile);

      const newFiles: UploadedFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        languageCode: selectedLanguage,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [isValidFile, selectedLanguage],
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateFileLanguage = useCallback((fileId: string, langCode: string) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, languageCode: langCode } : f)),
    );
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);

    // Simulate upload progress for demo purposes
    // In production, this would call the actual API
    const uploadPromises = uploadedFiles.map(async (uploadedFile) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f)),
      );

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, progress } : f,
            ),
          );
        }

        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'success' as const } : f)),
        );
      } catch (error) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f,
          ),
        );
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
  }, [uploadedFiles]);

  const handleComplete = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  const allSuccess = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.status === 'success');
  const hasError = uploadedFiles.some((f) => f.status === 'error');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Upload Subtitles</h2>
        <Button variant="secondary" onClick={onCancel} aria-label="Cancel upload">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <label htmlFor="language-select" className="block text-sm font-medium text-text-secondary">
          Default Language
        </label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
        >
          {COMMON_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.code})
            </option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors
          ${isDragging
            ? 'border-accent-primary bg-accent-primary/10'
            : 'border-border-subtle bg-surface-2 hover:border-border-subtle/70'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Select subtitle files"
        />
        <Upload className="mx-auto h-12 w-12 text-text-muted" />
        <p className="mt-2 text-sm font-medium text-text-primary">
          {isDragging ? 'Drop files here' : 'Drag & drop subtitle files here'}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          or click to browse • {ALLOWED_EXTENSIONS.join(', ')}
        </p>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-primary">Files to Upload</h3>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-1 px-3 py-2"
              >
                {/* Status Icon */}
                <div className="shrink-0">
                  {uploadedFile.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-accent-success" />
                  ) : uploadedFile.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-accent-danger" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border-subtle" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Language Selector */}
                <select
                  value={uploadedFile.languageCode}
                  onChange={(e) => updateFileLanguage(uploadedFile.id, e.target.value)}
                  disabled={uploadedFile.status !== 'pending'}
                  className="rounded border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/50 disabled:opacity-50"
                >
                  {COMMON_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.code}
                    </option>
                  ))}
                </select>

                {/* Progress Bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent-primary transition-all duration-200"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  variant="secondary"
                  onClick={() => removeFile(uploadedFile.id)}
                  disabled={uploadedFile.status !== 'pending'}
                  aria-label={`Remove ${uploadedFile.file.name}`}
                  className="p-1.5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          {allSuccess ? (
            <Button variant="primary" onClick={handleComplete}>
              Done
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0 || isUploading || hasError}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="rounded-md border border-accent-danger/30 bg-accent-danger/10 px-3 py-2">
          <p className="text-sm text-accent-danger">
            Some files failed to upload. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
