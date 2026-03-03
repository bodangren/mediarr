'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api';
import { ManualEpisodeMatchDialog } from '@/components/series/ManualEpisodeMatchDialog';
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
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
    const [scannedFiles, setScannedFiles] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [manualMatchFile, setManualMatchFile] = useState(null);
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
            const files = result.files.map((file, index) => ({
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
        }
        catch (error) {
            if (error instanceof ApiClientError && (error.status === 404 || error.status === 501)) {
                pushToast({
                    title: 'Not available',
                    message: 'Import scanning requires backend support',
                    variant: 'warning',
                });
            }
            else {
                pushToast({
                    title: 'Scan failed',
                    message: error instanceof Error ? error.message : 'Failed to scan folder',
                    variant: 'error',
                });
            }
        }
        finally {
            setIsScanning(false);
        }
    }, [scanPath, seriesApi, pushToast]);
    // Handle manual match selection
    const handleManualMatchSelect = useCallback((file) => {
        setManualMatchFile(file);
    }, []);
    // Handle manual match confirmation
    const handleMatchConfirm = useCallback((match) => {
        if (!manualMatchFile)
            return;
        setScannedFiles(current => current.map(f => f.id === manualMatchFile.id
            ? {
                ...f,
                selectedSeriesId: match.seriesId,
                selectedSeasonId: match.seasonId,
                selectedEpisodeId: match.episodeId,
                selectedSeriesTitle: match.seriesTitle,
                status: 'manual',
            }
            : f));
        pushToast({
            title: 'Match confirmed',
            message: `Matched to ${match.seriesTitle} - S${match.seasonId}E${match.episodeId}`,
            variant: 'success',
        });
        setManualMatchFile(null);
    }, [manualMatchFile, pushToast]);
    // Handle quality override
    const handleQualityChange = useCallback((fileId, quality) => {
        setScannedFiles(current => current.map(f => f.id === fileId ? { ...f, qualityOverride: quality } : f));
    }, []);
    // Handle language override
    const handleLanguageChange = useCallback((fileId, language) => {
        setScannedFiles(current => current.map(f => f.id === fileId ? { ...f, languageOverride: language } : f));
    }, []);
    // Handle import
    const handleImport = useCallback(async () => {
        const filesToImport = scannedFiles.filter(f => f.selectedSeriesId && f.selectedSeasonId && f.selectedEpisodeId);
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
                    seriesId: f.selectedSeriesId,
                    seasonId: f.selectedSeasonId,
                    episodeId: f.selectedEpisodeId,
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
            setScannedFiles(current => current.filter(f => !f.selectedEpisodeId || result.errors.some(e => e.path === f.path)));
        }
        catch (error) {
            pushToast({
                title: 'Import failed',
                message: error instanceof Error ? error.message : 'Failed to import files',
                variant: 'error',
            });
        }
        finally {
            setIsImporting(false);
        }
    }, [scannedFiles, seriesApi, pushToast]);
    // Summary stats
    const matchedCount = scannedFiles.filter(f => f.status === 'matched' || f.status === 'manual').length;
    const unmatchedCount = scannedFiles.filter(f => f.status === 'unmatched').length;
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Import Episodes" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Scan a folder to find and import episode files into your library." })] }), _jsx(Button, { variant: "secondary", onClick: () => router.push('/add'), children: "Back to Add Media" })] }), _jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4 space-y-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Scan Folder" }), _jsxs("div", { className: "flex gap-3", children: [_jsx("input", { type: "text", value: scanPath, onChange: (e) => setScanPath(e.target.value), placeholder: "/path/to/episodes", className: "flex-1 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm" }), _jsx(Button, { variant: "primary", onClick: handleScan, disabled: isScanning, children: isScanning ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", className: "animate-spin" }), _jsx("span", { children: "Scanning..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "folder" }), _jsx("span", { children: "Scan" })] })) })] })] }), scannedFiles.length > 0 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-sm text-text-secondary", children: [scannedFiles.length, " file(s) found", matchedCount > 0 && (_jsxs("span", { className: "text-status-success ml-2", children: ["(", matchedCount, " matched)"] })), unmatchedCount > 0 && (_jsxs("span", { className: "text-status-warning ml-2", children: ["(", unmatchedCount, " need attention)"] }))] }), _jsx(Button, { variant: "primary", onClick: handleImport, disabled: isImporting || matchedCount === 0, children: isImporting ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", className: "animate-spin" }), _jsx("span", { children: "Importing..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "download" }), _jsxs("span", { children: ["Import ", matchedCount, " File(s)"] })] })) })] }), _jsx("div", { className: "rounded-lg border border-border-subtle overflow-hidden", children: _jsx("div", { className: "max-h-[600px] overflow-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-surface-2", children: _jsxs("tr", { className: "border-b border-border-subtle", children: [_jsx("th", { className: "text-left py-3 px-4 font-medium", children: "File" }), _jsx("th", { className: "text-left py-3 px-4 font-medium", children: "Detected" }), _jsx("th", { className: "text-left py-3 px-4 font-medium", children: "Match" }), _jsx("th", { className: "text-left py-3 px-4 font-medium", children: "Quality" }), _jsx("th", { className: "text-left py-3 px-4 font-medium", children: "Language" }), _jsx("th", { className: "text-center py-3 px-4 font-medium", children: "Actions" })] }) }), _jsx("tbody", { children: scannedFiles.map((file) => (_jsxs("tr", { className: `border-b border-border-subtle ${file.status === 'unmatched' ? 'bg-status-warning/5' : ''}`, children: [_jsxs("td", { className: "py-3 px-4", children: [_jsx("div", { className: "font-medium truncate max-w-[300px]", title: file.path, children: file.path.split('/').pop() }), _jsx("div", { className: "text-xs text-text-secondary", children: formatBytes(file.size) })] }), _jsx("td", { className: "py-3 px-4", children: file.parsedSeriesTitle ? (_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: file.parsedSeriesTitle }), file.parsedSeasonNumber !== undefined && (_jsxs("div", { className: "text-xs text-text-secondary", children: ["S", String(file.parsedSeasonNumber).padStart(2, '0'), file.parsedEpisodeNumber !== undefined && (_jsxs(_Fragment, { children: ["E", String(file.parsedEpisodeNumber).padStart(2, '0')] })), file.parsedEndingEpisodeNumber !== undefined && (_jsxs(_Fragment, { children: ["-E", String(file.parsedEndingEpisodeNumber).padStart(2, '0')] }))] })), file.parsedQuality && (_jsx("div", { className: "text-xs text-text-secondary", children: file.parsedQuality }))] })) : (_jsx("span", { className: "text-text-muted", children: "-" })) }), _jsx("td", { className: "py-3 px-4", children: file.selectedEpisodeId ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { name: file.status === 'manual' ? 'user' : 'success', className: file.status === 'manual' ? 'text-accent-primary' : 'text-status-success' }), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: file.selectedSeriesTitle || `Series #${file.selectedSeriesId}` }), _jsx("div", { className: "text-xs text-text-secondary", children: file.match && (_jsxs("span", { className: "mr-2", children: [Math.round(file.match.confidence * 100), "% confidence"] })) })] })] })) : (_jsx("span", { className: "text-status-warning", children: "No match" })) }), _jsx("td", { className: "py-3 px-4", children: _jsxs("select", { value: file.qualityOverride || '', onChange: (e) => handleQualityChange(file.id, e.target.value), className: "bg-surface-2 border border-border-subtle rounded px-2 py-1 text-sm", children: [_jsx("option", { value: "", children: "Auto" }), qualityOptions.map(q => (_jsx("option", { value: q, children: q }, q)))] }) }), _jsx("td", { className: "py-3 px-4", children: _jsxs("select", { value: file.languageOverride || '', onChange: (e) => handleLanguageChange(file.id, e.target.value), className: "bg-surface-2 border border-border-subtle rounded px-2 py-1 text-sm", children: [_jsx("option", { value: "", children: "Auto" }), languageOptions.map(l => (_jsx("option", { value: l, children: l }, l)))] }) }), _jsx("td", { className: "py-3 px-4 text-center", children: _jsxs(Button, { variant: "secondary", onClick: () => handleManualMatchSelect(file), children: [_jsx(Icon, { name: "search" }), _jsx("span", { children: "Match" })] }) })] }, file.id))) })] }) }) }), unmatchedCount > 0 && (_jsxs("div", { className: "rounded-md border border-status-warning/40 bg-status-warning/10 p-3 text-sm", children: [_jsx("p", { className: "font-semibold text-status-warning", children: "Attention Required" }), _jsxs("p", { className: "text-text-secondary", children: [unmatchedCount, " file(s) could not be automatically matched. Please use the Match button to manually select the correct series and episode."] })] }))] })), scannedFiles.length === 0 && !isScanning && (_jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-8 text-center", children: [_jsx(Icon, { name: "folder", className: "text-4xl text-text-muted mb-3" }), _jsx("p", { className: "text-lg font-medium text-text-primary", children: "No files scanned yet" }), _jsx("p", { className: "mt-2 text-sm text-text-secondary", children: "Enter a folder path above and click Scan to find episode files." })] })), _jsx(ManualEpisodeMatchDialog, { isOpen: manualMatchFile !== null, onClose: () => setManualMatchFile(null), originalSeriesTitle: manualMatchFile?.parsedSeriesTitle, originalSeasonNumber: manualMatchFile?.parsedSeasonNumber, originalEpisodeNumber: manualMatchFile?.parsedEpisodeNumber, onSelect: handleMatchConfirm })] }));
}
//# sourceMappingURL=page.js.map