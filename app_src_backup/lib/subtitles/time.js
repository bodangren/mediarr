/**
 * Time formatting utilities for subtitle history and blacklist
 */
/**
 * Format a timestamp as a relative time string (e.g., "2h ago", "3 days ago")
 * Handles edge cases like invalid dates, null, and undefined.
 *
 * @param timestamp - The timestamp to format (string or Date)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp) {
    // Handle null, undefined, or empty strings
    if (timestamp === null || timestamp === undefined || timestamp === '') {
        return 'unknown';
    }
    try {
        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        // Check if date is invalid
        if (isNaN(date.getTime())) {
            return 'invalid date';
        }
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        // Handle future dates
        if (diffMs < 0) {
            return 'just now';
        }
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffSecs < 60)
            return 'just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        // For dates older than a week, show the actual date
        return date.toLocaleDateString();
    }
    catch {
        // Fallback for any unexpected errors
        return 'unknown';
    }
}
//# sourceMappingURL=time.js.map