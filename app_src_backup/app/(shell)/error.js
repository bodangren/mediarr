'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { useEffect } from 'react';
export default function ShellError({ error, reset, }) {
    useEffect(() => {
        console.error(error);
    }, [error]);
    return (_jsxs("div", { className: "mx-auto max-w-xl space-y-3 rounded-lg border border-status-error/30 bg-surface-1 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Route Error" }), _jsx("p", { className: "text-sm text-text-secondary", children: error.message }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2", onClick: () => reset(), children: "Retry" }), _jsx(Link, { href: "/", className: "rounded-sm border border-border-subtle px-3 py-1 text-sm text-text-primary hover:bg-surface-2", children: "Go Home" })] })] }));
}
//# sourceMappingURL=error.js.map