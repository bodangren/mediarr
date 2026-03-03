'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { useToast } from '@/components/providers/ToastProvider';
import { DataTable } from '@/components/primitives/DataTable';
import { getApiClients } from '@/lib/api/client';
export function ManualSearchModal({ isOpen, episodeId, movieId, onClose }) {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const searchQuery = useQuery({
        queryKey: ['subtitle-manual-search', movieId ?? episodeId],
        queryFn: () => api.subtitleApi.manualSearch({ movieId, episodeId }),
        enabled: isOpen && (movieId ?? episodeId) !== undefined,
    });
    const downloadMutation = useMutation({
        mutationFn: (candidate) => api.subtitleApi.manualDownload({ movieId, episodeId, candidate }),
        onSuccess: () => {
            pushToast({
                title: 'Download Successful',
                message: 'Subtitle file downloaded successfully',
                variant: 'success',
            });
            queryClient.invalidateQueries({ queryKey: ['subtitle-manual-search'] });
            onClose();
        },
        onError: error => {
            pushToast({
                title: 'Download Failed',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'error',
            });
        },
    });
    const columns = [
        {
            key: 'language',
            header: 'Language',
            render: row => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { children: row.languageCode }), row.isForced && _jsx("span", { className: "text-xs text-text-muted", children: "(F)" }), row.isHi && _jsx("span", { className: "text-xs text-text-muted", children: "(HI)" })] })),
        },
        {
            key: 'provider',
            header: 'Provider',
            render: row => row.provider,
        },
        {
            key: 'score',
            header: 'Score',
            render: row => _jsx("span", { className: "text-sm text-text-secondary", children: row.score }),
        },
        {
            key: 'extension',
            header: 'Format',
            render: row => _jsx("span", { className: "text-sm text-text-secondary", children: row.extension ?? '-' }),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (_jsx(Button, { variant: "primary", onClick: () => downloadMutation.mutate(row), disabled: downloadMutation.isPending, children: downloadMutation.isPending ? 'Downloading...' : 'Download' })),
        },
    ];
    return (_jsxs(Modal, { isOpen: isOpen, ariaLabel: "Manual Subtitle Search", onClose: onClose, maxWidthClassName: "max-w-3xl", children: [_jsx(ModalHeader, { title: "Manual Subtitle Search", onClose: onClose }), _jsx(ModalBody, { children: _jsx(QueryPanel, { isLoading: searchQuery.isLoading, isError: searchQuery.isError, isEmpty: searchQuery.data?.length === 0, onRetry: () => searchQuery.refetch(), emptyTitle: "No subtitles found", emptyBody: "No subtitle candidates found. Try adjusting your provider settings.", children: _jsx(DataTable, { data: searchQuery.data ?? [], columns: columns, getRowId: row => `${row.provider}-${row.languageCode}-${row.score}` }) }) }), _jsx(ModalFooter, { children: _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" }) })] }));
}
//# sourceMappingURL=ManualSearchModal.js.map