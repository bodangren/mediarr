'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { getApiClients } from '@/lib/api/client';
import { useLocalStorage } from '@/lib/hooks';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
const DEFAULT_CATEGORIES = [
    { id: 1, name: 'Movies (HD)', description: 'High definition movies', minSize: 10737418240, maxSize: 53687091200 },
    { id: 2, name: 'Movies (SD)', description: 'Standard definition movies', minSize: 734003200, maxSize: 10737418240 },
    { id: 3, name: 'TV Episodes (HD)', description: 'High definition TV episodes', minSize: 536870912, maxSize: 4294967296 },
    { id: 4, name: 'TV Episodes (SD)', description: 'Standard definition TV episodes', minSize: 73400320, maxSize: 536870912 },
];
function formatBytes(bytes) {
    if (bytes === undefined || bytes === null) {
        return 'Unlimited';
    }
    const gb = bytes / 1073741824;
    if (gb >= 1) {
        return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / 1048576;
    if (mb >= 1) {
        return `${mb.toFixed(0)} MB`;
    }
    return `${bytes} B`;
}
export default function SettingsIndexersPage() {
    const api = useMemo(() => getApiClients(), []);
    const [localProxies, setLocalProxies] = useLocalStorage('mediarr:indexer-proxies', []);
    const [localCategories, setLocalCategories] = useLocalStorage('mediarr:indexer-categories', DEFAULT_CATEGORIES);
    const [isAddProxyOpen, setIsAddProxyOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [hasAttemptedProxyMigration, setHasAttemptedProxyMigration] = useState(false);
    const [hasAttemptedCategoryMigration, setHasAttemptedCategoryMigration] = useState(false);
    // Form draft state for proxies
    const [proxyDraft, setProxyDraft] = useState({
        name: '',
        type: 'http',
        host: '',
        port: '8080',
    });
    // Form draft state for categories
    const [categoryDraft, setCategoryDraft] = useState({
        name: '',
        description: '',
        minSize: '',
        maxSize: '',
    });
    const supportsProxyApi = typeof api.proxySettingsApi?.list === 'function';
    const supportsCategoryApi = typeof api.categorySettingsApi?.list === 'function';
    const proxiesQuery = useApiQuery({
        queryKey: queryKeys.settingsProxies(),
        queryFn: () => api.proxySettingsApi.list(),
        enabled: supportsProxyApi,
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const categoriesQuery = useApiQuery({
        queryKey: queryKeys.settingsCategories(),
        queryFn: () => api.categorySettingsApi.list(),
        enabled: supportsCategoryApi,
        staleTimeKind: 'list',
        isEmpty: rows => rows.length === 0,
    });
    const createProxyMutation = useMutation({
        mutationFn: (payload) => api.proxySettingsApi.create({
            name: payload.name,
            type: payload.type,
            host: payload.host,
            port: payload.port,
            username: payload.username,
            password: payload.password,
            enabled: payload.enabled,
        }),
    });
    const updateProxyMutation = useMutation({
        mutationFn: ({ id, payload }) => api.proxySettingsApi.update(id, {
            name: payload.name,
            type: payload.type,
            host: payload.host,
            port: payload.port,
            username: payload.username,
            password: payload.password,
            enabled: payload.enabled,
        }),
    });
    const deleteProxyMutation = useMutation({
        mutationFn: (id) => api.proxySettingsApi.remove(id),
    });
    const createCategoryMutation = useMutation({
        mutationFn: (payload) => api.categorySettingsApi.create({
            name: payload.name,
            description: payload.description,
            minSize: payload.minSize,
            maxSize: payload.maxSize,
        }),
    });
    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => api.categorySettingsApi.remove(id),
    });
    const proxies = supportsProxyApi ? (proxiesQuery.data ?? []) : localProxies;
    const categories = supportsCategoryApi ? (categoriesQuery.data ?? []) : localCategories;
    useEffect(() => {
        if (!supportsProxyApi || !proxiesQuery.isSuccess || hasAttemptedProxyMigration) {
            return;
        }
        setHasAttemptedProxyMigration(true);
        if (proxiesQuery.data.length > 0 || typeof window === 'undefined') {
            return;
        }
        const migrationKey = 'mediarr:indexer-proxies:migrated';
        if (window.localStorage.getItem(migrationKey) === '1') {
            return;
        }
        const raw = window.localStorage.getItem('mediarr:indexer-proxies');
        if (!raw) {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        void (async () => {
            for (const entry of parsed) {
                if (!entry || typeof entry !== 'object') {
                    continue;
                }
                const source = entry;
                const name = source.name?.trim();
                const host = source.host?.trim() || source.hostname?.trim();
                const port = typeof source.port === 'number' ? source.port : 8080;
                const type = source.type ?? 'http';
                if (!name || !host) {
                    continue;
                }
                try {
                    await api.proxySettingsApi.create({
                        name,
                        type,
                        host,
                        port,
                        username: source.username,
                        password: source.password,
                        enabled: source.enabled ?? true,
                    });
                }
                catch {
                    // Best-effort migration: skip duplicates/invalid rows.
                }
            }
            window.localStorage.setItem(migrationKey, '1');
            void proxiesQuery.refetch();
        })();
    }, [
        api.proxySettingsApi,
        hasAttemptedProxyMigration,
        proxiesQuery,
        supportsProxyApi,
    ]);
    useEffect(() => {
        if (!supportsCategoryApi || !categoriesQuery.isSuccess || hasAttemptedCategoryMigration) {
            return;
        }
        setHasAttemptedCategoryMigration(true);
        if (categoriesQuery.data.length > 0 || typeof window === 'undefined') {
            return;
        }
        const migrationKey = 'mediarr:indexer-categories:migrated';
        if (window.localStorage.getItem(migrationKey) === '1') {
            return;
        }
        const raw = window.localStorage.getItem('mediarr:indexer-categories');
        if (!raw) {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
            window.localStorage.setItem(migrationKey, '1');
            return;
        }
        void (async () => {
            for (const entry of parsed) {
                if (!entry || typeof entry !== 'object') {
                    continue;
                }
                const source = entry;
                const name = source.name?.trim();
                if (!name) {
                    continue;
                }
                try {
                    await api.categorySettingsApi.create({
                        name,
                        description: source.description,
                        minSize: source.minSize,
                        maxSize: source.maxSize,
                    });
                }
                catch {
                    // Best-effort migration: skip duplicates/invalid rows.
                }
            }
            window.localStorage.setItem(migrationKey, '1');
            void categoriesQuery.refetch();
        })();
    }, [
        api.categorySettingsApi,
        categoriesQuery,
        hasAttemptedCategoryMigration,
        supportsCategoryApi,
    ]);
    const handleOpenAddProxy = () => {
        setProxyDraft({ name: '', type: 'http', host: '', port: '8080' });
        setIsAddProxyOpen(true);
    };
    const handleOpenAddCategory = () => {
        setCategoryDraft({ name: '', description: '', minSize: '', maxSize: '' });
        setIsAddCategoryOpen(true);
    };
    const handleAddProxy = async () => {
        // Validate minimum required fields
        if (!proxyDraft.name.trim() || !proxyDraft.host.trim() || !proxyDraft.port.trim()) {
            return;
        }
        const newProxy = {
            name: proxyDraft.name.trim(),
            type: proxyDraft.type,
            host: proxyDraft.host.trim(),
            port: Number.parseInt(proxyDraft.port, 10) || 8080,
            enabled: true,
        };
        if (supportsProxyApi) {
            await createProxyMutation.mutateAsync(newProxy);
            await proxiesQuery.refetch();
        }
        else {
            setLocalProxies(current => [...current, { id: Date.now(), ...newProxy }]);
        }
        setIsAddProxyOpen(false);
        setProxyDraft({ name: '', type: 'http', host: '', port: '8080' });
    };
    const handleAddCategory = async () => {
        // Validate minimum required fields
        if (!categoryDraft.name.trim()) {
            return;
        }
        const newCategory = {
            name: categoryDraft.name.trim(),
            description: categoryDraft.description.trim() || undefined,
            minSize: categoryDraft.minSize ? parseFloat(categoryDraft.minSize) * 1073741824 : undefined,
            maxSize: categoryDraft.maxSize ? parseFloat(categoryDraft.maxSize) * 1073741824 : undefined,
        };
        if (supportsCategoryApi) {
            await createCategoryMutation.mutateAsync(newCategory);
            await categoriesQuery.refetch();
        }
        else {
            setLocalCategories(current => [...current, { id: Date.now(), ...newCategory }]);
        }
        setIsAddCategoryOpen(false);
        setCategoryDraft({ name: '', description: '', minSize: '', maxSize: '' });
    };
    const handleDeleteProxy = (id) => {
        if (supportsProxyApi) {
            void (async () => {
                await deleteProxyMutation.mutateAsync(id);
                await proxiesQuery.refetch();
            })();
            return;
        }
        setLocalProxies(current => current.filter(p => p.id !== id));
    };
    const handleDeleteCategory = (id) => {
        if (supportsCategoryApi) {
            void (async () => {
                await deleteCategoryMutation.mutateAsync(id);
                await categoriesQuery.refetch();
            })();
            return;
        }
        setLocalCategories(current => current.filter(c => c.id !== id));
    };
    const handleToggleProxyEnabled = (id, enabled) => {
        if (supportsProxyApi) {
            void (async () => {
                await updateProxyMutation.mutateAsync({ id, payload: { enabled } });
                await proxiesQuery.refetch();
            })();
            return;
        }
        setLocalProxies(current => current.map(p => (p.id === id ? { ...p, enabled } : p)));
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Indexer Settings" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Configure indexer management, proxies, and categories." })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Indexer Management" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage your configured indexers, test connections, and configure settings." }), _jsx(Link, { href: "/indexers", children: _jsx(Button, { children: "Go to Indexer Management" }) })] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx(Alert, { variant: "info", children: _jsx("p", { className: "text-sm", children: supportsProxyApi
                                ? 'Proxy configuration is stored in the Mediarr database.'
                                : 'Proxy configuration is stored locally in this browser.' }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Indexer Proxies" }), _jsx(Button, { variant: "secondary", onClick: handleOpenAddProxy, children: "Add Proxy" })] }), isAddProxyOpen ? (_jsxs("div", { className: "space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsx("h3", { className: "text-sm font-medium", children: "Add New Proxy" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Proxy Name" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., HTTP Proxy 1", value: proxyDraft.name, onChange: event => {
                                                    setProxyDraft(current => ({ ...current, name: event.target.value }));
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Proxy Type" }), _jsxs("select", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", value: proxyDraft.type, onChange: event => {
                                                    setProxyDraft(current => ({ ...current, type: event.target.value }));
                                                }, children: [_jsx("option", { value: "http", children: "HTTP" }), _jsx("option", { value: "socks4", children: "SOCKS4" }), _jsx("option", { value: "socks5", children: "SOCKS5" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Host" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., 192.168.1.1 or proxy.example.com", value: proxyDraft.host, onChange: event => {
                                                    setProxyDraft(current => ({ ...current, host: event.target.value }));
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Port" }), _jsx("input", { type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., 8080", value: proxyDraft.port, onChange: event => {
                                                    setProxyDraft(current => ({ ...current, port: event.target.value }));
                                                } })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "primary", onClick: () => {
                                            void handleAddProxy();
                                        }, children: "Add Proxy" }), _jsx(Button, { variant: "secondary", onClick: () => setIsAddProxyOpen(false), children: "Cancel" })] })] })) : null, proxies.length === 0 ? (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No proxies configured. Click Add Proxy to create one." }) })) : (_jsx("div", { className: "space-y-2", children: proxies.map(proxy => (_jsxs("div", { className: "flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: proxy.name || 'Unnamed Proxy' }), _jsxs("p", { className: "text-xs text-text-secondary", children: [proxy.type.toUpperCase(), " - ", proxy.host, ":", proxy.port] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: proxy.enabled, onChange: event => handleToggleProxyEnabled(proxy.id, event.target.checked) }), "Enabled"] }), _jsx(Button, { variant: "danger", onClick: () => handleDeleteProxy(proxy.id), className: "text-xs", children: "Delete" })] })] }, proxy.id))) }))] }), _jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsx(Alert, { variant: "info", children: _jsx("p", { className: "text-sm", children: supportsCategoryApi
                                ? 'Category configuration is stored in the Mediarr database.'
                                : 'Category configuration is stored locally in this browser.' }) }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-text-secondary", children: "Indexer Categories" }), _jsx(Button, { variant: "secondary", onClick: handleOpenAddCategory, children: "Add Category" })] }), isAddCategoryOpen ? (_jsxs("div", { className: "space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsx("h3", { className: "text-sm font-medium", children: "Add New Category" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Category Name" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "e.g., Movies 4K", value: categoryDraft.name, onChange: event => {
                                                    setCategoryDraft(current => ({ ...current, name: event.target.value }));
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Description" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "Optional description", value: categoryDraft.description, onChange: event => {
                                                    setCategoryDraft(current => ({ ...current, description: event.target.value }));
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Minimum Size (GB)" }), _jsx("input", { type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "Optional minimum size", step: 0.1, value: categoryDraft.minSize, onChange: event => {
                                                    setCategoryDraft(current => ({ ...current, minSize: event.target.value }));
                                                } })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Maximum Size (GB)" }), _jsx("input", { type: "number", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm", placeholder: "Optional maximum size", step: 0.1, value: categoryDraft.maxSize, onChange: event => {
                                                    setCategoryDraft(current => ({ ...current, maxSize: event.target.value }));
                                                } })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "primary", onClick: () => {
                                            void handleAddCategory();
                                        }, children: "Add Category" }), _jsx(Button, { variant: "secondary", onClick: () => setIsAddCategoryOpen(false), children: "Cancel" })] })] })) : null, _jsx("div", { className: "space-y-2", children: categories.map(category => (_jsxs("div", { className: "flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 p-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: category.name }), category.description ? _jsx("p", { className: "text-xs text-text-secondary", children: category.description }) : null, _jsxs("p", { className: "text-xs text-text-muted", children: ["Size: ", formatBytes(category.minSize), " - ", formatBytes(category.maxSize)] })] }), _jsx(Button, { variant: "danger", onClick: () => handleDeleteCategory(category.id), className: "text-xs", children: "Delete" })] }, category.id))) })] })] }));
}
//# sourceMappingURL=page.js.map