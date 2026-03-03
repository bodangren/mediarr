'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { SettingsForm } from './settings-form';
const SETTINGS_LINKS = [
    { href: '/settings/indexers', label: 'Indexers' },
    { href: '/settings/downloadclients', label: 'Download Clients' },
    { href: '/settings/general', label: 'General' },
    { href: '/settings/ui', label: 'UI' },
];
export default function SettingsPage() {
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage global application preferences and keys." })] }), _jsx("nav", { "aria-label": "Settings sections", className: "flex flex-wrap gap-2", children: SETTINGS_LINKS.map(item => (_jsx(Link, { href: item.href, className: "rounded-sm border border-border-subtle bg-surface-1 px-3 py-1 text-sm text-text-primary hover:bg-surface-2", children: item.label }, item.href))) }), _jsx(SettingsForm, {})] }));
}
//# sourceMappingURL=page.js.map