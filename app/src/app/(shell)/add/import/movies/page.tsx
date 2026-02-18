'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api';
import { ManualMatchDialog } from '@/components/movie/ManualMatchDialog';
import type { ImportFile } from '@/lib/api/movieApi';

interface ImportMovieFile extends ImportFile {
  id: string;
  selectedMovieId?: number;
  selectedMovieTitle?: string;
  selectedMovieYear?: number;
  qualityOverride?: string;
  languageOverride?: string;
  status: 'matched' | 'unmatched' | 'manual';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function ImportMoviesPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { movieApi } = useMemo(() => getApiClients(), []);

  const [scanPath, setScanPath] = useState('/downloads/complete');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<ImportMovieFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [manualMatchFile, setManualMatchFile] = useState<ImportMovieFile | null>(null);

  // Quality options for dropdown
  const qualityOptions = [
    'SD',
    '720p',
    '1080p',
    '1080p BluRay',
    '2160p',
    '2160p BluRay',
  ];

  // Language options for dropdown
  const languageOptions = [
    'English',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Korean',
    'Chinese',
  ];

  // Handle scan
  const handleScan = useCallback(async () => {
    if (!scanPath.trim()) {
      pushToast({
        title: 'Path required',
        message: 'Please enter a path to scan',
        variant: 'warning',
      });
      return;
    }

    setIsScanning(true);
    setScannedFiles([]);

    try {
      const result = await movieApi.scanImport({ path: scanPath });
      
      const files: ImportMovieFile[] = result.files.map((file, index) => ({
        ...file,
        id: `file-${index}`,
        selectedMovieId: file.match?.movieId,
        selectedMovieTitle: file.match?.title,
        selectedMovieYear: file.match?.year,
        status: file.match && file.match.confidence >= 0.8 ? 'matched' : 'unmatched',
      }));

      setScannedFiles(files);

      pushToast({
        title: 'Scan complete',
        message: `Found ${files.length} video file(s)`,
        variant: 'success',
      });
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 501)) {
        pushToast({
          title: 'Not available',
          message: 'Import scanning requires backend support',
          variant: 'warning',
        });
      } else {
        pushToast({
          title: 'Scan failed',
          message: error instanceof Error ? error.message : 'Failed to scan folder',
          variant: 'error',
        });
      }
    } finally {
      setIsScanning(false);
    }
  }, [scanPath, movieApi, pushToast]);

  // Handle manual match selection
  const handleManualMatchSelect = useCallback((file: ImportMovieFile) => {
    setManualMatchFile(file);
  }, []);

  // Handle manual match confirmation
  const handleMatchConfirm = useCallback((movie: { id: number; title: string; year: number }) => {
    if (!manualMatchFile) return;

    setScannedFiles(current =>
      current.map(f =>
        f.id === manualMatchFile.id
          ? {
              ...f,
              selectedMovieId: movie.id,
              selectedMovieTitle: movie.title,
              selectedMovieYear: movie.year,
              status: 'manual' as const,
            }
          : f
      )
    );

    pushToast({
      title: 'Match confirmed',
      message: `"${movie.title}" selected`,
      variant: 'success',
    });
    setManualMatchFile(null);
  }, [manualMatchFile, pushToast]);

  // Handle quality override
  const handleQualityChange = useCallback((fileId: string, quality: string) => {
    setScannedFiles(current =>
      current.map(f =>
        f.id === fileId ? { ...f, qualityOverride: quality } : f
      )
    );
  }, []);

  // Handle language override
  const handleLanguageChange = useCallback((fileId: string, language: string) => {
    setScannedFiles(current =>
      current.map(f =>
        f.id === fileId ? { ...f, languageOverride: language } : f
      )
    );
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    const filesToImport = scannedFiles.filter(f => f.selectedMovieId);

    if (filesToImport.length === 0) {
      pushToast({
        title: 'No files to import',
        message: 'Please match at least one file to a movie',
        variant: 'warning',
      });
      return;
    }

    setIsImporting(true);

    try {
      const result = await movieApi.applyImport({
        files: filesToImport.map(f => ({
          path: f.path,
          movieId: f.selectedMovieId!,
          quality: f.qualityOverride,
          language: f.languageOverride,
        })),
      });

      pushToast({
        title: 'Import complete',
        message: `${result.imported} file(s) imported successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        variant: result.failed > 0 ? 'warning' : 'success',
      });

      // Remove imported files from list
      setScannedFiles(current => 
        current.filter(f => !f.selectedMovieId || result.errors.some(e => e.path === f.path))
      );
    } catch (error) {
      pushToast({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Failed to import files',
        variant: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  }, [scannedFiles, movieApi, pushToast]);

  // Summary stats
  const matchedCount = scannedFiles.filter(f => f.status === 'matched' || f.status === 'manual').length;
  const unmatchedCount = scannedFiles.filter(f => f.status === 'unmatched').length;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Movies</h1>
          <p className="text-sm text-text-secondary">
            Scan a folder to find and import movie files into your library.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/add')}>
          Back to Add Media
        </Button>
      </header>

      {/* Scanner Section */}
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Scan Folder</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={scanPath}
            onChange={(e) => setScanPath(e.target.value)}
            placeholder="/path/to/movies"
            className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
          />
          <Button
            variant="primary"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Icon name="refresh" className="animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Icon name="folder" />
                <span>Scan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results Section */}
      {scannedFiles.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {scannedFiles.length} file(s) found
              {matchedCount > 0 && (
                <span className="text-status-success ml-2">
                  ({matchedCount} matched)
                </span>
              )}
              {unmatchedCount > 0 && (
                <span className="text-status-warning ml-2">
                  ({unmatchedCount} need attention)
                </span>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={isImporting || matchedCount === 0}
            >
              {isImporting ? (
                <>
                  <Icon name="refresh" className="animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Icon name="download" />
                  <span>Import {matchedCount} File(s)</span>
                </>
              )}
            </Button>
          </div>

          {/* Files Table */}
          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2">
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-3 px-4 font-medium">File</th>
                    <th className="text-left py-3 px-4 font-medium">Detected</th>
                    <th className="text-left py-3 px-4 font-medium">Match</th>
                    <th className="text-left py-3 px-4 font-medium">Quality</th>
                    <th className="text-left py-3 px-4 font-medium">Language</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedFiles.map((file) => (
                    <tr
                      key={file.id}
                      className={`border-b border-border-subtle ${
                        file.status === 'unmatched' ? 'bg-status-warning/5' : ''
                      }`}
                    >
                      {/* File name and size */}
                      <td className="py-3 px-4">
                        <div className="font-medium truncate max-w-[300px]" title={file.path}>
                          {file.path.split('/').pop()}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {formatBytes(file.size)}
                        </div>
                      </td>

                      {/* Detected info */}
                      <td className="py-3 px-4">
                        {file.parsedMovieTitle ? (
                          <div>
                            <div className="font-medium">{file.parsedMovieTitle}</div>
                            {file.parsedYear && (
                              <div className="text-xs text-text-secondary">({file.parsedYear})</div>
                            )}
                            {file.parsedQuality && (
                              <div className="text-xs text-text-secondary">{file.parsedQuality}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>

                      {/* Match status */}
                      <td className="py-3 px-4">
                        {file.selectedMovieTitle ? (
                          <div className="flex items-center gap-2">
                            <Icon
                              name={file.status === 'manual' ? 'user' : 'success'}
                              className={file.status === 'manual' ? 'text-accent-primary' : 'text-status-success'}
                            />
                            <div>
                              <div className="font-medium">{file.selectedMovieTitle}</div>
                              {file.selectedMovieYear && (
                                <div className="text-xs text-text-secondary">
                                  ({file.selectedMovieYear})
                                  {file.match && (
                                    <span className="ml-2">
                                      {Math.round(file.match.confidence * 100)}% confidence
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-status-warning">No match</span>
                        )}
                      </td>

                      {/* Quality override */}
                      <td className="py-3 px-4">
                        <select
                          value={file.qualityOverride || ''}
                          onChange={(e) => handleQualityChange(file.id, e.target.value)}
                          className="bg-surface-2 border border-border-subtle rounded px-2 py-1 text-sm"
                        >
                          <option value="">Auto</option>
                          {qualityOptions.map(q => (
                            <option key={q} value={q}>{q}</option>
                          ))}
                        </select>
                      </td>

                      {/* Language override */}
                      <td className="py-3 px-4">
                        <select
                          value={file.languageOverride || ''}
                          onChange={(e) => handleLanguageChange(file.id, e.target.value)}
                          className="bg-surface-2 border border-border-subtle rounded px-2 py-1 text-sm"
                        >
                          <option value="">Auto</option>
                          {languageOptions.map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleManualMatchSelect(file)}
                        >
                          <Icon name="search" />
                          <span>Match</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warning for unmatched files */}
          {unmatchedCount > 0 && (
            <div className="rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-sm">
              <p className="font-semibold text-status-warning">Attention Required</p>
              <p className="text-text-secondary">
                {unmatchedCount} file(s) could not be automatically matched. 
                Please use the Match button to manually select the correct movie.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {scannedFiles.length === 0 && !isScanning && (
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-8 text-center">
          <Icon name="folder" className="text-4xl text-text-muted mb-3" />
          <p className="text-lg font-medium text-text-primary">No files scanned yet</p>
          <p className="mt-2 text-sm text-text-secondary">
            Enter a folder path above and click Scan to find movie files.
          </p>
        </div>
      )}

      {/* Manual Match Dialog */}
      <ManualMatchDialog
        isOpen={manualMatchFile !== null}
        onClose={() => setManualMatchFile(null)}
        originalTitle={manualMatchFile?.parsedMovieTitle}
        originalYear={manualMatchFile?.parsedYear}
        onSelect={handleMatchConfirm}
      />
    </section>
  );
}
