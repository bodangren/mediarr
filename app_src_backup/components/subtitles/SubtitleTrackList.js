'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LanguageBadge } from './LanguageBadge';
import { Button } from '@/components/primitives/Button';
import { Download, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
export function SubtitleTrackList({ tracks, missingLanguages, onSearch, onDelete, onDownload, className = '', }) {
    const [searchingLang, setSearchingLang] = useState(null);
    const [deletingTrack, setDeletingTrack] = useState(null);
    const tracksWithIds = tracks.map((track, index) => ({
        ...track,
        id: index,
    }));
    const handleSearch = (langCode) => {
        setSearchingLang(langCode);
        onSearch(langCode);
    };
    const handleDelete = async (trackId) => {
        if (!onDelete)
            return;
        setDeletingTrack(trackId);
        try {
            onDelete(trackId);
        }
        finally {
            setDeletingTrack(null);
        }
    };
    const truncatePath = (path, maxLength = 50) => {
        if (path.length <= maxLength)
            return path;
        return `${path.slice(0, maxLength / 2)}...${path.slice(-maxLength / 2)}`;
    };
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [tracksWithIds.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Available Subtitles" }), _jsx("div", { className: "space-y-2", children: tracksWithIds.map((track) => (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-1 px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-3 flex-1 min-w-0", children: [_jsx(LanguageBadge, { languageCode: track.languageCode, variant: "available", isForced: track.isForced, isHi: track.isHi }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-xs font-medium text-text-secondary", children: track.provider }), _jsx("span", { className: "text-xs text-text-muted font-mono truncate", title: track.path, children: truncatePath(track.path) })] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [onDownload && (_jsx(Button, { variant: "secondary", onClick: () => onDownload(track), "aria-label": `Download subtitle for ${track.languageCode}`, className: "p-1.5", children: _jsx(Download, { className: "h-4 w-4" }) })), onDelete && (_jsx(Button, { variant: "secondary", onClick: () => handleDelete(track.id), disabled: deletingTrack === track.id, "aria-label": `Delete subtitle for ${track.languageCode}`, className: "p-1.5", children: _jsx(Trash2, { className: "h-4 w-4" }) }))] })] }, track.id))) })] })), missingLanguages.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Missing Languages" }), _jsxs(Button, { variant: "secondary", onClick: () => missingLanguages.forEach((lang) => handleSearch(lang)), disabled: searchingLang !== null, children: [_jsx(Search, { className: "h-4 w-4 mr-1" }), "Search All"] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: missingLanguages.map((langCode) => (_jsx(LanguageBadge, { languageCode: langCode, variant: "searching", onClick: () => handleSearch(langCode) }, langCode))) })] })), tracksWithIds.length === 0 && missingLanguages.length === 0 && (_jsx("div", { className: "rounded-md border border-border-subtle bg-surface-2 px-4 py-8 text-center", children: _jsx("p", { className: "text-sm text-text-muted", children: "No subtitle tracks found" }) }))] }));
}
//# sourceMappingURL=SubtitleTrackList.js.map