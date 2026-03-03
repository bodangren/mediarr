'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
const ToastContext = createContext(undefined);
function variantClass(variant) {
    switch (variant) {
        case 'success':
            return 'border-status-completed/40 bg-status-completed/15';
        case 'warning':
            return 'border-accent-warning/40 bg-accent-warning/15';
        case 'error':
            return 'border-status-error/40 bg-status-error/15';
        default:
            return 'border-accent-info/30 bg-accent-info/12';
    }
}
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const pushToast = useCallback((toast) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const next = {
            ...toast,
            variant: toast.variant ?? 'info',
            id,
        };
        setToasts(current => [...current, next]);
        setTimeout(() => {
            setToasts(current => current.filter(item => item.id !== id));
        }, 4500);
    }, []);
    const value = useMemo(() => ({ pushToast }), [pushToast]);
    return (_jsxs(ToastContext.Provider, { value: value, children: [children, _jsx("div", { className: "pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,92vw)] flex-col gap-2", children: toasts.map(toast => {
                    const variant = toast.variant ?? 'info';
                    return (_jsxs("div", { className: `pointer-events-auto rounded-md border px-4 py-3 shadow-elevation-2 backdrop-blur ${variantClass(variant)}`, role: "status", children: [_jsx("p", { className: "text-sm font-semibold text-text-primary", children: toast.title }), toast.message ? _jsx("p", { className: "mt-1 text-sm text-text-secondary", children: toast.message }) : null, toast.action ? (_jsx("button", { type: "button", className: "mt-2 rounded-sm border border-border-subtle px-2 py-1 text-xs font-medium text-text-primary hover:bg-surface-2", onClick: toast.action.onClick, children: toast.action.label })) : null] }, toast.id));
                }) })] }));
}
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
//# sourceMappingURL=ToastProvider.js.map