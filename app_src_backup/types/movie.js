/**
 * Determine file status for a movie.
 */
export function getFileStatus(item) {
    if (!item.fileVariants || item.fileVariants.length === 0) {
        return 'wanted';
    }
    const hasFile = item.fileVariants.some(variant => Boolean(variant.path));
    if (hasFile) {
        return 'completed';
    }
    return 'downloading';
}
/**
 * Get rating display value (prefers TMDB, falls back to IMDb, then RT).
 */
export function getRatingDisplay(item) {
    return item.ratings?.tmdb ?? item.ratings?.imdb ?? item.ratings?.rottenTomatoes;
}
/**
 * Get formatted runtime string.
 */
export function getRuntimeDisplay(runtime) {
    if (!runtime)
        return '-';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
/**
 * Format file size in human readable format.
 */
export function formatFileSize(bytes) {
    if (!bytes)
        return '-';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
        return `${Math.round(mb)} MB`;
    }
    return `${bytes} B`;
}
//# sourceMappingURL=movie.js.map