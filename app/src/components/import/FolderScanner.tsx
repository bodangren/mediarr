
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/primitives/Icon';
import type { ScanProgress } from './types';

interface FolderScannerProps {
  scanProgress: ScanProgress;
  onScan: (path: string) => void;
  defaultPath?: string;
}

export function FolderScanner({ scanProgress, onScan, defaultPath = '/media/tv' }: FolderScannerProps) {
  const [path, setPath] = useState(defaultPath);
  const isScanning = scanProgress.status === 'scanning';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isScanning && path.trim()) {
      onScan(path.trim());
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
      <h2 className="text-lg font-semibold">Import Series from Disk</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Enter a folder path to scan for existing TV series. Detected series will be matched against metadata providers.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="/path/to/tv/folder"
            disabled={isScanning}
            className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm disabled:opacity-50"
            aria-label="Folder path to scan"
          />
        </div>
        <Button type="submit" disabled={isScanning || !path.trim()}>
          {isScanning ? (
            <>
              <Icon name="refresh" label="Scanning" className="animate-spin" />
              <span className="ml-2">Scanning...</span>
            </>
          ) : (
            <>
              <Icon name="search" label="Scan" />
              <span className="ml-2">Scan Folder</span>
            </>
          )}
        </Button>
      </form>

      {isScanning && (
        <div className="mt-4 flex items-center gap-3 text-sm text-text-secondary">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <div>
            <p className="font-medium text-text-primary">Scanning folder...</p>
            {scanProgress.currentPath && (
              <p className="text-xs">{scanProgress.currentPath}</p>
            )}
          </div>
        </div>
      )}

      {scanProgress.status === 'error' && scanProgress.errorMessage && (
        <div className="mt-4 rounded-sm border border-status-error/40 bg-status-error/10 p-3 text-sm">
          <p className="font-semibold text-status-error">Scan Error</p>
          <p className="text-text-secondary">{scanProgress.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
