'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
const ALLOWED_EXTENSIONS = ['.srt', '.ass', '.ssa', '.sub', '.vtt'];
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
];
export function SubtitleUpload({ episodeId, movieId, onSuccess, onCancel, }) {
    const api = useMemo(() => getApiClients(), []);
    const { pushToast } = useToast();
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [forced, setForced] = useState(false);
    const [hearingImpaired, setHearingImpaired] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const mediaContext = episodeId
        ? { mediaType: 'episode', mediaId: episodeId }
        : movieId
            ? { mediaType: 'movie', mediaId: movieId }
            : null;
    const isValidFile = useCallback((file) => {
        const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
        return ALLOWED_EXTENSIONS.includes(extension);
    }, []);
    const setFile = useCallback((file) => {
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
    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback((event) => {
        event.preventDefault();
        setIsDragging(false);
    }, []);
    const handleDrop = useCallback((event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0] ?? null;
        setFile(file);
    }, [setFile]);
    const handlePickFile = useCallback((event) => {
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
        }
        catch (error) {
            pushToast({
                title: 'Upload failed',
                message: error instanceof Error ? error.message : 'Failed to upload subtitle file.',
                variant: 'error',
            });
        }
        finally {
            setIsUploading(false);
        }
    }, [api, forced, hearingImpaired, mediaContext, onSuccess, pushToast, selectedFile, selectedLanguage]);
    const canUpload = selectedFile !== null && mediaContext !== null && !isUploading;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Upload Subtitles" }), _jsx(Button, { variant: "secondary", onClick: onCancel, "aria-label": "Cancel upload", disabled: isUploading, children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("label", { htmlFor: "subtitle-language", className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Language" }), _jsx("select", { id: "subtitle-language", value: selectedLanguage, onChange: event => setSelectedLanguage(event.target.value), disabled: isUploading, className: "rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50", children: COMMON_LANGUAGES.map(language => (_jsxs("option", { value: language.code, children: [language.name, " (", language.code, ")"] }, language.code))) })] }), _jsxs("div", { className: "grid gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: forced, onChange: event => setForced(event.target.checked), disabled: isUploading }), _jsx("span", { children: "Forced" })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: hearingImpaired, onChange: event => setHearingImpaired(event.target.checked), disabled: isUploading }), _jsx("span", { children: "Hearing Impaired" })] })] })] }), _jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, className: `relative rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${isDragging
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-subtle bg-surface-2 hover:border-border-subtle/70'}`, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ALLOWED_EXTENSIONS.join(','), onChange: handlePickFile, disabled: isUploading, className: "absolute inset-0 cursor-pointer opacity-0", "aria-label": "Select subtitle file" }), _jsx(Upload, { className: "mx-auto h-10 w-10 text-text-muted" }), _jsx("p", { className: "mt-2 text-sm font-medium text-text-primary", children: isDragging ? 'Drop subtitle file here' : 'Drag & drop subtitle file here' }), _jsxs("p", { className: "mt-1 text-xs text-text-muted", children: ["or click to browse - ", ALLOWED_EXTENSIONS.join(', ')] })] }), selectedFile ? (_jsxs("div", { className: "rounded-md border border-border-subtle bg-surface-1 px-3 py-2", children: [_jsx("p", { className: "truncate text-sm font-medium text-text-primary", children: selectedFile.name }), _jsxs("p", { className: "text-xs text-text-muted", children: [(selectedFile.size / 1024).toFixed(1), " KB"] })] })) : null, isUploading ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-text-muted", children: [_jsx("span", { children: "Uploading..." }), _jsxs("span", { children: [progress, "%"] })] }), _jsx("div", { className: "h-2 overflow-hidden rounded-full bg-surface-3", children: _jsx("div", { className: "h-full bg-accent-primary transition-all", style: { width: `${Math.max(5, progress)}%` } }) })] })) : null, !mediaContext ? (_jsx("div", { className: "rounded-md border border-status-error/40 bg-status-error/15 px-3 py-2 text-sm text-text-primary", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx("span", { children: "Upload target is unavailable for this media item." })] }) })) : null, _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: onCancel, disabled: isUploading, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleUpload, disabled: !canUpload, children: isUploading ? 'Uploading...' : 'Upload' })] })] }));
}
//# sourceMappingURL=SubtitleUpload.js.map