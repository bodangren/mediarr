'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
function createEmptyCondition(field) {
    return {
        field,
        operator: 'contains',
        value: '',
    };
}
export function FilterBuilder({ fields, onApply }) {
    const [operator, setOperator] = useState('and');
    const [conditions, setConditions] = useState([createEmptyCondition(fields[0]?.key ?? 'value')]);
    return (_jsxs("section", { className: "space-y-3 rounded-md border border-border-subtle bg-surface-1 p-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: "Group operator" }), _jsxs("select", { "aria-label": "Group operator", value: operator, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary", onChange: event => setOperator(event.currentTarget.value), children: [_jsx("option", { value: "and", children: "AND" }), _jsx("option", { value: "or", children: "OR" })] })] }), conditions.map((condition, index) => (_jsxs("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-3", children: [_jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: `Field ${index + 1}` }), _jsx("select", { "aria-label": `Field ${index + 1}`, value: condition.field, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary", onChange: event => {
                                    const next = [...conditions];
                                    next[index] = { ...condition, field: event.currentTarget.value };
                                    setConditions(next);
                                }, children: fields.map(field => (_jsx("option", { value: field.key, children: field.label }, field.key))) })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: `Operator ${index + 1}` }), _jsxs("select", { "aria-label": `Operator ${index + 1}`, value: condition.operator, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary", onChange: event => {
                                    const next = [...conditions];
                                    next[index] = { ...condition, operator: event.currentTarget.value };
                                    setConditions(next);
                                }, children: [_jsx("option", { value: "contains", children: "contains" }), _jsx("option", { value: "equals", children: "equals" }), _jsx("option", { value: "gt", children: "greater than" })] })] }), _jsxs("label", { className: "flex flex-col gap-1 text-xs text-text-secondary", children: [_jsx("span", { children: `Value ${index + 1}` }), _jsx("input", { "aria-label": `Value ${index + 1}`, value: condition.value, className: "rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-xs text-text-primary", onChange: event => {
                                    const next = [...conditions];
                                    next[index] = { ...condition, value: event.currentTarget.value };
                                    setConditions(next);
                                } })] })] }, index))), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-primary", onClick: () => setConditions(current => [...current, createEmptyCondition(fields[0]?.key ?? 'value')]), children: "Add condition" }), _jsx("button", { type: "button", className: "rounded-sm border border-accent-primary px-2 py-1 text-xs text-text-primary", onClick: () => onApply({
                            operator,
                            conditions,
                        }), children: "Apply filters" })] })] }));
}
//# sourceMappingURL=FilterBuilder.js.map