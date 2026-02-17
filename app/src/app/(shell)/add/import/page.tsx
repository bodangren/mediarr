'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FolderScanner } from '@/components/import/FolderScanner';
import { ImportSeriesTable } from '@/components/import/ImportSeriesTable';
import { ManualMatchModal } from '@/components/import/ManualMatchModal';
import { ImportConfigPanel } from '@/components/import/ImportConfigPanel';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import type { DetectedSeries, ScanProgress, ImportConfig, SeriesSearchResult } from '@/components/import/types';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api';

const defaultImportConfig: ImportConfig = {
  qualityProfileId: 1,
  monitored: true,
  monitorNewItems: 'all',
  rootFolder: '/media/tv',
  seriesType: 'standard',
  seasonFolder: true,
};

export default function ImportSeriesPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { importApi } = getApiClients();

  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    status: 'idle',
    scannedFolders: 0,
  });
  const [detectedSeries, setDetectedSeries] = useState<DetectedSeries[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig>(defaultImportConfig);
  const [manualMatchSeries, setManualMatchSeries] = useState<DetectedSeries | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [backendSupported, setBackendSupported] = useState<boolean | null>(null);

  const handleScan = useCallback(async (path: string) => {
    setScanProgress({
      status: 'scanning',
      currentPath: path,
      scannedFolders: 0,
    });
    setDetectedSeries([]);

    try {
      const results = await importApi.scanFolder({ path });
      setDetectedSeries(results);
      setScanProgress({
        status: 'complete',
        scannedFolders: results.length,
      });
      setBackendSupported(true);
      pushToast({
        title: 'Scan complete',
        message: `Found ${results.length} series in ${path}`,
        variant: 'success',
      });
    } catch (error) {
      // Check if backend endpoint doesn't exist (404 or 501)
      if (error instanceof ApiClientError) {
        if (error.status === 404 || error.status === 501) {
          setBackendSupported(false);
          setScanProgress({
            status: 'complete',
            scannedFolders: 0,
            errorMessage: 'Folder scanning requires backend support',
          });
          pushToast({
            title: 'Backend not available',
            message: 'Folder scanning requires backend support',
            variant: 'warning',
          });
          return;
        }
      }

      setScanProgress({
        status: 'error',
        scannedFolders: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error during scan',
      });
      pushToast({
        title: 'Scan failed',
        message: 'Could not scan specified folder',
        variant: 'error',
      });
    }
  }, [importApi, pushToast]);

  const handleManualMatch = useCallback((series: DetectedSeries) => {
    setManualMatchSeries(series);
  }, []);

  const handleMatchConfirm = useCallback((detectedSeriesId: number, matchedSeries: SeriesSearchResult) => {
    setDetectedSeries(current =>
      current.map(s =>
        s.id === detectedSeriesId
          ? {
              ...s,
              matchedSeriesId: matchedSeries.id,
              matchedSeriesTitle: matchedSeries.title,
              matchedSeriesYear: matchedSeries.year,
              status: 'matched' as const,
            }
          : s
      )
    );
    pushToast({
      title: 'Match confirmed',
      message: `"${matchedSeries.title}" matched successfully`,
      variant: 'success',
    });
  }, [pushToast]);

  const handleImport = useCallback(async (series: DetectedSeries) => {
    // Check if backend is supported before attempting import
    if (backendSupported === false) {
      pushToast({
        title: 'Backend not available',
        message: 'Series import requires backend support',
        variant: 'warning',
      });
      return;
    }

    setIsImporting(true);

    try {
      if (!series.matchedSeriesId) {
        pushToast({
          title: 'Cannot import unmatched series',
          message: 'Please match the series to a TVDB entry first',
          variant: 'error',
        });
        return;
      }

      await importApi.importSeries({
        seriesId: series.matchedSeriesId,
        folderName: series.folderName,
        path: series.path,
        qualityProfileId: importConfig.qualityProfileId,
        monitored: importConfig.monitored,
        monitorNewItems: importConfig.monitorNewItems,
        rootFolder: importConfig.rootFolder,
        seriesType: importConfig.seriesType,
        seasonFolder: importConfig.seasonFolder,
      });

      pushToast({
        title: 'Series imported',
        message: `"${series.matchedSeriesTitle || series.folderName}" has been imported successfully`,
        variant: 'success',
      });

      // Remove from list after import
      setDetectedSeries(current => current.filter(s => s.id !== series.id));
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 404 || error.status === 501) {
          setBackendSupported(false);
          pushToast({
            title: 'Backend not available',
            message: 'Series import requires backend support',
            variant: 'warning',
          });
          return;
        }
      }

      pushToast({
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Failed to import series',
        variant: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  }, [importApi, importConfig, backendSupported, pushToast]);

  const handleBulkImport = useCallback(async (seriesIds: number[]) => {
    // Check if backend is supported before attempting import
    if (backendSupported === false) {
      pushToast({
        title: 'Backend not available',
        message: 'Bulk import requires backend support',
        variant: 'warning',
      });
      return;
    }

    setIsImporting(true);

    try {
      const seriesToImport = detectedSeries.filter(s =>
        seriesIds.includes(s.id) && s.matchedSeriesId !== null
      );

      if (seriesToImport.length === 0) {
        pushToast({
          title: 'No series to import',
          message: 'All selected series must be matched first',
          variant: 'warning',
        });
        return;
      }

      const importRequests = seriesToImport.map(series => ({
        seriesId: series.matchedSeriesId!,
        folderName: series.folderName,
        path: series.path,
        qualityProfileId: importConfig.qualityProfileId,
        monitored: importConfig.monitored,
        monitorNewItems: importConfig.monitorNewItems,
        rootFolder: importConfig.rootFolder,
        seriesType: importConfig.seriesType,
        seasonFolder: importConfig.seasonFolder,
      }));

      const result = await importApi.bulkImportSeries(importRequests);

      pushToast({
        title: 'Bulk import complete',
        message: `${result.importedCount} series imported successfully`,
        variant: 'success',
      });

      // Remove imported series from list
      setDetectedSeries(current => current.filter(s => !result.ids.includes(s.id)));
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 404 || error.status === 501) {
          setBackendSupported(false);
          pushToast({
            title: 'Backend not available',
            message: 'Bulk import requires backend support',
            variant: 'warning',
          });
          return;
        }
      }

      pushToast({
        title: 'Bulk import failed',
        message: error instanceof Error ? error.message : 'Failed to import series',
        variant: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  }, [detectedSeries, importApi, importConfig, backendSupported, pushToast]);

  const matchedCount = detectedSeries.filter(s => s.status === 'matched').length;
  const unmatchedCount = detectedSeries.filter(s => s.status === 'unmatched').length;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Series</h1>
          <p className="text-sm text-text-secondary">
            Scan your existing TV series library and import them into Mediarr.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/add')}>
          Back to Add Media
        </Button>
      </header>

      {/* Folder Scanner */}
      <FolderScanner scanProgress={scanProgress} onScan={handleScan} />

      {/* Results Section */}
      {scanProgress.status === 'complete' && detectedSeries.length > 0 && (
        <>
          {/* Import Configuration Panel */}
          <ImportConfigPanel
            config={importConfig}
            onChange={setImportConfig}
            rootFolders={['/media/tv', '/media/series', '/data/tv']}
          />

          {/* Results Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Detected Series</h2>
              {matchedCount > 0 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const matchedIds = detectedSeries
                      .filter(s => s.status === 'matched')
                      .map(s => s.id);
                    handleBulkImport(matchedIds);
                  }}
                  disabled={isImporting || backendSupported === false}
                  title={backendSupported === false ? 'Import requires backend support' : undefined}
                >
                  Import All Matched ({matchedCount})
                </Button>
              )}
            </div>

            <ImportSeriesTable
              detectedSeries={detectedSeries}
              onManualMatch={handleManualMatch}
              onImport={handleImport}
              onBulkImport={handleBulkImport}
              backendSupported={backendSupported}
            />

            {/* Warnings */}
            {unmatchedCount > 0 && (
              <div className="rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-sm">
                <p className="font-semibold text-status-warning">Attention Required</p>
                <p className="text-text-secondary">
                  {unmatchedCount} series could not be automatically matched. Please use the Search button to manually match them.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state after scan with no results */}
      {scanProgress.status === 'complete' && detectedSeries.length === 0 && (
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-8 text-center">
          {backendSupported === false ? (
            <>
              <p className="text-lg font-medium text-text-primary">Backend Not Available</p>
              <p className="mt-2 text-sm text-text-secondary">
                Folder scanning requires backend support. The import feature is not yet implemented on the server.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-text-primary">No series detected</p>
              <p className="mt-2 text-sm text-text-secondary">
                No TV series were found in the specified folder. Make sure the path is correct and contains properly named series folders.
              </p>
            </>
          )}
        </div>
      )}

      {/* Manual Match Modal */}
      <ManualMatchModal
        isOpen={manualMatchSeries !== null}
        onClose={() => setManualMatchSeries(null)}
        series={manualMatchSeries}
        onMatch={handleMatchConfirm}
      />
    </section>
  );
}
