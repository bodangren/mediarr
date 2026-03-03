'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal } from '@/components/primitives/Modal';
import { CustomFormatModal } from '@/components/settings/CustomFormatModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import { CONDITION_TYPES } from '@/types/customFormat';
function getConditionTypeLabel(type) {
    const found = CONDITION_TYPES.find(ct => ct.value === type);
    return found?.label ?? type;
}
function formatConditionSummary(conditions) {
    if (conditions.length === 0)
        return 'No conditions';
    if (conditions.length === 1) {
        const c = conditions[0];
        return `${getConditionTypeLabel(c.type)}: ${c.value}`;
    }
    return `${conditions.length} conditions`;
}
export default function CustomFormatsPage() {
    const { pushToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editFormat, setEditFormat] = useState(undefined);
    const [deleteFormat, setDeleteFormat] = useState(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const { data: formats = [], isLoading, error, refetch } = useApiQuery({
        queryKey: queryKeys.customFormats(),
        queryFn: () => getApiClients().customFormatApi.list(),
    });
    const handleAddFormat = async (input) => {
        setIsSaving(true);
        try {
            await getApiClients().customFormatApi.create(input);
            pushToast({
                title: 'Success',
                message: 'Custom format created successfully',
                variant: 'success',
            });
            setIsModalOpen(false);
            refetch();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create custom format';
            pushToast({
                title: 'Error',
                message,
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleEditFormat = async (input) => {
        if (!editFormat)
            return;
        setIsSaving(true);
        try {
            await getApiClients().customFormatApi.update(editFormat.id, input);
            pushToast({
                title: 'Success',
                message: 'Custom format updated successfully',
                variant: 'success',
            });
            setIsModalOpen(false);
            setEditFormat(undefined);
            refetch();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update custom format';
            pushToast({
                title: 'Error',
                message,
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleDeleteFormat = async () => {
        if (!deleteFormat)
            return;
        setIsSaving(true);
        try {
            await getApiClients().customFormatApi.delete(deleteFormat.id);
            pushToast({
                title: 'Success',
                message: 'Custom format deleted successfully',
                variant: 'success',
            });
            setDeleteFormat(undefined);
            refetch();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete custom format';
            pushToast({
                title: 'Error',
                message,
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const openAddModal = () => {
        setEditFormat(undefined);
        setIsModalOpen(true);
    };
    const openEditModal = (format) => {
        setEditFormat(format);
        setIsModalOpen(true);
    };
    const closeModals = () => {
        setIsModalOpen(false);
        setEditFormat(undefined);
        setDeleteFormat(undefined);
    };
    return (_jsxs("section", { className: "space-y-5", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Custom Formats" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Create custom formats to match releases based on conditions and assign scores for quality ranking." })] }), _jsx("div", { children: _jsx(Button, { variant: "primary", onClick: openAddModal, children: "Add Custom Format" }) }), error && (_jsx(Alert, { variant: "danger", children: _jsx("p", { children: "Failed to load custom formats. Please try again later." }) })), isLoading && (_jsx("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: _jsx("p", { className: "text-sm text-text-secondary", children: "Loading custom formats..." }) })), !isLoading && !error && formats.length === 0 && (_jsx(Alert, { variant: "info", children: _jsx("p", { children: "No custom formats configured. Click \"Add Custom Format\" to create one." }) })), !isLoading && !error && formats.length > 0 && (_jsx("div", { className: "space-y-3", children: formats.map(format => (_jsxs("div", { className: "rounded-sm border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-base font-semibold text-text-primary", children: format.name }), format.includeCustomFormatWhenRenaming && (_jsx("span", { className: "text-xs bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded", children: "Renaming" }))] }), _jsxs("div", { className: "mt-2 space-y-1 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Conditions:" }), ' ', _jsx("span", { className: "text-text-secondary", children: formatConditionSummary(format.conditions) })] }), format.scores.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-text-muted", children: "Quality Profile Scores:" }), ' ', _jsx("span", { className: "text-text-secondary", children: format.scores.map(s => `Profile ${s.qualityProfileId}: ${s.score}`).join(', ') })] }))] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => openEditModal(format), className: "text-sm", children: "Edit" }), _jsx(Button, { variant: "danger", onClick: () => setDeleteFormat(format), className: "text-sm", children: "Delete" })] })] }), format.conditions.length > 0 && (_jsxs("div", { className: "mt-3 pt-3 border-t border-border-subtle", children: [_jsx("p", { className: "text-xs text-text-muted mb-2", children: "Condition Details:" }), _jsx("div", { className: "flex flex-wrap gap-2", children: format.conditions.map((condition, idx) => (_jsxs("span", { className: "text-xs bg-surface-0 border border-border-subtle px-2 py-1 rounded", children: [condition.negate && _jsx("span", { className: "text-accent-warning", children: "!" }), getConditionTypeLabel(condition.type), condition.operator && (_jsx("span", { className: "text-text-muted ml-1", children: condition.operator === 'equals' ? '=' :
                                                    condition.operator === 'contains' ? '~' :
                                                        condition.operator === 'greaterThan' ? '>' :
                                                            condition.operator === 'lessThan' ? '<' :
                                                                condition.operator })), _jsx("span", { className: "text-accent-primary ml-1", children: typeof condition.value === 'number' && condition.type === 'size'
                                                    ? `${(condition.value / 1073741824).toFixed(1)}GB`
                                                    : String(condition.value) })] }, idx))) })] }))] }, format.id))) })), _jsx(CustomFormatModal, { isOpen: isModalOpen, onClose: closeModals, onSave: editFormat ? handleEditFormat : handleAddFormat, editFormat: editFormat, isLoading: isSaving }), deleteFormat && (_jsx(ConfirmModal, { isOpen: true, title: "Delete Custom Format", description: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { children: ["Are you sure you want to delete the custom format ", _jsx("strong", { children: deleteFormat.name }), "?"] }), _jsx("p", { className: "text-xs text-text-muted", children: "This action cannot be undone. Any quality profile score assignments will also be removed." })] }), onCancel: () => setDeleteFormat(undefined), onConfirm: handleDeleteFormat, cancelLabel: "Cancel", confirmLabel: "Delete Format", confirmVariant: "danger", isConfirming: isSaving }))] }));
}
//# sourceMappingURL=page.js.map