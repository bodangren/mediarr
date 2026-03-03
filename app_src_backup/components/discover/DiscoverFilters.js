'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from '@/types/discover';
// Static lists for filter options - these can be replaced with API calls when backend endpoints are available
const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'Thriller', 'War', 'Western'];
const CERTIFICATIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Italian'];
export function DiscoverFilters({ filters, onChange, onApply, onClear }) {
    const handleGenreToggle = (genre) => {
        const newGenres = filters.genres.includes(genre)
            ? filters.genres.filter(g => g !== genre)
            : [...filters.genres, genre];
        onChange({ ...filters, genres: newGenres });
    };
    return (_jsxs("aside", { className: "space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-text-primary", children: "Year Range" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("label", { className: "flex-1 space-y-1 text-sm", children: [_jsx("span", { className: "text-xs text-text-secondary", children: "Min Year" }), _jsx("input", { type: "number", min: "1900", max: "2030", value: filters.minYear ?? '', onChange: event => {
                                            const minYear = event.currentTarget.value ? Number.parseInt(event.currentTarget.value, 10) : undefined;
                                            onChange({ ...filters, minYear });
                                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm", placeholder: "1900" })] }), _jsxs("label", { className: "flex-1 space-y-1 text-sm", children: [_jsx("span", { className: "text-xs text-text-secondary", children: "Max Year" }), _jsx("input", { type: "number", min: "1900", max: "2030", value: filters.maxYear ?? '', onChange: event => {
                                            const maxYear = event.currentTarget.value ? Number.parseInt(event.currentTarget.value, 10) : undefined;
                                            onChange({ ...filters, maxYear });
                                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm", placeholder: "2030" })] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-text-primary", children: "Genres" }), _jsx("div", { className: "grid max-h-48 grid-cols-2 gap-2 overflow-y-auto", children: GENRES.map(genre => (_jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: filters.genres.includes(genre), onChange: () => handleGenreToggle(genre), className: "rounded-sm border-border-subtle bg-surface-0" }), _jsx("span", { className: "text-xs text-text-secondary", children: genre })] }, genre))) })] }), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-text-primary", children: "Certification" }), _jsxs("select", { value: filters.certification ?? '', onChange: event => {
                            const certification = event.currentTarget.value || undefined;
                            onChange({ ...filters, certification });
                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm", children: [_jsx("option", { value: "", children: "All Certifications" }), CERTIFICATIONS.map(cert => (_jsx("option", { value: cert, children: cert }, cert)))] })] }), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-sm font-semibold text-text-primary", children: "Language" }), _jsxs("select", { value: filters.language ?? '', onChange: event => {
                            const language = event.currentTarget.value || undefined;
                            onChange({ ...filters, language });
                        }, className: "w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1.5 text-sm", children: [_jsx("option", { value: "", children: "All Languages" }), LANGUAGES.map(lang => (_jsx("option", { value: lang, children: lang }, lang)))] })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: onApply, className: "flex-1 rounded-sm bg-accent-primary px-3 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-primary/90", children: "Apply Filters" }), _jsx("button", { type: "button", onClick: onClear, className: "flex-1 rounded-sm border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-2", children: "Clear" })] })] }));
}
//# sourceMappingURL=DiscoverFilters.js.map