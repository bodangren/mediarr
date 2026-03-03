'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { addShortcutSaveListener } from '@/lib/shortcuts';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { Alert } from '@/components/primitives/Alert';
// Subtitles-specific settings schema
const subtitlesSettingsSchema = z.object({
    autoDownload: z.boolean(),
    downloadOnUpgrade: z.boolean(),
    minimumScore: z.number().min(0).max(100),
    maxResultsPerLanguage: z.number().min(1).max(100),
    useCustomSubtitleFolder: z.boolean(),
    customSubtitleFolder: z.string().optional(),
    subtitleFolderMode: z.enum(['video', 'custom']),
    fileNamingFormat: z.string(),
    defaultLanguageProfileId: z.number().optional(),
    useEmbeddedSubtitles: z.boolean(),
    ignoreEmbeddedForHi: z.boolean(),
});
const DEFAULT_VALUES = {
    autoDownload: true,
    downloadOnUpgrade: true,
    minimumScore: 60,
    maxResultsPerLanguage: 10,
    useCustomSubtitleFolder: false,
    customSubtitleFolder: '',
    subtitleFolderMode: 'video',
    fileNamingFormat: '{movie_name}.{language_code}.{extension}',
    defaultLanguageProfileId: undefined,
    useEmbeddedSubtitles: false,
    ignoreEmbeddedForHi: true,
};
export default function SubtitlesSettingsPage() {
    const [localSettings, setLocalSettings] = useLocalStorage('mediarr:subtitle-settings', DEFAULT_VALUES);
    const form = useForm({
        resolver: zodResolver(subtitlesSettingsSchema),
        defaultValues: localSettings,
    });
    const subtitleFolderMode = useWatch({ control: form.control, name: 'subtitleFolderMode' });
    // Fetch language profiles from API
    const { data: languageProfiles = [] } = useQuery({
        queryKey: queryKeys.languageProfiles(),
        queryFn: () => getApiClients().languageProfilesApi.listProfiles(),
        staleTime: 300_000, // 5 minutes
    });
    // Sync form values with localStorage
    useEffect(() => {
        form.reset(localSettings);
    }, [localSettings, form]);
    const submitSettings = form.handleSubmit(values => {
        setLocalSettings(values);
    });
    useEffect(() => {
        return addShortcutSaveListener(() => {
            void submitSettings();
        });
    }, [submitSettings]);
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Subtitle Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Configure automatic subtitle downloads and file handling." })] }), _jsx(Alert, { variant: "info", children: _jsx("span", { className: "text-sm", children: "Subtitle settings are stored locally in this browser." }) }), _jsxs("form", { className: "space-y-4", onSubmit: submitSettings, children: [_jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "General" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('autoDownload') }), _jsx("span", { children: "Download Automatically" })] }), _jsx("p", { className: "text-xs text-text-muted", children: "Automatically download subtitles when a new video file is detected." }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('downloadOnUpgrade') }), _jsx("span", { children: "Download on Upgrade" })] }), _jsx("p", { className: "text-xs text-text-muted", children: "Automatically search and download subtitles when an episode/movie is upgraded." }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "minimumScore", children: [_jsx("span", { children: "Minimum Score" }), _jsx("input", { id: "minimumScore", type: "number", min: "0", max: "100", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('minimumScore', { valueAsNumber: true }) }), _jsx("p", { className: "text-xs text-text-muted", children: "Only download subtitles with a score above this threshold." })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "maxResultsPerLanguage", children: [_jsx("span", { children: "Maximum Results Per Language" }), _jsx("input", { id: "maxResultsPerLanguage", type: "number", min: "1", max: "100", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('maxResultsPerLanguage', { valueAsNumber: true }) }), _jsx("p", { className: "text-xs text-text-muted", children: "Limit the number of subtitle candidates to download for each language." })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "File Settings" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "radio", ...form.register('subtitleFolderMode'), value: "video" }), _jsx("span", { children: "Save alongside video file" })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "radio", ...form.register('subtitleFolderMode'), value: "custom" }), _jsx("span", { children: "Save in custom folder" })] })] }), subtitleFolderMode === 'custom' && (_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "customSubtitleFolder", children: [_jsx("span", { children: "Custom Subtitle Folder" }), _jsx("input", { id: "customSubtitleFolder", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", placeholder: "/path/to/subtitles", ...form.register('customSubtitleFolder') }), _jsx("p", { className: "text-xs text-text-muted", children: "Absolute path where subtitle files will be saved." })] })), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "fileNamingFormat", children: [_jsx("span", { children: "File Naming Format" }), _jsx("input", { id: "fileNamingFormat", type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm font-mono", ...form.register('fileNamingFormat') }), _jsxs("p", { className: "text-xs text-text-muted", children: ["Available variables: ", '{movie_name}', ", ", '{series_name}', ", ", '{season}', ", ", '{episode}', ", ", '{language_code}', ", ", '{extension}'] })] })] })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Language Settings" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('useEmbeddedSubtitles') }), _jsx("span", { children: "Use Embedded Subtitles" })] }), _jsx("p", { className: "text-xs text-text-muted", children: "Extract and use subtitles embedded in video files." }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", ...form.register('ignoreEmbeddedForHi') }), _jsx("span", { children: "Ignore Embedded for Hearing Impaired" })] }), _jsx("p", { className: "text-xs text-text-muted", children: "Ignore embedded subtitles marked as hearing impaired." }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "defaultLanguageProfileId", children: [_jsx("span", { children: "Default Language Profile" }), _jsxs("select", { id: "defaultLanguageProfileId", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", ...form.register('defaultLanguageProfileId', { valueAsNumber: true }), children: [_jsx("option", { value: "", children: "Select a profile..." }), languageProfiles.map(profile => (_jsx("option", { value: profile.id, children: profile.name }, profile.id)))] }), _jsx("p", { className: "text-xs text-text-muted", children: "Default language profile to use for automatic downloads." })] })] })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsx("button", { type: "submit", className: "rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse disabled:opacity-60", children: "Save Subtitle Settings" }) })] })] }));
}
//# sourceMappingURL=page.js.map