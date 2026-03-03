export function formatPercent(value) {
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}
export function formatNumber(value) {
    return new Intl.NumberFormat().format(value);
}
export function formatRelativeDate(input) {
    if (!input) {
        return 'Unknown';
    }
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}
export function formatDateTime(input) {
    if (!input) {
        return 'Unknown';
    }
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}
export function formatBytesFromString(value) {
    if (value === undefined) {
        return '-';
    }
    const raw = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (!Number.isFinite(raw)) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let nextValue = raw;
    while (nextValue >= 1024 && unitIndex < units.length - 1) {
        nextValue /= 1024;
        unitIndex += 1;
    }
    return `${nextValue.toFixed(nextValue >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
export function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
export function formatBytes(bytes) {
    if (bytes === undefined || !Number.isFinite(bytes)) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
export function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond)) {
        return '-';
    }
    return `${formatBytes(bytesPerSecond)}/s`;
}
export function formatTimeRemaining(seconds) {
    if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
        return '-';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes} min`;
    }
    return '< 1 min';
}
//# sourceMappingURL=format.js.map