'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api';
import { ManualEpisodeMatchDialog } from '@/components/series/ManualEpisodeMatchDialog';
import type { EpisodeImportFile } from '@/lib/api/seriesApi';

interface ImportEpisodeFile extends EpisodeImportFile {
  id: string;
  selectedSeriesId?: number;
  selectedSeasonId?: number;
  selectedEpisodeId?: number;
  selectedSeriesTitle?: string;
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

export default function ImportEpisodesPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { seriesApi } = useMemo(() => getApiClients(), []);

  const [scanPath, setScanPath] = useState('/downloads/complete');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<ImportEpisodeFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [manualMatchFile, setManualMatchFile] = useState<ImportEpisodeFile | null>(null);

  // Quality options for dropdown
  const qualityOptions = [
    'SD',
    '720p',
    '720p HDTV',
    '1080p',
    '1080p HDTV',
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
      const result = await seriesApi.scanImport({ path: scanPath });
      
      const files: ImportEpisodeFile[] = result.files.map((file, index) => ({
        ...file,
        id: `file-${index}`,
        selectedSeriesId: file.match?.seriesId,
        selectedSeasonId: file.match?.seasonId,
        selectedEpisodeId: file.match?.episodeId,
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
  }, [scanPath, seriesApi, pushToast]);

  // Handle manual match selection
  const handleManualMatchSelect = useCallback((file: ImportEpisodeFile) => {
    setManualMatchFile(file);
  }, []);

  // Handle manual match confirmation
  const handleMatchConfirm = useCallback((match: { 
    seriesId: number; 
    seasonId: number; 
    episodeId: number;
    seriesTitle: string;
  }) => {
    if (!manualMatchFile) return;

    setScannedFiles(current =>
      current.map(f =>
        f.id === manualMatchFile.id
          ? {
              ...f,
              selectedSeriesId: match.seriesId,
              selectedSeasonId: match.seasonId,
              selectedEpisodeId: match.episodeId,
              selectedSeriesTitle: match.seriesTitle,
              status: 'manual' as const,
            }
          : f
      )
    );

    pushToast({
      title: 'Match confirmed',
      message: `Matched to ${match.seriesTitle} - S${match.seasonId}E${match.episodeId}`,
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
    const filesToImport = scannedFiles.filter(f => 
      f.selectedSeriesId && f.selectedSeasonId && f.selectedEpisodeId
    );

    if (filesToImport.length === 0) {
      pushToast({
        title: 'No files to import',
        message: 'Please match at least one file to an episode',
        variant: 'warning',
      });
      return;
    }

    setIsImporting(true);

    try {
      const result = await seriesApi.applyImport({
        files: filesToImport.map(f => ({
          path: f.path,
          seriesId: f.selectedSeriesId!,
          seasonId: f.selectedSeasonId!,
          episodeId: f.selectedEpisodeId!,
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
        current.filter(f => !f.selectedEpisodeId || result.errors.some(e => e.path === f.path))
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
  }, [scannedFiles, seriesApi, pushToast]);

  // Summary stats
  const matchedCount = scannedFiles.filter(f => f.status === 'matched' || f.status === 'manual').length;
  const unmatchedCount = scannedFiles.filter(f => f.status === 'unmatched').length;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Episodes</h1>
          <p className="text-sm text-text-secondary">
            Scan a folder to find and import episode files into your library.
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
            placeholder="/path/to/episodes"
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
                        {file.parsedSeriesTitle ? (
                          <div>
                            <div className="font-medium">{file.parsedSeriesTitle}</div>
                            {file.parsedSeasonNumber !== undefined && (
                              <div className="text-xs text-text-secondary">
                                S{String(file.parsedSeasonNumber).padStart(2, '0')}
                                {file.parsedEpisodeNumber !== undefined && (
                                  <>E{String(file.parsedEpisodeNumber).padStart(2, '0')}</>
                                )}
                                {file.parsedEndingEpisodeNumber !== undefined && (
                                  <>-E{String(file.parsedEndingEpisodeNumber).padStart(2, '0')}</>
                                )}
                              </div>
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
                        {file.selectedEpisodeId ? (
                          <div className="flex items-center gap-2">
                            <Icon
                              name={file.status === 'manual' ? 'user' : 'success'}
                              className={file.status === 'manual' ? 'text-accent-primary' : 'text-status-success'}
                            />
                            <div>
                              <div className="font-medium">
                                {file.selectedSeriesTitle || `Series #${file.selectedSeriesId}`}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {file.match && (
                                  <span className="mr-2">
                                    {Math.round(file.match.confidence * 100)}% confidence
                                  </span>
                                )}
                              </div>
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
                Please use the Match button to manually select the correct series and episode.
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
            Enter a folder path above and click Scan to find episode files.
          </p>
        </div>
      )}

      {/* Manual Match Dialog */}
      <ManualEpisodeMatchDialog
        isOpen={manualMatchFile !== null}
        onClose={() => setManualMatchFile(null)}
        originalSeriesTitle={manualMatchFile?.parsedSeriesTitle}
        originalSeasonNumber={manualMatchFile?.parsedSeasonNumber}
        originalEpisodeNumber={manualMatchFile?.parsedEpisodeNumber}
        onSelect={handleMatchConfirm}
      />
    </section>
  );
}
