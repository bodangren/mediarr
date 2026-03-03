import { jsx as _jsx } from "react/jsx-runtime";
const LABEL_CLASS = {
    info: 'bg-accent-primary/15 text-text-primary',
    success: 'bg-status-completed/20 text-status-completed',
    warning: 'bg-status-wanted/20 text-status-wanted',
    danger: 'bg-status-error/20 text-status-error',
};
export function Label({ tone = 'info', children }) {
    return _jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${LABEL_CLASS[tone]}`, children: children });
}
//# sourceMappingURL=Label.js.map