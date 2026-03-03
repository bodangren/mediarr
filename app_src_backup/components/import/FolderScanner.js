'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Icon } from '@/components/primitives/Icon';
export function FolderScanner({ scanProgress, onScan, defaultPath = '/media/tv' }) {
    const [path, setPath] = useState(defaultPath);
    const isScanning = scanProgress.status === 'scanning';
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isScanning && path.trim()) {
            onScan(path.trim());
        }
    };
    return (_jsxs("div", { className: "rounded-lg border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Import Series from Disk" }), _jsx("p", { className: "mt-1 text-sm text-text-secondary", children: "Enter a folder path to scan for existing TV series. Detected series will be matched against metadata providers." }), _jsxs("form", { onSubmit: handleSubmit, className: "mt-4 flex gap-2", children: [_jsx("div", { className: "flex-1", children: _jsx("input", { type: "text", value: path, onChange: e => setPath(e.target.value), placeholder: "/path/to/tv/folder", disabled: isScanning, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm disabled:opacity-50", "aria-label": "Folder path to scan" }) }), _jsx(Button, { type: "submit", disabled: isScanning || !path.trim(), children: isScanning ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "refresh", label: "Scanning", className: "animate-spin" }), _jsx("span", { className: "ml-2", children: "Scanning..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "search", label: "Scan" }), _jsx("span", { className: "ml-2", children: "Scan Folder" })] })) })] }), isScanning && (_jsxs("div", { className: "mt-4 flex items-center gap-3 text-sm text-text-secondary", children: [_jsx("div", { className: "h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: "Scanning folder..." }), scanProgress.currentPath && (_jsx("p", { className: "text-xs", children: scanProgress.currentPath }))] })] })), scanProgress.status === 'error' && scanProgress.errorMessage && (_jsxs("div", { className: "mt-4 rounded-sm border border-status-error/40 bg-status-error/10 p-3 text-sm", children: [_jsx("p", { className: "font-semibold text-status-error", children: "Scan Error" }), _jsx("p", { className: "text-text-secondary", children: scanProgress.errorMessage })] }))] }));
}
//# sourceMappingURL=FolderScanner.js.map