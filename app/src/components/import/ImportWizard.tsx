import { useState, useMemo, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { getApiClients } from '@/lib/api/client';
import type { ScannedFolderWithMatches, MatchCandidate } from '@/lib/api/importApi';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: 'movie' | 'series';
}

type WizardStep = 'select-folder' | 'scanning' | 'review' | 'config' | 'importing' | 'complete';

interface ImportItem {
  folderPath: string;
  files: Array<{
    path: string;
    size: number;
    extension: string;
    parsedInfo?: {
      seasonNumber?: number;
      episodeNumbers?: number[];
      quality?: string;
    };
  }>;
  selectedMatchId: number;
  matchCandidates: MatchCandidate[];
  renameFiles: boolean;
}

export function ImportWizard({ isOpen, onClose, mediaType }: ImportWizardProps) {
  const api = useMemo(() => getApiClients(), []);
  const [step, setStep] = useState<WizardStep>('select-folder');
  const [selectedPath, setSelectedPath] = useState('');
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [qualityProfileId] = useState(1);
  const [renameFiles, setRenameFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: Array<{ folderPath: string; error: string }> } | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const handleScan = useCallback(async () => {
    if (!selectedPath) return;
    
    setStep('scanning');
    setError(null);
    
    try {
      const result = await api.importApi.scan({ path: selectedPath });
      
      const items: ImportItem[] = result.folders.map((folder: ScannedFolderWithMatches) => ({
        folderPath: folder.path,
        files: folder.files.map(f => ({
          path: f.path,
          size: f.size,
          extension: f.extension,
          parsedInfo: f.parsedInfo ? {
            seasonNumber: f.parsedInfo.seasonNumber,
            episodeNumbers: f.parsedInfo.episodeNumbers,
            quality: f.parsedInfo.quality,
          } : undefined,
        })),
        selectedMatchId: folder.selectedMatchId ?? 0,
        matchCandidates: folder.matchCandidates,
        renameFiles: false,
      }));
      
      setImportItems(items);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan folder');
      setStep('select-folder');
    }
  }, [api, selectedPath]);

  const handleMatchChange = useCallback((folderPath: string, matchId: number) => {
    setImportItems(prev => prev.map(item => 
      item.folderPath === folderPath ? { ...item, selectedMatchId: matchId } : item
    ));
  }, []);

  const handleManualSearch = useCallback(async (folderPath: string, title: string) => {
    try {
      const results = await api.importApi.search({ title, mediaType });
      setImportItems(prev => prev.map(item => {
        if (item.folderPath !== folderPath) return item;
        return {
          ...item,
          matchCandidates: results,
          selectedMatchId: results[0]?.id ?? 0,
        };
      }));
    } catch (err) {
      console.error('Manual search failed:', err);
    }
  }, [api, mediaType]);

  const handleExecuteImport = useCallback(async () => {
    setStep('importing');
    setError(null);

    try {
      const items = importItems.map(item => ({
        folderPath: item.folderPath,
        mediaType,
        matchId: item.selectedMatchId,
        files: item.files,
        renameFiles,
        rootFolderPath: selectedPath,
        qualityProfileId,
      }));

      const result = await api.importApi.execute({ items });
      setImportResult(result);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('config');
    }
  }, [api, importItems, mediaType, renameFiles, selectedPath, qualityProfileId]);

  const handleClose = useCallback(() => {
    setStep('select-folder');
    setSelectedPath('');
    setImportItems([]);
    setError(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  const canProceedToConfig = importItems.every(item => item.selectedMatchId > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel={`Import Existing ${mediaType === 'movie' ? 'Movies' : 'Series'}`}>
      <ModalHeader
        title={`Import Existing ${mediaType === 'movie' ? 'Movies' : 'Series'}`}
        onClose={handleClose}
      />
      <ModalBody>
        <div className="min-w-[500px] max-w-[700px]">
          {error && (
            <div className="mb-4 rounded-sm border border-status-error/40 bg-status-error/10 p-3 text-sm text-status-error">
              {error}
            </div>
          )}

          {step === 'select-folder' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Select a root folder containing your existing {mediaType === 'movie' ? 'movies' : 'TV series'}.
                The scanner will recursively find all video files and match them to metadata.
              </p>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  placeholder="/path/to/media"
                  className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                />
                <Button variant="secondary" onClick={() => setIsBrowserOpen(true)}>
                  Browse
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleScan} disabled={!selectedPath}>
                  Scan Folder
                </Button>
              </div>
            </div>
          )}

          {step === 'scanning' && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
              <span className="ml-3">Scanning folder for {mediaType === 'movie' ? 'movies' : 'series'}...</span>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Found {importItems.length} {mediaType === 'movie' ? 'movie' : 'series'} folder{importItems.length !== 1 ? 's' : ''}
                </h3>
                <Button variant="secondary" onClick={() => setStep('select-folder')}>
                  Rescan
                </Button>
              </div>

              <div className="max-h-[400px] space-y-3 overflow-y-auto">
                {importItems.map(item => (
                  <div key={item.folderPath} className="rounded border border-border-subtle bg-surface-1 p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.folderPath.split('/').pop()}</p>
                        <p className="text-xs text-text-secondary">{item.files.length} file{item.files.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={item.selectedMatchId}
                        onChange={(e) => handleMatchChange(item.folderPath, Number(e.target.value))}
                        className="flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
                      >
                        {item.matchCandidates.length === 0 && (
                          <option value={0}>No matches found</option>
                        )}
                        {item.matchCandidates.map((candidate: MatchCandidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.title} {candidate.year ? `(${candidate.year})` : ''} - {Math.round(candidate.confidence * 100)}%
                          </option>
                        ))}
                      </select>
                      
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const title = prompt('Search for:', item.folderPath.split('/').pop());
                          if (title) void handleManualSearch(item.folderPath, title);
                        }}
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button onClick={() => setStep('config')} disabled={!canProceedToConfig}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'config' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Configuration</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={renameFiles}
                    onChange={(e) => setRenameFiles(e.target.checked)}
                  />
                  <span className="text-sm">Rename files to standard format</span>
                </label>
                
                <p className="text-xs text-text-secondary">
                  {renameFiles 
                    ? 'Files will be renamed and organized into proper folder structure'
                    : 'Files will remain in their current location and names'}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setStep('review')}>Back</Button>
                <Button onClick={handleExecuteImport}>
                  Import {importItems.length} {mediaType === 'movie' ? 'Movie' : 'Series'}{importItems.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent mx-auto" />
              <p className="mt-3">Importing...</p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className="rounded border border-status-success/40 bg-status-success/10 p-4">
                <h3 className="font-semibold text-status-success">Import Complete</h3>
                <p className="mt-1 text-sm">
                  Successfully imported {importResult.imported} {mediaType === 'movie' ? 'movie' : 'series'}{importResult.imported !== 1 ? 's' : ''}
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </p>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded border border-status-warning/40 bg-status-warning/10 p-3">
                  <p className="font-semibold text-status-warning">Errors:</p>
                  <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err.folderPath}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <FilesystemBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelect={(path) => {
          setSelectedPath(path);
          setIsBrowserOpen(false);
        }}
      />
    </Modal>
  );
}
