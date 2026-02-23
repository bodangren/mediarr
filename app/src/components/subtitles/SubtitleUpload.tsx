'use client';

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

export interface SubtitleUploadProps {
  seriesId?: number;
  episodeId?: number;
  movieId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const ALLOWED_EXTENSIONS = ['.srt', '.ass', '.ssa', '.sub', '.vtt'] as const;
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
] as const;

export function SubtitleUpload({
  episodeId,
  movieId,
  onSuccess,
  onCancel,
}: SubtitleUploadProps) {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [forced, setForced] = useState(false);
  const [hearingImpaired, setHearingImpaired] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaContext = episodeId
    ? { mediaType: 'episode' as const, mediaId: episodeId }
    : movieId
      ? { mediaType: 'movie' as const, mediaId: movieId }
      : null;

  const isValidFile = useCallback((file: File): boolean => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    return ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number]);
  }, []);

  const setFile = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isValidFile(file)) {
      pushToast({
        title: 'Invalid file type',
        message: 'Only .srt, .ass, .ssa, .sub, and .vtt files are supported.',
        variant: 'error',
      });
      return;
    }

    setSelectedFile(file);
  }, [isValidFile, pushToast]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0] ?? null;
    setFile(file);
  }, [setFile]);

  const handlePickFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !mediaContext) {
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      await api.subtitleApi.uploadSubtitle({
        file: selectedFile,
        language: selectedLanguage,
        forced,
        hearingImpaired,
        mediaId: mediaContext.mediaId,
        mediaType: mediaContext.mediaType,
        onUploadProgress: setProgress,
      });

      setProgress(100);
      pushToast({
        title: 'Subtitle uploaded',
        message: `${selectedFile.name} uploaded successfully.`,
        variant: 'success',
      });
      onSuccess();
    } catch (error) {
      pushToast({
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload subtitle file.',
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  }, [api, forced, hearingImpaired, mediaContext, onSuccess, pushToast, selectedFile, selectedLanguage]);

  const canUpload = selectedFile !== null && mediaContext !== null && !isUploading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Upload Subtitles</h2>
        <Button variant="secondary" onClick={onCancel} aria-label="Cancel upload" disabled={isUploading}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="subtitle-language" className="grid gap-1 text-sm">
          <span>Language</span>
          <select
            id="subtitle-language"
            value={selectedLanguage}
            onChange={event => setSelectedLanguage(event.target.value)}
            disabled={isUploading}
            className="rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          >
            {COMMON_LANGUAGES.map(language => (
              <option key={language.code} value={language.code}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forced}
              onChange={event => setForced(event.target.checked)}
              disabled={isUploading}
            />
            <span>Forced</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hearingImpaired}
              onChange={event => setHearingImpaired(event.target.checked)}
              disabled={isUploading}
            />
            <span>Hearing Impaired</span>
          </label>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging
            ? 'border-accent-primary bg-accent-primary/10'
            : 'border-border-subtle bg-surface-2 hover:border-border-subtle/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handlePickFile}
          disabled={isUploading}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Select subtitle file"
        />
        <Upload className="mx-auto h-10 w-10 text-text-muted" />
        <p className="mt-2 text-sm font-medium text-text-primary">
          {isDragging ? 'Drop subtitle file here' : 'Drag & drop subtitle file here'}
        </p>
        <p className="mt-1 text-xs text-text-muted">or click to browse - {ALLOWED_EXTENSIONS.join(', ')}</p>
      </div>

      {selectedFile ? (
        <div className="rounded-md border border-border-subtle bg-surface-1 px-3 py-2">
          <p className="truncate text-sm font-medium text-text-primary">{selectedFile.name}</p>
          <p className="text-xs text-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : null}

      {isUploading ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full bg-accent-primary transition-all"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>
      ) : null}

      {!mediaContext ? (
        <div className="rounded-md border border-status-error/40 bg-status-error/15 px-3 py-2 text-sm text-text-primary">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Upload target is unavailable for this media item.</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleUpload} disabled={!canUpload}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}
