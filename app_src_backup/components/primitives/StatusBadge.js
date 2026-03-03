import { jsx as _jsx } from "react/jsx-runtime";
const STATUS_CLASS = {
    // Existing statuses
    monitored: 'bg-status-monitored/20 text-status-monitored',
    wanted: 'bg-status-wanted/20 text-status-wanted',
    downloading: 'bg-status-downloading/20 text-status-downloading',
    seeding: 'bg-status-seeding/20 text-status-seeding',
    completed: 'bg-status-completed/20 text-status-completed',
    error: 'bg-status-error/20 text-status-error',
    // Queue statuses for movies
    queued: 'bg-accent-warning/20 text-accent-warning',
    importing: 'bg-accent-info/20 text-accent-info',
    paused: 'bg-surface-2 text-text-muted',
};
export function StatusBadge({ status }) {
    const normalized = status.toLowerCase();
    const className = STATUS_CLASS[normalized] ?? 'bg-surface-2 text-text-secondary';
    return (_jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${className}`, children: normalized }));
}
//# sourceMappingURL=StatusBadge.js.map