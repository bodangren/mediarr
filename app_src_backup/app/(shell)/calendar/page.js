'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Calendar } from './Calendar';
import { Agenda } from './Agenda';
import { CalendarLegend } from './CalendarLegend';
import { CalendarOptionsModal } from './CalendarOptionsModal';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { getCalendarStore } from '@/lib/state/calendarStore';
export default function CalendarPage() {
    const api = getApiClients();
    const calendarStore = getCalendarStore();
    const [mounted, setMounted] = useState(false);
    const [optionsModalOpen, setOptionsModalOpen] = useState(false);
    // Hydrate store on mount
    useEffect(() => {
        setMounted(true);
    }, []);
    // Get state from store
    const state = calendarStore.getState();
    // Responsive day count based on screen width
    const [dayCount, setDayCount] = useState(7);
    useEffect(() => {
        const updateDayCount = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                if (width < 768) {
                    setDayCount(3);
                }
                else if (width < 1024) {
                    setDayCount(5);
                }
                else {
                    setDayCount(7);
                }
            }
        };
        updateDayCount();
        window.addEventListener('resize', updateDayCount);
        return () => window.removeEventListener('resize', updateDayCount);
    }, []);
    // Calculate date range for API
    const { startDate, endDate } = useMemo(() => {
        const start = new Date(state.currentDate);
        const end = new Date(state.currentDate);
        // For calendar view: show the week (dayCount days)
        // For agenda view: show 30 days
        const daysToShow = state.viewMode === 'calendar' ? dayCount : 30;
        // Find the Sunday of the current week
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        end.setDate(start.getDate() + daysToShow);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    }, [state.currentDate, state.viewMode, dayCount]);
    // Fetch episodes
    const episodesQuery = useApiQuery({
        queryKey: queryKeys.calendar({ start: startDate, end: endDate, ...state.filters }),
        queryFn: () => api.calendarApi.listCalendarEpisodes({
            start: startDate,
            end: endDate,
            ...state.filters,
        }),
        staleTimeKind: 'list',
        enabled: mounted && (state.contentType === 'all' || state.contentType === 'tv'),
    });
    // Fetch movies
    const moviesQuery = useApiQuery({
        queryKey: ['calendar', 'movies', { start: startDate, end: endDate, ...state.filters }],
        queryFn: () => api.calendarApi.listCalendarMovies({
            start: startDate,
            end: endDate,
            ...state.filters,
        }),
        staleTimeKind: 'list',
        enabled: mounted && (state.contentType === 'all' || state.contentType === 'movies'),
    });
    // Combine events
    const events = useMemo(() => {
        const allEvents = [];
        // Add episode events
        if (state.contentType === 'all' || state.contentType === 'tv') {
            const episodes = episodesQuery.data ?? [];
            episodes.forEach(episode => {
                allEvents.push({ type: 'episode', data: episode });
            });
        }
        // Add movie events
        if (state.contentType === 'all' || state.contentType === 'movies') {
            const movies = moviesQuery.data ?? [];
            movies.forEach(movie => {
                allEvents.push({ type: 'movie', data: movie });
            });
        }
        // Sort by date
        allEvents.sort((a, b) => {
            const dateA = a.type === 'episode' ? a.data.airDate : a.data.releaseDate;
            const dateB = b.type === 'episode' ? b.data.airDate : b.data.releaseDate;
            return dateA.localeCompare(dateB);
        });
        return allEvents;
    }, [episodesQuery.data, moviesQuery.data, state.contentType]);
    // Navigation handlers
    const handlePrevious = () => {
        const date = new Date(state.currentDate);
        const daysToSubtract = state.viewMode === 'calendar' ? 7 : 30;
        date.setDate(date.getDate() - daysToSubtract);
        calendarStore.dispatch({ type: 'calendar/currentDate/set', payload: date.toISOString().split('T')[0] });
    };
    const handleNext = () => {
        const date = new Date(state.currentDate);
        const daysToAdd = state.viewMode === 'calendar' ? 7 : 30;
        date.setDate(date.getDate() + daysToAdd);
        calendarStore.dispatch({ type: 'calendar/currentDate/set', payload: date.toISOString().split('T')[0] });
    };
    const handleToday = () => {
        calendarStore.dispatch({ type: 'calendar/currentDate/reset' });
    };
    const handleViewModeChange = (mode) => {
        calendarStore.dispatch({ type: 'calendar/viewMode/set', payload: mode });
    };
    const handleContentTypeChange = (contentType) => {
        calendarStore.dispatch({ type: 'calendar/contentType/set', payload: contentType });
    };
    const handleIcalExport = () => {
        // iCal export API not yet available
    };
    const handleSearchMissing = () => {
        // Search for missing API not yet available
    };
    const handleRssSync = () => {
        // RSS sync API not yet available
    };
    const formatDateRange = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    };
    if (!mounted) {
        return null; // Prevent hydration mismatch
    }
    const isLoading = episodesQuery.isPending || moviesQuery.isPending;
    const isError = episodesQuery.isError || moviesQuery.isError;
    const isEmpty = (episodesQuery.isResolvedEmpty && moviesQuery.isResolvedEmpty) ||
        (state.contentType === 'movies' && moviesQuery.data?.length === 0) ||
        (state.contentType === 'tv' && episodesQuery.data?.length === 0);
    return (_jsxs("section", { className: "space-y-4", children: [_jsxs("header", { className: "space-y-1", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Calendar" }), _jsx("p", { className: "text-sm text-text-secondary", children: "View upcoming TV episodes and movie releases" })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handlePrevious, children: "\u2190 Previous" }), _jsx(Button, { variant: "primary", onClick: handleToday, children: "Today" }), _jsx(Button, { variant: "secondary", onClick: handleNext, children: "Next \u2192" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: state.contentType === 'all' ? 'primary' : 'secondary', onClick: () => handleContentTypeChange('all'), children: "All" }), _jsx(Button, { variant: state.contentType === 'movies' ? 'primary' : 'secondary', onClick: () => handleContentTypeChange('movies'), children: "Movies" }), _jsx(Button, { variant: state.contentType === 'tv' ? 'primary' : 'secondary', onClick: () => handleContentTypeChange('tv'), children: "TV" }), _jsx(Button, { variant: state.viewMode === 'calendar' ? 'primary' : 'secondary', onClick: () => handleViewModeChange('calendar'), children: "Calendar" }), _jsx(Button, { variant: state.viewMode === 'agenda' ? 'primary' : 'secondary', onClick: () => handleViewModeChange('agenda'), children: "Agenda" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handleSearchMissing, disabled: true, title: "Search for missing not yet available", children: "Search Missing" }), _jsx(Button, { variant: "secondary", onClick: handleRssSync, disabled: true, title: "RSS Sync not yet available", children: "RSS Sync" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", onClick: handleIcalExport, disabled: true, title: "iCal export not yet available", children: "iCal" }), _jsx(Button, { variant: "secondary", onClick: () => setOptionsModalOpen(true), children: "Options" })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm text-text-muted", children: formatDateRange() }), _jsx(CalendarLegend, {})] }), _jsx(QueryPanel, { isLoading: isLoading, isError: isError, isEmpty: isEmpty, errorMessage: episodesQuery.error?.message || moviesQuery.error?.message, onRetry: () => {
                    episodesQuery.refetch();
                    moviesQuery.refetch();
                }, emptyTitle: `No ${state.contentType === 'all' ? 'events' : state.contentType} found`, emptyBody: "Adjust your date range or filters, or check back later", children: state.viewMode === 'calendar' ? (_jsx(Calendar, { events: events, currentDate: state.currentDate, dayCount: dayCount })) : (_jsx(Agenda, { events: events })) }), _jsx(CalendarOptionsModal, { isOpen: optionsModalOpen, onClose: () => setOptionsModalOpen(false), options: state.options, onOptionsChange: (options) => calendarStore.dispatch({ type: 'calendar/options/set', payload: options }) })] }));
}
//# sourceMappingURL=page.js.map