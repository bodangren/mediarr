'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
const FIELD_OPTIONS = {
    series: [
        { value: 'monitored', label: 'Monitored' },
        { value: 'network', label: 'Network' },
        { value: 'genre', label: 'Genre' },
        { value: 'tag', label: 'Tag' },
        { value: 'rating', label: 'Rating' },
        { value: 'status', label: 'Status' },
    ],
    indexer: [
        { value: 'protocol', label: 'Protocol' },
        { value: 'enabled', label: 'Enabled' },
        { value: 'capability', label: 'Capability' },
        { value: 'priority', label: 'Priority' },
        { value: 'tag', label: 'Tag' },
    ],
};
const OPERATOR_OPTIONS = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Not contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
];
const BOOLEAN_VALUES = [
    { value: 'true', label: 'Enabled / True' },
    { value: 'false', label: 'Disabled / False' },
];
function isBooleanField(field) {
    return field === 'monitored' || field === 'enabled';
}
function isNumericField(field) {
    return field === 'rating' || field === 'priority';
}
function defaultFieldForTarget(targetType) {
    return targetType === 'indexer' ? 'protocol' : 'status';
}
function createCondition(targetType, field) {
    const resolvedField = field ?? defaultFieldForTarget(targetType);
    if (isBooleanField(resolvedField)) {
        return {
            field: resolvedField,
            operator: 'equals',
            value: true,
        };
    }
    if (isNumericField(resolvedField)) {
        return {
            field: resolvedField,
            operator: 'greaterThan',
            value: 0,
        };
    }
    return {
        field: resolvedField,
        operator: 'contains',
        value: '',
    };
}
function normalizeValue(field, value) {
    if (isBooleanField(field)) {
        return value === 'true';
    }
    if (isNumericField(field)) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return value;
}
export function FilterBuilder({ isOpen, targetType = 'series', activeFilter, onClose, onApply, onSave, onDelete, }) {
    const resolvedTargetType = activeFilter?.type ?? targetType;
    const [name, setName] = useState('');
    const [operator, setOperator] = useState('and');
    const [conditions, setConditions] = useState([createCondition(resolvedTargetType)]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const canDelete = Boolean(activeFilter?.id);
    const hasName = name.trim().length > 0;
    const hasConditionValues = useMemo(() => conditions.every(condition => String(condition.value).trim().length > 0), [conditions]);
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        if (activeFilter) {
            setName(activeFilter.name);
            setOperator(activeFilter.conditions.operator);
            setConditions(activeFilter.conditions.conditions.length > 0
                ? activeFilter.conditions.conditions
                : [createCondition(resolvedTargetType)]);
            return;
        }
        setName('');
        setOperator('and');
        setConditions([createCondition(resolvedTargetType)]);
    }, [isOpen, activeFilter, resolvedTargetType]);
    if (!isOpen) {
        return null;
    }
    const applyPayload = {
        operator,
        conditions,
    };
    const fieldOptions = FIELD_OPTIONS[resolvedTargetType];
    return (_jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-surface-3/70 px-4", children: _jsxs("div", { className: "w-full max-w-3xl rounded-md border border-border-subtle bg-surface-1 p-4 shadow-elevation-3", children: [_jsxs("header", { className: "mb-3 flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-semibold", children: "Custom Filter Builder" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [_jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Filter Name" }), _jsx("input", { value: name, onChange: event => setName(event.currentTarget.value), placeholder: resolvedTargetType === 'indexer' ? 'e.g. Torrent RSS Indexers' : 'e.g. Ongoing Network Shows', className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary" })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Condition Logic" }), _jsxs("select", { value: operator, onChange: event => setOperator(event.currentTarget.value), className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary", children: [_jsx("option", { value: "and", children: "AND (all conditions)" }), _jsx("option", { value: "or", children: "OR (any condition)" })] })] })] }), _jsx("div", { className: "mt-4 space-y-2", children: conditions.map((condition, index) => (_jsxs("div", { className: "grid grid-cols-1 gap-2 rounded-sm border border-border-subtle p-2 md:grid-cols-[1fr,1fr,1fr,auto]", children: [_jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Field" }), _jsx("select", { "aria-label": `Field ${index + 1}`, value: condition.field, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                            const field = event.currentTarget.value;
                                            setConditions(current => {
                                                const next = [...current];
                                                next[index] = createCondition(resolvedTargetType, field);
                                                return next;
                                            });
                                        }, children: fieldOptions.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Operator" }), _jsx("select", { "aria-label": `Operator ${index + 1}`, value: condition.operator, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                            const operatorValue = event.currentTarget.value;
                                            setConditions(current => {
                                                const next = [...current];
                                                next[index] = {
                                                    ...condition,
                                                    operator: operatorValue,
                                                };
                                                return next;
                                            });
                                        }, children: OPERATOR_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Value" }), isBooleanField(condition.field) ? (_jsx("select", { "aria-label": `Value ${index + 1}`, value: String(condition.value), className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                            const rawValue = event.currentTarget.value;
                                            setConditions(current => {
                                                const next = [...current];
                                                next[index] = {
                                                    ...condition,
                                                    value: normalizeValue(condition.field, rawValue),
                                                };
                                                return next;
                                            });
                                        }, children: BOOLEAN_VALUES.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })) : (_jsx("input", { "aria-label": `Value ${index + 1}`, type: isNumericField(condition.field) ? 'number' : 'text', value: String(condition.value), className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary", onChange: event => {
                                            const rawValue = event.currentTarget.value;
                                            setConditions(current => {
                                                const next = [...current];
                                                next[index] = {
                                                    ...condition,
                                                    value: normalizeValue(condition.field, rawValue),
                                                };
                                                return next;
                                            });
                                        } }))] }), _jsx("div", { className: "flex items-end", children: _jsx("button", { type: "button", className: "h-8 rounded-sm border border-border-subtle px-2 text-xs", onClick: () => {
                                        if (conditions.length === 1) {
                                            return;
                                        }
                                        setConditions(current => current.filter((_, conditionIndex) => conditionIndex !== index));
                                    }, disabled: conditions.length === 1, children: "Remove" }) })] }, index))) }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1.5 text-xs", onClick: () => setConditions(current => [...current, createCondition(resolvedTargetType)]), children: "Add Condition" }), _jsx("button", { type: "button", className: "rounded-sm border border-accent-primary px-3 py-1.5 text-xs", disabled: !hasConditionValues, onClick: () => onApply(applyPayload), children: "Apply" }), _jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1.5 text-xs", disabled: !hasName || !hasConditionValues || isSaving, onClick: async () => {
                                setIsSaving(true);
                                try {
                                    await onSave({
                                        id: activeFilter?.id,
                                        name,
                                        conditions: applyPayload,
                                    });
                                }
                                finally {
                                    setIsSaving(false);
                                }
                            }, children: activeFilter ? 'Update Filter' : 'Save Filter' }), _jsx("button", { type: "button", className: "rounded-sm border border-status-error/60 px-3 py-1.5 text-xs text-status-error", disabled: !canDelete || isDeleting, onClick: async () => {
                                if (!activeFilter?.id) {
                                    return;
                                }
                                setIsDeleting(true);
                                try {
                                    await onDelete(activeFilter.id);
                                }
                                finally {
                                    setIsDeleting(false);
                                }
                            }, children: "Delete Filter" })] })] }) }));
}
//# sourceMappingURL=FilterBuilder.js.map