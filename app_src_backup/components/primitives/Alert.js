import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Icon } from './Icon';
const TONE_CLASS = {
    info: 'border-accent-primary/40 bg-accent-primary/10 text-text-primary',
    success: 'border-status-completed/40 bg-status-completed/10 text-text-primary',
    warning: 'border-status-wanted/40 bg-status-wanted/10 text-text-primary',
    danger: 'border-status-error/40 bg-status-error/10 text-text-primary',
};
const ICON_BY_VARIANT = {
    info: 'search',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
};
export function Alert({ variant = 'info', children }) {
    return (_jsxs("div", { className: `flex items-start gap-2 rounded-sm border px-3 py-2 text-sm ${TONE_CLASS[variant]}`, role: "alert", children: [_jsx(Icon, { name: ICON_BY_VARIANT[variant], label: `${variant} alert`, className: "mt-0.5 shrink-0" }), _jsx("div", { children: children })] }));
}
//# sourceMappingURL=Alert.js.map