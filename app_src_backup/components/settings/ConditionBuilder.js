'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { Button } from '@/components/primitives/Button';
import { CONDITION_TYPES, OPERATORS, FIELDS, getOperatorsForType, createDefaultCondition, } from '@/types/customFormat';
export function ConditionBuilder({ conditions, onChange, disabled = false, }) {
    const handleAddCondition = useCallback(() => {
        onChange([...conditions, createDefaultCondition()]);
    }, [conditions, onChange]);
    const handleRemoveCondition = useCallback((index) => {
        onChange(conditions.filter((_, i) => i !== index));
    }, [conditions, onChange]);
    const handleUpdateCondition = useCallback((index, updates) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onChange(newConditions);
    }, [conditions, onChange]);
    const handleToggleNegate = useCallback((index) => {
        const newConditions = [...conditions];
        newConditions[index] = {
            ...newConditions[index],
            negate: !newConditions[index].negate,
        };
        onChange(newConditions);
    }, [conditions, onChange]);
    const handleToggleRequired = useCallback((index) => {
        const newConditions = [...conditions];
        newConditions[index] = {
            ...newConditions[index],
            required: !newConditions[index].required,
        };
        onChange(newConditions);
    }, [conditions, onChange]);
    const getAvailableOperators = (type) => {
        return getOperatorsForType(type);
    };
    const getOperatorsForDisplay = (type) => {
        const available = getAvailableOperators(type);
        return OPERATORS.filter(op => available.includes(op.value));
    };
    const renderValueInput = (condition, index) => {
        const { type, value } = condition;
        if (type === 'size') {
            // Size in bytes - allow number input with GB/MB conversion hint
            return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", className: "w-32 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: typeof value === 'number' ? value : 0, onChange: (e) => handleUpdateCondition(index, {
                            value: Number.parseInt(e.target.value, 10) || 0,
                        }), placeholder: "Bytes", disabled: disabled }), _jsxs("span", { className: "text-xs text-text-muted whitespace-nowrap", children: ["(~", (typeof value === 'number' ? value / 1073741824 : 0).toFixed(2), " GB)"] })] }));
        }
        if (type === 'resolution') {
            // Resolution as number (e.g., 1080, 720, 2160)
            return (_jsx("input", { type: "number", className: "w-32 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: typeof value === 'number' ? value : 0, onChange: (e) => handleUpdateCondition(index, {
                    value: Number.parseInt(e.target.value, 10) || 0,
                }), placeholder: "e.g., 1080", disabled: disabled }));
        }
        // Default: string input
        return (_jsx("input", { type: "text", className: "flex-1 min-w-0 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: typeof value === 'string' ? value : String(value), onChange: (e) => handleUpdateCondition(index, { value: e.target.value }), placeholder: type === 'regex' ? 'e.g., HDR|DV|ATMOS' :
                type === 'language' ? 'e.g., English' :
                    type === 'releaseGroup' ? 'e.g., RARBG' :
                        type === 'source' ? 'e.g., Bluray' :
                            'Enter value...', disabled: disabled }));
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "block text-sm font-medium text-text-primary", children: "Conditions" }), _jsx(Button, { variant: "secondary", onClick: handleAddCondition, disabled: disabled, className: "text-xs", children: "+ Add Condition" })] }), conditions.length === 0 && (_jsx("div", { className: "rounded-sm border border-dashed border-border-subtle p-4 text-center", children: _jsx("p", { className: "text-sm text-text-muted", children: "No conditions defined. Add conditions to match releases." }) })), conditions.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs text-text-muted", children: "All conditions must match (AND logic)" }), conditions.map((condition, index) => (_jsxs("div", { className: "rounded-sm border border-border-subtle bg-surface-0 p-3 space-y-2", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-text-muted mb-1", children: "Type" }), _jsx("select", { className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: condition.type, onChange: (e) => {
                                                            const newType = e.target.value;
                                                            const updates = { type: newType };
                                                            // Reset operator to a valid one for the new type
                                                            const validOperators = getAvailableOperators(newType);
                                                            if (!validOperators.includes(condition.operator)) {
                                                                updates.operator = validOperators[0];
                                                            }
                                                            handleUpdateCondition(index, updates);
                                                        }, disabled: disabled, children: CONDITION_TYPES.map(ct => (_jsx("option", { value: ct.value, children: ct.label }, ct.value))) })] }), ['regex', 'releaseGroup', 'source'].includes(condition.type) && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-text-muted mb-1", children: "Field" }), _jsx("select", { className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: condition.field || 'title', onChange: (e) => handleUpdateCondition(index, {
                                                            field: e.target.value,
                                                        }), disabled: disabled, children: FIELDS.map(f => (_jsx("option", { value: f.value, children: f.label }, f.value))) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-text-muted mb-1", children: "Operator" }), _jsx("select", { className: "w-full rounded-sm border border-border-subtle bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent-primary disabled:opacity-50", value: condition.operator || 'contains', onChange: (e) => handleUpdateCondition(index, {
                                                            operator: e.target.value,
                                                        }), disabled: disabled, children: getOperatorsForDisplay(condition.type).map(op => (_jsx("option", { value: op.value, children: op.label }, op.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-text-muted mb-1", children: "Value" }), renderValueInput(condition, index)] })] }), _jsx("button", { type: "button", onClick: () => handleRemoveCondition(index), disabled: disabled, className: "text-status-error hover:text-status-error/80 disabled:opacity-50 mt-5", "aria-label": "Remove condition", children: _jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsxs("div", { className: "flex items-center gap-4 pl-1", children: [_jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: condition.negate || false, onChange: () => handleToggleNegate(index), disabled: disabled, className: "rounded border-border-subtle text-accent-primary focus:ring-accent-primary" }), _jsx("span", { className: "text-xs text-text-secondary", children: "Negate" })] }), _jsxs("label", { className: "flex items-center gap-1.5 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: condition.required || false, onChange: () => handleToggleRequired(index), disabled: disabled, className: "rounded border-border-subtle text-accent-primary focus:ring-accent-primary" }), _jsx("span", { className: "text-xs text-text-secondary", children: "Required" })] })] })] }, index)))] }))] }));
}
//# sourceMappingURL=ConditionBuilder.js.map