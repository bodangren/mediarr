export function healthStatus(row: { health?: { failureCount?: number } | null }): 'completed' | 'warning' | 'error' {
  const failureCount = row.health?.failureCount ?? 0;

  if (failureCount >= 3) {
    return 'error';
  }

  if (failureCount > 0) {
    return 'warning';
  }

  return 'completed';
}
