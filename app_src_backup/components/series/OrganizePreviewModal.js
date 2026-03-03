'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import { Icon } from '@/components/primitives/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
export function OrganizePreviewModal({ isOpen, onClose, seriesIds, onComplete, }) {
    const { seriesApi } = useMemo(() => getApiClients(), []);
    const { pushToast } = useToast();
    const [previews, setPreviews] = useState([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    // Fetch previews when modal opens
    const fetchPreviews = useCallback(async () => {
        if (!isOpen || seriesIds.length === 0)
            return;
        setIsPreviewLoading(true);
        try {
            const result = await seriesApi.previewOrganize({ seriesIds });
            setPreviews(result.previews);
        }
        catch (error) {
            pushToast({
                title: 'Failed to preview',
                message: error instanceof Error ? error.message : 'Could not generate preview',
                variant: 'error',
            });
        }
        finally {
            setIsPreviewLoading(false);
        }
    }, [isOpen, seriesIds, seriesApi, pushToast]);
    // Apply rename mutation
    const applyMutation = useMutation({
        mutationFn: () => seriesApi.applyOrganize({ seriesIds }),
        onSuccess: (result) => {
            pushToast({
                title: 'Rename Complete',
                message: `${result.renamed} files renamed successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
                variant: result.failed > 0 ? 'warning' : 'success',
            });
            if (result.errors.length > 0) {
                console.error('Rename errors:', result.errors);
            }
            onComplete?.();
            onClose();
        },
        onError: (error) => {
            pushToast({
                title: 'Rename Failed',
                message: error instanceof Error ? error.message : 'Failed to rename files',
                variant: 'error',
            });
        },
    });
    // Load previews on open
    useMemo(() => {
        if (isOpen) {
            void fetchPreviews();
        }
    }, [isOpen, fetchPreviews]);
    // Filter to only show files that would change
    const changedPreviews = previews.filter(p => p.isNewPath);
    const unchangedCount = previews.filter(p => !p.isNewPath).length;
    // Group previews by series and season
    const groupedPreviews = useMemo(() => {
        const groups = {};
        for (const preview of changedPreviews) {
            if (!groups[preview.seriesTitle]) {
                groups[preview.seriesTitle] = {};
            }
            if (!groups[preview.seriesTitle][preview.seasonNumber]) {
                groups[preview.seriesTitle][preview.seasonNumber] = [];
            }
            groups[preview.seriesTitle][preview.seasonNumber].push(preview);
        }
        return groups;
    }, [changedPreviews]);
    return (_jsxs(Modal, { isOpen: isOpen, onClose: onClose, ariaLabel: "Organize Episode Files", maxWidthClassName: "max-w-4xl", children: [_jsx(ModalHeader, { title: "Organize Episode Files", onClose: onClose }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-lg border border-status-warning/40 bg-status-warning/10 p-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Icon, { name: "warning", className: "text-status-warning mt-0.5 shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-status-warning", children: "Warning" }), _jsx("p", { className: "text-sm text-text-secondary mt-1", children: "This will rename and/or move episode files on disk. Make sure your media is not being accessed by other applications." })] })] }) }), isPreviewLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Icon, { name: "refresh", className: "animate-spin text-2xl" }), _jsx("span", { className: "ml-2", children: "Generating preview..." })] })) : previews.length === 0 ? (_jsx("div", { className: "text-center py-8 text-text-secondary", children: "No series selected for organization." })) : (_jsxs(_Fragment, { children: [unchangedCount > 0 && (_jsxs("p", { className: "text-sm text-text-secondary", children: [unchangedCount, " file(s) already follow the naming convention."] })), _jsx("div", { className: "max-h-[400px] overflow-auto", children: Object.entries(groupedPreviews).map(([seriesTitle, seasons]) => (_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary mb-2 sticky top-0 bg-surface-1 py-1", children: seriesTitle }), Object.entries(seasons).map(([seasonNum, episodePreviews]) => (_jsxs("div", { className: "mb-3", children: [_jsxs("h4", { className: "text-xs font-medium text-text-secondary mb-1 px-2", children: ["Season ", seasonNum] }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface-2", children: _jsxs("tr", { className: "border-b border-border-subtle", children: [_jsx("th", { className: "text-left py-2 px-3 font-medium w-16", children: "Ep" }), _jsx("th", { className: "text-left py-2 px-3 font-medium", children: "Current Path" }), _jsx("th", { className: "text-left py-2 px-3 font-medium", children: "New Path" })] }) }), _jsx("tbody", { children: episodePreviews.map((preview) => (_jsxs("tr", { className: "border-b border-border-subtle", children: [_jsxs("td", { className: "py-2 px-3 text-text-secondary", children: ["E", String(preview.episodeNumber).padStart(2, '0')] }), _jsx("td", { className: "py-2 px-3 text-text-secondary", children: _jsx("span", { className: "font-mono text-xs break-all", children: preview.currentPath }) }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: "font-mono text-xs break-all text-accent-primary", children: preview.newPath }) })] }, `${preview.episodeId}`))) })] })] }, `${seriesTitle}-${seasonNum}`)))] }, seriesTitle))) }), changedPreviews.length === 0 && (_jsx("div", { className: "text-center py-4 text-text-secondary", children: "All files already follow the naming convention. No changes needed." }))] }))] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => applyMutation.mutate(), disabled: changedPreviews.length === 0 || applyMutation.isPending, children: applyMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", className: "animate-spin" }), _jsx("span", { children: "Renaming..." })] })) : (`Rename ${changedPreviews.length} File(s)`) })] })] }));
}
//# sourceMappingURL=OrganizePreviewModal.js.map