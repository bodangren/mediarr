'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/primitives/Alert';
import { Button } from '@/components/primitives/Button';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
const EMPTY_FORM = {
    name: '',
    type: 'Sonarr',
    baseUrl: '',
    apiKey: '',
    syncCategories: [],
    tags: [],
};
function parseNumberList(raw) {
    return raw
        .split(',')
        .map((token) => Number.parseInt(token.trim(), 10))
        .filter((value) => Number.isFinite(value));
}
function parseStringList(raw) {
    return raw
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
}
export default function SettingsApplicationsPage() {
    const api = useMemo(() => getApiClients(), []);
    const queryClient = useQueryClient();
    const { pushToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [categoriesText, setCategoriesText] = useState('');
    const [tagsText, setTagsText] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);
    const applicationsQuery = useApiQuery({
        queryKey: queryKeys.applications(),
        queryFn: () => api.applicationsApi.list(),
    });
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (editing) {
                return api.applicationsApi.update(editing.id, form);
            }
            return api.applicationsApi.create(form);
        },
        onSuccess: () => {
            setIsModalOpen(false);
            setEditing(null);
            setForm(EMPTY_FORM);
            setCategoriesText('');
            setTagsText('');
            void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
            pushToast({
                title: editing ? 'Application updated' : 'Application created',
                variant: 'success',
            });
        },
        onError: (error) => {
            pushToast({
                title: 'Save failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const testMutation = useMutation({
        mutationFn: (id) => api.applicationsApi.test(id),
        onSuccess: (result) => {
            pushToast({
                title: result.success ? 'Connection successful' : 'Connection failed',
                message: result.message,
                variant: result.success ? 'success' : 'error',
            });
        },
        onError: (error) => {
            pushToast({
                title: 'Test failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const syncAllMutation = useMutation({
        mutationFn: () => api.applicationsApi.syncAll(),
        onSuccess: (result) => {
            pushToast({
                title: result.success ? 'Sync completed' : 'Sync completed with failures',
                message: result.message,
                variant: result.success ? 'success' : 'warning',
            });
        },
        onError: (error) => {
            pushToast({
                title: 'Sync failed',
                message: error.message,
                variant: 'error',
            });
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => api.applicationsApi.remove(id),
        onSuccess: () => {
            setPendingDelete(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
            pushToast({ title: 'Application deleted', variant: 'success' });
        },
        onError: (error) => {
            pushToast({ title: 'Delete failed', message: error.message, variant: 'error' });
        },
    });
    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setCategoriesText('');
        setTagsText('');
        setIsModalOpen(true);
    };
    const openEdit = (application) => {
        setEditing(application);
        setForm({
            name: application.name,
            type: application.type,
            baseUrl: application.baseUrl,
            apiKey: application.apiKey,
            syncCategories: application.syncCategories,
            tags: application.tags,
        });
        setCategoriesText(application.syncCategories.join(', '));
        setTagsText(application.tags.join(', '));
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setEditing(null);
        setForm(EMPTY_FORM);
        setCategoriesText('');
        setTagsText('');
    };
    const canSave = form.name.trim().length > 0
        && form.baseUrl.trim().length > 0
        && form.apiKey.trim().length > 0;
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Applications" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage Sonarr and Radarr application integrations, test connectivity, and sync indexers." })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { onClick: openCreate, children: "Add Application" }), _jsx(Button, { variant: "secondary", onClick: () => syncAllMutation.mutate(), disabled: syncAllMutation.isPending, children: syncAllMutation.isPending ? 'Syncing...' : 'Sync All' })] }), applicationsQuery.isPending ? (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4 text-sm text-text-secondary", children: "Loading applications..." })) : null, applicationsQuery.isError ? (_jsx(Alert, { variant: "danger", children: _jsxs("p", { children: ["Could not load applications: ", applicationsQuery.error?.message] }) })) : null, applicationsQuery.data && applicationsQuery.data.length === 0 ? (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No applications configured yet." }) })) : null, applicationsQuery.data && applicationsQuery.data.length > 0 ? (_jsx("div", { className: "space-y-2", children: applicationsQuery.data.map((application) => (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: application.name }), _jsxs("p", { className: "text-xs text-text-secondary", children: [application.type, " - ", application.baseUrl] }), _jsxs("p", { className: "text-xs text-text-muted", children: ["Categories: ", application.syncCategories.join(', ') || 'All', " | Tags: ", application.tags.join(', ') || 'None'] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", className: "text-xs", onClick: () => testMutation.mutate(application.id), children: "Test" }), _jsx(Button, { variant: "secondary", className: "text-xs", onClick: () => openEdit(application), children: "Edit" }), _jsx(Button, { variant: "danger", className: "text-xs", onClick: () => setPendingDelete(application), children: "Delete" })] })] }) }, application.id))) })) : null, _jsxs(Modal, { isOpen: isModalOpen, ariaLabel: "Application modal", onClose: closeModal, maxWidthClassName: "max-w-xl", children: [_jsx(ModalHeader, { title: editing ? 'Edit Application' : 'Add Application', onClose: closeModal }), _jsx(ModalBody, { children: _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: form.name, onChange: (event) => setForm((current) => ({ ...current, name: event.target.value })) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Type" }), _jsxs("select", { className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: form.type, onChange: (event) => setForm((current) => ({
                                                ...current,
                                                type: event.target.value,
                                            })), children: [_jsx("option", { value: "Sonarr", children: "Sonarr" }), _jsx("option", { value: "Radarr", children: "Radarr" })] })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Base URL" }), _jsx("input", { type: "url", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: form.baseUrl, onChange: (event) => setForm((current) => ({ ...current, baseUrl: event.target.value })) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "API Key" }), _jsx("input", { type: "password", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: form.apiKey, onChange: (event) => setForm((current) => ({ ...current, apiKey: event.target.value })) })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Sync Categories (comma separated)" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: categoriesText, onChange: (event) => {
                                                const value = event.target.value;
                                                setCategoriesText(value);
                                                setForm((current) => ({ ...current, syncCategories: parseNumberList(value) }));
                                            }, placeholder: "2000, 5000" })] }), _jsxs("label", { className: "grid gap-1 text-sm", children: [_jsx("span", { children: "Tags (comma separated)" }), _jsx("input", { type: "text", className: "rounded-sm border border-border-subtle bg-surface-0 px-3 py-2", value: tagsText, onChange: (event) => {
                                                const value = event.target.value;
                                                setTagsText(value);
                                                setForm((current) => ({ ...current, tags: parseStringList(value) }));
                                            }, placeholder: "movies, public" })] })] }) }), _jsxs(ModalFooter, { children: [_jsx(Button, { variant: "secondary", onClick: closeModal, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => saveMutation.mutate(), disabled: !canSave || saveMutation.isPending, children: saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create' })] })] }), _jsx(ConfirmModal, { isOpen: pendingDelete !== null, title: "Delete application", description: `Delete ${pendingDelete?.name ?? 'application'}?`, onCancel: () => setPendingDelete(null), onConfirm: () => {
                    if (pendingDelete) {
                        deleteMutation.mutate(pendingDelete.id);
                    }
                }, confirmLabel: "Delete", confirmVariant: "danger" })] }));
}
//# sourceMappingURL=page.js.map