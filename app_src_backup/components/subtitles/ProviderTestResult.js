'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import {} from '@/lib/api';
import { Icon } from '@/components/primitives/Icon';
import { Alert } from '@/components/primitives/Alert';
export function ProviderTestResult({ result, isTesting }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (result) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [result]);
    if (!visible && !isTesting) {
        return null;
    }
    if (isTesting) {
        return (_jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary", children: [_jsx(Icon, { name: "refresh", label: "Testing", className: "animate-spin" }), _jsx("span", { children: "Testing connection..." })] }));
    }
    if (!result) {
        return null;
    }
    return (_jsx(Alert, { variant: result.success ? 'success' : 'danger', children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { name: result.success ? 'success' : 'danger', label: result.success ? 'Success' : 'Error' }), _jsx("span", { children: result.message })] }) }));
}
//# sourceMappingURL=ProviderTestResult.js.map