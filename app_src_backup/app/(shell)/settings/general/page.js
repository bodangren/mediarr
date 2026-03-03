'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getApiClients } from '@/lib/api/client';
import { settingsSchema } from '@/lib/settings-schema';
import { addShortcutSaveListener } from '@/lib/shortcuts';
function toPayload(data) {
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
const DEFAULT_VALUES = {
    torrentLimits: {
        maxActiveDownloads: 3,
        maxActiveSeeds: 3,
        globalDownloadLimitKbps: null,
        globalUploadLimitKbps: null,
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
    apiKeys: {
        tmdbApiKey: '',
        openSubtitlesApiKey: '',
    },
    host: {
        port: 9696,
        bindAddress: '*',
        urlBase: '',
        sslPort: 9697,
        enableSsl: false,
        sslCertPath: '',
        sslKeyPath: '',
    },
    security: {
        apiKey: '',
        authenticationMethod: 'none',
        authenticationRequired: false,
    },
    logging: {
        logLevel: 'info',
        logSizeLimit: 1048576,
        logRetentionDays: 30,
    },
    update: {
        branch: 'master',
        autoUpdateEnabled: false,
        mechanicsEnabled: false,
        updateScriptPath: '',
    },
};
export default function GeneralSettingsPage() {
    const settingsApi = getApiClients().settingsApi;
    const queryClient = useQueryClient();
    const { data: settings, isPending, isError, error, refetch } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });
    const form = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: DEFAULT_VALUES,
    });
    useEffect(() => {
        if (!settings) {
            return;
        }
        form.reset({
            ...settings,
            apiKeys: {
                tmdbApiKey: settings.apiKeys?.tmdbApiKey ?? '',
                openSubtitlesApiKey: settings.apiKeys?.openSubtitlesApiKey ?? '',
            },
            host: {
                port: settings.host?.port ?? 9696,
                bindAddress: settings.host?.bindAddress ?? '*',
                urlBase: settings.host?.urlBase ?? '',
                sslPort: settings.host?.sslPort ?? 9697,
                enableSsl: settings.host?.enableSsl ?? false,
                sslCertPath: settings.host?.sslCertPath ?? '',
                sslKeyPath: settings.host?.sslKeyPath ?? '',
            },
            security: {
                apiKey: settings.security?.apiKey ?? '',
                authenticationMethod: settings.security?.authenticationMethod ?? 'none',
                authenticationRequired: settings.security?.authenticationRequired ?? false,
            },
            logging: {
                logLevel: settings.logging?.logLevel ?? 'info',
                logSizeLimit: settings.logging?.logSizeLimit ?? 1048576,
                logRetentionDays: settings.logging?.logRetentionDays ?? 30,
            },
            update: {
                branch: settings.update?.branch ?? 'master',
                autoUpdateEnabled: settings.update?.autoUpdateEnabled ?? false,
                mechanicsEnabled: settings.update?.mechanicsEnabled ?? false,
                updateScriptPath: settings.update?.updateScriptPath ?? '',
            },
        });
    }, [form, settings]);
    const updateMutation = useMutation({
        mutationFn: (values) => settingsApi.update(toPayload(values)),
        onSuccess: next => {
            queryClient.setQueryData(['settings'], next);
        },
    });
    const submitSettings = form.handleSubmit(values => {
        updateMutation.mutate(values);
    });
    const logSizeBytes = form.watch('logging.logSizeLimit');
    const logSizeMb = (logSizeBytes ?? 0) / 1048576;
    useEffect(() => {
        return addShortcutSaveListener(() => {
            void submitSettings();
        });
    }, [submitSettings]);
    if (isPending) {
        return _jsx("div", { className: "rounded-md border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary", children: "Loading general settings\u2026" });
    }
    if (isError) {
        return (_jsxs("section", { className: "space-y-3", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "General Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Host, security, logging, update, and general configuration." })] }), _jsxs("div", { className: "rounded-md border border-status-error/50 bg-surface-danger p-4 text-sm text-text-primary", children: [_jsxs("p", { children: ["Could not load settings: ", error instanceof Error ? error.message : 'Unknown error'] }), _jsx("button", { type: "button", className: "mt-3 rounded-sm border border-border-subtle px-3 py-1 text-xs", onClick: () => void refetch(), children: "Retry" })] })] }));
    }
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "General Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Host, security, logging, update, and general configuration." })] }), _jsxs("form", { className: "space-y-4", onSubmit: submitSettings, children: [_jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Host Configuration" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostPort", children: [_jsx("span", { children: "Port" }), _jsx("input", { id: "hostPort", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('host.port', { valueAsNumber: true }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostBindAddress", children: [_jsx("span", { children: "Bind Address" }), _jsx("input", { id: "hostBindAddress", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "* or 0.0.0.0", ...form.register('host.bindAddress') })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostUrlBase", children: [_jsx("span", { children: "URL Base" }), _jsx("input", { id: "hostUrlBase", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "/mediarr", ...form.register('host.urlBase') })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostSslPort", children: [_jsx("span", { children: "SSL Port" }), _jsx("input", { id: "hostSslPort", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('host.sslPort', { valueAsNumber: true }) })] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('host.enableSsl') }), "Enable SSL"] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostSslCertPath", children: [_jsx("span", { children: "SSL Certificate Path" }), _jsx("input", { id: "hostSslCertPath", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('host.sslCertPath') })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "hostSslKeyPath", children: [_jsx("span", { children: "SSL Key Path" }), _jsx("input", { id: "hostSslKeyPath", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('host.sslKeyPath') })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Security" }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('security.authenticationRequired') }), "Authentication Required"] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "securityAuthenticationMethod", children: [_jsx("span", { children: "Authentication Method" }), _jsxs("select", { id: "securityAuthenticationMethod", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('security.authenticationMethod'), children: [_jsx("option", { value: "none", children: "None" }), _jsx("option", { value: "basic", children: "Basic (External)" }), _jsx("option", { value: "form", children: "Form (Built-in)" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "securityApiKey", children: [_jsx("span", { children: "API Key" }), _jsx("input", { id: "securityApiKey", type: "password", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('security.apiKey') })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Logging" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "loggingLogLevel", children: [_jsx("span", { children: "Log Level" }), _jsxs("select", { id: "loggingLogLevel", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('logging.logLevel'), children: [_jsx("option", { value: "trace", children: "Trace" }), _jsx("option", { value: "debug", children: "Debug" }), _jsx("option", { value: "info", children: "Info" }), _jsx("option", { value: "warn", children: "Warning" }), _jsx("option", { value: "error", children: "Error" }), _jsx("option", { value: "fatal", children: "Fatal" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "loggingLogSizeLimit", children: [_jsx("span", { children: "Log Size Limit (MB)" }), _jsx("input", { id: "loggingLogSizeLimit", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: logSizeMb, onChange: (e) => {
                                                    const mb = Number.parseFloat(e.target.value);
                                                    form.setValue('logging.logSizeLimit', (Number.isNaN(mb) ? 0 : mb) * 1048576);
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "loggingLogRetentionDays", children: [_jsx("span", { children: "Retention (Days)" }), _jsx("input", { id: "loggingLogRetentionDays", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('logging.logRetentionDays', { valueAsNumber: true }) })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Updates" }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('update.autoUpdateEnabled') }), "Enable Automatic Updates"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('update.mechanicsEnabled') }), "Enable Update Mechanics"] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "updateBranch", children: [_jsx("span", { children: "Update Branch" }), _jsxs("select", { id: "updateBranch", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('update.branch'), children: [_jsx("option", { value: "master", children: "Master (Stable)" }), _jsx("option", { value: "develop", children: "Develop (Testing)" }), _jsx("option", { value: "phantom", children: "Phantom (Nightly)" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "updateScriptPath", children: [_jsx("span", { children: "Update Script Path" }), _jsx("input", { id: "updateScriptPath", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('update.updateScriptPath') })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Torrent Limits" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "maxActiveDownloads", children: [_jsx("span", { children: "Max Active Downloads" }), _jsx("input", { id: "maxActiveDownloads", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('torrentLimits.maxActiveDownloads', { valueAsNumber: true }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "maxActiveSeeds", children: [_jsx("span", { children: "Max Active Seeds" }), _jsx("input", { id: "maxActiveSeeds", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('torrentLimits.maxActiveSeeds', { valueAsNumber: true }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "globalDownloadLimitKbps", children: [_jsx("span", { children: "Global Download Limit (KB/s)" }), _jsx("input", { id: "globalDownloadLimitKbps", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('torrentLimits.globalDownloadLimitKbps', {
                                                    setValueAs: value => (value === '' ? null : Number(value)),
                                                }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "globalUploadLimitKbps", children: [_jsx("span", { children: "Global Upload Limit (KB/s)" }), _jsx("input", { id: "globalUploadLimitKbps", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('torrentLimits.globalUploadLimitKbps', {
                                                    setValueAs: value => (value === '' ? null : Number(value)),
                                                }) })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Scheduler" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "rssSyncMinutes", children: [_jsx("span", { children: "RSS Sync (minutes)" }), _jsx("input", { id: "rssSyncMinutes", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('schedulerIntervals.rssSyncMinutes', { valueAsNumber: true }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "availabilityCheckMinutes", children: [_jsx("span", { children: "Availability Check (minutes)" }), _jsx("input", { id: "availabilityCheckMinutes", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('schedulerIntervals.availabilityCheckMinutes', { valueAsNumber: true }) })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "torrentMonitoringSeconds", children: [_jsx("span", { children: "Torrent Monitor (seconds)" }), _jsx("input", { id: "torrentMonitoringSeconds", type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('schedulerIntervals.torrentMonitoringSeconds', { valueAsNumber: true }) })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Visibility & API Keys" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('pathVisibility.showDownloadPath') }), "Show download path in tables"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('pathVisibility.showMediaPath') }), "Show media path in tables"] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "tmdbApiKey", children: [_jsx("span", { children: "TMDB API Key" }), _jsx("input", { id: "tmdbApiKey", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('apiKeys.tmdbApiKey') })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "openSubtitlesApiKey", children: [_jsx("span", { children: "OpenSubtitles API Key" }), _jsx("input", { id: "openSubtitlesApiKey", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('apiKeys.openSubtitlesApiKey') })] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "submit", disabled: updateMutation.isPending, className: "rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse disabled:opacity-60", children: updateMutation.isPending ? 'Saving…' : 'Save General Settings' }), updateMutation.isSuccess ? _jsx("span", { className: "text-xs text-status-completed", children: "Saved." }) : null, updateMutation.isError ? (_jsxs("span", { className: "text-xs text-status-error", children: ["Save failed: ", updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'] })) : null] })] })] }));
}
//# sourceMappingURL=page.js.map