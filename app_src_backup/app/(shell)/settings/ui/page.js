'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_UI_PREFERENCES, applyUIPreferences, loadUIPreferences, saveUIPreferences, } from '@/lib/uiPreferences';
import { addShortcutSaveListener } from '@/lib/shortcuts';
export default function UiSettingsPage() {
    const [preferences, setPreferences] = useState(() => loadUIPreferences());
    const [saveState, setSaveState] = useState('idle');
    useEffect(() => {
        applyUIPreferences(preferences);
    }, [preferences]);
    const previewTimestamp = useMemo(() => new Date('2026-02-15T13:30:00.000Z'), []);
    const previewDate = useMemo(() => {
        if (preferences.showRelativeDates && preferences.dateFormat === 'relative') {
            return '2 hours ago';
        }
        if (preferences.dateFormat === 'long') {
            return previewTimestamp.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
        }
        return previewTimestamp.toLocaleDateString();
    }, [preferences.dateFormat, preferences.showRelativeDates, previewTimestamp]);
    const previewTime = useMemo(() => {
        return previewTimestamp.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: preferences.timeFormat === '12h',
        });
    }, [preferences.timeFormat, previewTimestamp]);
    const save = useCallback(() => {
        saveUIPreferences(preferences);
        applyUIPreferences(preferences);
        setSaveState('saved');
    }, [preferences]);
    useEffect(() => {
        return addShortcutSaveListener(save);
    }, [save]);
    const reset = useCallback(() => {
        setPreferences(DEFAULT_UI_PREFERENCES);
        saveUIPreferences(DEFAULT_UI_PREFERENCES);
        applyUIPreferences(DEFAULT_UI_PREFERENCES);
        setSaveState('saved');
    }, []);
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "UI Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Theme, date/time format, and accessibility preferences." })] }), _jsxs("section", { className: "space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Appearance" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "themePreference", children: [_jsx("span", { children: "Theme" }), _jsxs("select", { id: "themePreference", value: preferences.theme, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", onChange: event => {
                                            const nextTheme = event.currentTarget.value;
                                            setPreferences(current => ({ ...current, theme: nextTheme }));
                                            setSaveState('idle');
                                        }, children: [_jsx("option", { value: "dark", children: "Dark" }), _jsx("option", { value: "light", children: "Light" }), _jsx("option", { value: "auto", children: "Auto (system)" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "colorImpairedMode", children: [_jsx("span", { children: "Color Impaired Mode" }), _jsxs("div", { className: "flex h-full items-center gap-2 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", children: [_jsx("input", { id: "colorImpairedMode", type: "checkbox", checked: preferences.colorImpairedMode, onChange: event => {
                                                    const nextChecked = event.currentTarget.checked;
                                                    setPreferences(current => ({ ...current, colorImpairedMode: nextChecked }));
                                                    setSaveState('idle');
                                                } }), _jsx("span", { children: "Enable accessibility-friendly status colors" })] })] })] })] }), _jsxs("section", { className: "space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Date & Time" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "dateFormatPreference", children: [_jsx("span", { children: "Date Format" }), _jsxs("select", { id: "dateFormatPreference", value: preferences.dateFormat, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", onChange: event => {
                                            const nextDateFormat = event.currentTarget.value;
                                            setPreferences(current => ({ ...current, dateFormat: nextDateFormat }));
                                            setSaveState('idle');
                                        }, children: [_jsx("option", { value: "relative", children: "Relative" }), _jsx("option", { value: "short", children: "Short" }), _jsx("option", { value: "long", children: "Long" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", htmlFor: "timeFormatPreference", children: [_jsx("span", { children: "Time Format" }), _jsxs("select", { id: "timeFormatPreference", value: preferences.timeFormat, className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", onChange: event => {
                                            const nextTimeFormat = event.currentTarget.value;
                                            setPreferences(current => ({ ...current, timeFormat: nextTimeFormat }));
                                            setSaveState('idle');
                                        }, children: [_jsx("option", { value: "24h", children: "24-hour" }), _jsx("option", { value: "12h", children: "12-hour" })] })] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: preferences.showRelativeDates, onChange: event => {
                                    const nextChecked = event.currentTarget.checked;
                                    setPreferences(current => ({ ...current, showRelativeDates: nextChecked }));
                                    setSaveState('idle');
                                } }), "Show relative dates where available"] }), _jsxs("div", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3 text-xs text-text-secondary", children: [_jsx("p", { className: "font-semibold text-text-primary", children: "Preview" }), _jsxs("p", { children: ["Date: ", _jsx("span", { className: "font-mono", children: previewDate })] }), _jsxs("p", { children: ["Time: ", _jsx("span", { className: "font-mono", children: previewTime })] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse", onClick: save, children: "Save UI Settings" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-4 py-2 text-sm", onClick: reset, children: "Reset to Defaults" }), saveState === 'saved' ? _jsx("span", { className: "text-xs text-status-completed", children: "Saved." }) : null] })] }));
}
//# sourceMappingURL=page.js.map