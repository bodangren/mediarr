'use client';
import { jsx as _jsx } from "react/jsx-runtime";
const EVENT_TYPE_CONFIG = {
    // Movie events
    MOVIE_GRABBED: {
        label: 'Grabbed',
        className: 'bg-accent-primary/20 text-accent-primary',
    },
    MOVIE_DOWNLOADED: {
        label: 'Downloaded',
        className: 'bg-accent-info/20 text-accent-info',
    },
    MOVIE_IMPORTED: {
        label: 'Imported',
        className: 'bg-status-completed/20 text-status-completed',
    },
    MOVIE_FILE_DELETED: {
        label: 'File Deleted',
        className: 'bg-status-error/20 text-status-error',
    },
    MOVIE_RENAMED: {
        label: 'Renamed',
        className: 'bg-accent-info/20 text-accent-info',
    },
    DOWNLOAD_FAILED: {
        label: 'Failed',
        className: 'bg-status-error/20 text-status-error',
    },
    // TV/Series events (existing)
    RELEASE_GRABBED: {
        label: 'Grabbed',
        className: 'bg-accent-primary/20 text-accent-primary',
    },
    SERIES_DOWNLOADED: {
        label: 'Downloaded',
        className: 'bg-accent-info/20 text-accent-info',
    },
    SERIES_IMPORTED: {
        label: 'Imported',
        className: 'bg-status-completed/20 text-status-completed',
    },
    SERIES_FILE_DELETED: {
        label: 'File Deleted',
        className: 'bg-status-error/20 text-status-error',
    },
    SERIES_RENAMED: {
        label: 'Renamed',
        className: 'bg-accent-info/20 text-accent-info',
    },
    // General events
    INDEXER_QUERY: {
        label: 'Query',
        className: 'bg-surface-2 text-text-secondary',
    },
    INDEXER_RSS: {
        label: 'RSS',
        className: 'bg-surface-2 text-text-secondary',
    },
    INDEXER_AUTH: {
        label: 'Auth',
        className: 'bg-status-error/20 text-status-error',
    },
};
export function ActivityEventBadge({ eventType }) {
    const config = EVENT_TYPE_CONFIG[eventType] ?? {
        label: eventType,
        className: 'bg-surface-2 text-text-secondary',
    };
    return (_jsx("span", { className: `inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`, title: eventType, children: config.label }));
}
//# sourceMappingURL=ActivityEventBadge.js.map