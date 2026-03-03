'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsSchema } from '@/lib/settings-schema';
import { getApiClients } from '@/lib/api/client';
import { useEffect } from 'react';
function toSettingsUpdatePayload(data) {
    return {
        ...data,
        torrentLimits: {
            ...data.torrentLimits,
            globalDownloadLimitKbps: data.torrentLimits.globalDownloadLimitKbps ?? null,
            globalUploadLimitKbps: data.torrentLimits.globalUploadLimitKbps ?? null,
        },
        apiKeys: {
            tmdbApiKey: data.apiKeys.tmdbApiKey ?? null,
            openSubtitlesApiKey: data.apiKeys.openSubtitlesApiKey ?? null,
        },
    };
}
export function SettingsForm() {
    const queryClient = useQueryClient();
    const api = getApiClients().settingsApi;
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => api.get(),
    });
    const updateMutation = useMutation({
        mutationFn: (data) => api.update(toSettingsUpdatePayload(data)),
        onSuccess: (data) => {
            queryClient.setQueryData(['settings'], data);
            alert('Settings saved successfully'); // Simple feedback for now
        },
        onError: (error) => {
            console.error('Failed to save settings', error);
            alert('Failed to save settings');
        }
    });
    const form = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            torrentLimits: {
                maxActiveDownloads: 3,
                maxActiveSeeds: 3,
            },
            schedulerIntervals: {
                rssSyncMinutes: 15,
                availabilityCheckMinutes: 30,
                torrentMonitoringSeconds: 5,
            },
            pathVisibility: {
                showDownloadPath: true,
                showMediaPath: true,
            },
            apiKeys: { tmdbApiKey: '', openSubtitlesApiKey: '' }
        }
    });
    useEffect(() => {
        if (settings) {
            form.reset({
                ...settings,
                apiKeys: {
                    tmdbApiKey: settings.apiKeys?.tmdbApiKey ?? '',
                    openSubtitlesApiKey: settings.apiKeys?.openSubtitlesApiKey ?? ''
                }
            });
        }
    }, [settings, form]);
    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };
    if (isLoading) {
        return _jsx("div", { className: "p-6", children: "Loading settings..." });
    }
    return (_jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-8 max-w-4xl mx-auto p-6", children: [_jsxs("section", { className: "bg-white p-6 rounded-lg shadow-sm border border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 border-b pb-2", children: "General & Torrent Limits" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Max Active Downloads" }), _jsx("input", { type: "number", ...form.register('torrentLimits.maxActiveDownloads'), className: "w-full p-2 border rounded" }), form.formState.errors.torrentLimits?.maxActiveDownloads && (_jsx("p", { className: "text-red-500 text-xs", children: form.formState.errors.torrentLimits.maxActiveDownloads.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Max Active Seeds" }), _jsx("input", { type: "number", ...form.register('torrentLimits.maxActiveSeeds'), className: "w-full p-2 border rounded" }), form.formState.errors.torrentLimits?.maxActiveSeeds && (_jsx("p", { className: "text-red-500 text-xs", children: form.formState.errors.torrentLimits.maxActiveSeeds.message }))] })] })] }), _jsxs("section", { className: "bg-white p-6 rounded-lg shadow-sm border border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold mb-4 border-b pb-2", children: "API Keys" }), _jsxs("div", { children: [_jsx("label", { htmlFor: "tmdbApiKey", className: "block text-sm font-medium mb-1", children: "TMDB API Key" }), _jsx("input", { id: "tmdbApiKey", ...form.register('apiKeys.tmdbApiKey'), className: "w-full p-2 border rounded font-mono text-sm", placeholder: "Enter your TMDB Read Access Token or API Key" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Required for fetching movie metadata." })] }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { htmlFor: "openSubtitlesApiKey", className: "block text-sm font-medium mb-1", children: "OpenSubtitles API Key" }), _jsx("input", { id: "openSubtitlesApiKey", ...form.register('apiKeys.openSubtitlesApiKey'), className: "w-full p-2 border rounded font-mono text-sm", placeholder: "Enter your OpenSubtitles.com API Key" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Required for searching and downloading subtitles." })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { type: "submit", disabled: updateMutation.isPending, className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm transition-colors disabled:opacity-50", children: updateMutation.isPending ? 'Saving...' : 'Save Changes' }), updateMutation.isSuccess && _jsx("span", { className: "text-green-600 text-sm", children: "Saved!" })] })] }));
}
//# sourceMappingURL=settings-form.js.map