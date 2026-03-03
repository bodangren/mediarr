'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { WantedCountBadge } from '@/components/subtitles/WantedCountBadge';
function StatCard({ title, value, icon, href }) {
    const IconComponent = Icons[icon];
    return (_jsxs(Link, { href: href, className: "group flex items-center gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-default hover:bg-surface-2", children: [IconComponent && _jsx(IconComponent, { className: "h-6 w-6 text-accent-primary" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm text-text-muted", children: title }), _jsx("p", { className: "text-xl font-semibold text-text-primary", children: value })] }), _jsx(Icons.ChevronRight, { className: "h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1" })] }));
}
function QuickLink({ title, description, icon, href, badge }) {
    const IconComponent = Icons[icon];
    return (_jsxs(Link, { href: href, className: "group flex items-start gap-4 rounded-md border border-border-subtle bg-surface-1 p-4 transition-colors hover:border-border-default hover:bg-surface-2", children: [IconComponent && _jsx(IconComponent, { className: "mt-1 h-5 w-5 text-text-secondary" }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h3", { className: "font-medium text-text-primary", children: title }), badge] }), _jsx("p", { className: "text-sm text-text-secondary", children: description })] }), _jsx(Icons.ChevronRight, { className: "mt-1 h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1" })] }));
}
export default function SubtitlesPage() {
    const api = getApiClients();
    const { data: wantedCount } = useQuery({
        queryKey: queryKeys.subtitleWantedCount(),
        queryFn: () => api.subtitleWantedApi.getWantedCount(),
        staleTime: 30_000,
    });
    const { data: historyStats } = useQuery({
        queryKey: queryKeys.subtitleHistoryStats({ period: 'month' }),
        queryFn: () => api.subtitleHistoryApi.getHistoryStats({ period: 'month' }),
        staleTime: 60_000,
    });
    // Calculate total downloads from stats
    const totalSubtitlesDownloaded = historyStats?.downloads.reduce((sum, day) => sum + day.series + day.movies, 0) ?? 0;
    return (_jsxs("section", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Subtitles" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Manage subtitle downloads, search history, language profiles, and provider settings." })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(StatCard, { title: "Wanted Episodes", value: wantedCount?.seriesCount ?? 0, icon: "Search", href: "/subtitles/wanted/series" }), _jsx(StatCard, { title: "Wanted Movies", value: wantedCount?.moviesCount ?? 0, icon: "Search", href: "/subtitles/wanted/movies" }), _jsx(StatCard, { title: "Total Wanted", value: wantedCount?.totalCount ?? 0, icon: "AlertTriangle", href: "/subtitles/wanted/series" }), _jsx(StatCard, { title: "Downloaded", value: totalSubtitlesDownloaded.toLocaleString(), icon: "Download", href: "/subtitles/history/series" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(QuickLink, { title: "Series Subtitles", description: "View and manage subtitles for your TV series", icon: "Tv", href: "/subtitles/series" }), _jsx(QuickLink, { title: "Movies Subtitles", description: "View and manage subtitles for your movies", icon: "Film", href: "/subtitles/movies" }), _jsx(QuickLink, { title: "Wanted Episodes", description: "View episodes with missing subtitles", icon: "Search", href: "/subtitles/wanted/series", badge: _jsx(WantedCountBadge, {}) }), _jsx(QuickLink, { title: "Wanted Movies", description: "View movies with missing subtitles", icon: "Search", href: "/subtitles/wanted/movies", badge: _jsx(WantedCountBadge, {}) }), _jsx(QuickLink, { title: "History", description: "View subtitle download history", icon: "History", href: "/subtitles/history/series" }), _jsx(QuickLink, { title: "Blacklist", description: "Manage blacklisted subtitles", icon: "Ban", href: "/subtitles/blacklist/series" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Configuration" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(QuickLink, { title: "Language Profiles", description: "Configure language preferences and profiles", icon: "Languages", href: "/subtitles/profiles" }), _jsx(QuickLink, { title: "Providers", description: "Configure subtitle download providers", icon: "Database", href: "/subtitles/providers" }), _jsx(QuickLink, { title: "Settings", description: "Configure general subtitle settings", icon: "Settings", href: "/settings/subtitles" })] })] })] }));
}
//# sourceMappingURL=page.js.map