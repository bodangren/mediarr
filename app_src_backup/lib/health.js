export function healthStatus(row) {
    const failureCount = row.health?.failureCount ?? 0;
    if (failureCount >= 3) {
        return 'error';
    }
    if (failureCount > 0) {
        return 'warning';
    }
    return 'completed';
}
//# sourceMappingURL=health.js.map