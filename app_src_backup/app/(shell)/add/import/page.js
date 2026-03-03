'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FolderScanner } from '@/components/import/FolderScanner';
import { ImportSeriesTable } from '@/components/import/ImportSeriesTable';
import { ManualMatchModal } from '@/components/import/ManualMatchModal';
import { ImportConfigPanel } from '@/components/import/ImportConfigPanel';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api';
const defaultImportConfig = {
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
    const [scanProgress, setScanProgress] = useState({
        status: 'idle',
        scannedFolders: 0,
    });
    const [detectedSeries, setDetectedSeries] = useState([]);
    const [importConfig, setImportConfig] = useState(defaultImportConfig);
    const [manualMatchSeries, setManualMatchSeries] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [backendSupported, setBackendSupported] = useState(null);
    const handleScan = useCallback(async (path) => {
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
        }
        catch (error) {
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
    const handleManualMatch = useCallback((series) => {
        setManualMatchSeries(series);
    }, []);
    const handleMatchConfirm = useCallback((detectedSeriesId, matchedSeries) => {
        setDetectedSeries(current => current.map(s => s.id === detectedSeriesId
            ? {
                ...s,
                matchedSeriesId: matchedSeries.id,
                matchedSeriesTitle: matchedSeries.title,
                matchedSeriesYear: matchedSeries.year,
                status: 'matched',
            }
            : s));
        pushToast({
            title: 'Match confirmed',
            message: `"${matchedSeries.title}" matched successfully`,
            variant: 'success',
        });
    }, [pushToast]);
    const handleImport = useCallback(async (series) => {
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
        }
        catch (error) {
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
        }
        finally {
            setIsImporting(false);
        }
    }, [importApi, importConfig, backendSupported, pushToast]);
    const handleBulkImport = useCallback(async (seriesIds) => {
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
            const seriesToImport = detectedSeries.filter(s => seriesIds.includes(s.id) && s.matchedSeriesId !== null);
            if (seriesToImport.length === 0) {
                pushToast({
                    title: 'No series to import',
                    message: 'All selected series must be matched first',
                    variant: 'warning',
                });
                return;
            }
            const importRequests = seriesToImport.map(series => ({
                seriesId: series.matchedSeriesId,
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
        }
        catch (error) {
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
        }
        finally {
            setIsImporting(false);
        }
    }, [detectedSeries, importApi, importConfig, backendSupported, pushToast]);
    const matchedCount = detectedSeries.filter(s => s.status === 'matched').length;
    const unmatchedCount = detectedSeries.filter(s => s.status === 'unmatched').length;
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Import Series" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Scan your existing TV series library and import them into Mediarr." })] }), _jsx(Button, { variant: "secondary", onClick: () => router.push('/add'), children: "Back to Add Media" })] }), _jsx(FolderScanner, { scanProgress: scanProgress, onScan: handleScan }), scanProgress.status === 'complete' && detectedSeries.length > 0 && (_jsxs(_Fragment, { children: [_jsx(ImportConfigPanel, { config: importConfig, onChange: setImportConfig, rootFolders: ['/media/tv', '/media/series', '/data/tv'] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Detected Series" }), matchedCount > 0 && (_jsxs(Button, { variant: "primary", onClick: () => {
                                            const matchedIds = detectedSeries
                                                .filter(s => s.status === 'matched')
                                                .map(s => s.id);
                                            handleBulkImport(matchedIds);
                                        }, disabled: isImporting || backendSupported === false, title: backendSupported === false ? 'Import requires backend support' : undefined, children: ["Import All Matched (", matchedCount, ")"] }))] }), _jsx(ImportSeriesTable, { detectedSeries: detectedSeries, onManualMatch: handleManualMatch, onImport: handleImport, onBulkImport: handleBulkImport, backendSupported: backendSupported }), unmatchedCount > 0 && (_jsxs("div", { className: "rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-sm", children: [_jsx("p", { className: "font-semibold text-status-warning", children: "Attention Required" }), _jsxs("p", { className: "text-text-secondary", children: [unmatchedCount, " series could not be automatically matched. Please use the Search button to manually match them."] })] }))] })] })), scanProgress.status === 'complete' && detectedSeries.length === 0 && (_jsx("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-8 text-center", children: backendSupported === false ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-lg font-medium text-text-primary", children: "Backend Not Available" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "Folder scanning requires backend support. The import feature is not yet implemented on the server." })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-lg font-medium text-text-primary", children: "No series detected" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "No TV series were found in the specified folder. Make sure the path is correct and contains properly named series folders." })] })) })), _jsx(ManualMatchModal, { isOpen: manualMatchSeries !== null, onClose: () => setManualMatchSeries(null), series: manualMatchSeries, onMatch: handleMatchConfirm })] }));
}
//# sourceMappingURL=page.js.map