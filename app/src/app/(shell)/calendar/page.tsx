'use client';

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
import { getMockMoviesInRange } from '@/lib/mocks/calendarMocks';
import type { CalendarEvent } from '@/types/calendar';

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
  const [dayCount, setDayCount] = useState<3 | 5 | 7>(7);
  useEffect(() => {
    const updateDayCount = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width < 768) {
          setDayCount(3);
        } else if (width < 1024) {
          setDayCount(5);
        } else {
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
      startDate: start.toISOString().split('T')[0]!,
      endDate: end.toISOString().split('T')[0]!,
    };
  }, [state.currentDate, state.viewMode, dayCount]);

  // Fetch episodes
  const episodesQuery = useApiQuery({
    queryKey: queryKeys.calendar({ start: startDate, end: endDate, ...state.filters }),
    queryFn: () =>
      api.calendarApi.listCalendarEpisodes({
        start: startDate,
        end: endDate,
        ...state.filters,
      }),
    staleTimeKind: 'list',
    enabled: mounted && (state.contentType === 'all' || state.contentType === 'tv'),
  });

  // Fetch movies (using mock data for now)
  const moviesQuery = useApiQuery<CalendarEvent[]>({
    queryKey: ['calendar-movies', { start: startDate, end: endDate, ...state.filters }],
    queryFn: async () => getMockMoviesInRange(startDate, endDate),
    staleTimeKind: 'list',
    enabled: mounted && (state.contentType === 'all' || state.contentType === 'movies'),
  });

  // Combine events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

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
      movies.forEach(event => {
        if (event.type === 'movie') {
          allEvents.push(event);
        }
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
    calendarStore.dispatch({ type: 'calendar/currentDate/set', payload: date.toISOString().split('T')[0]! });
  };

  const handleNext = () => {
    const date = new Date(state.currentDate);
    const daysToAdd = state.viewMode === 'calendar' ? 7 : 30;
    date.setDate(date.getDate() + daysToAdd);
    calendarStore.dispatch({ type: 'calendar/currentDate/set', payload: date.toISOString().split('T')[0]! });
  };

  const handleToday = () => {
    calendarStore.dispatch({ type: 'calendar/currentDate/reset' });
  };

  const handleViewModeChange = (mode: 'calendar' | 'agenda') => {
    calendarStore.dispatch({ type: 'calendar/viewMode/set', payload: mode });
  };

  const handleContentTypeChange = (contentType: 'all' | 'movies' | 'tv') => {
    calendarStore.dispatch({ type: 'calendar/contentType/set', payload: contentType });
  };

  const handleIcalExport = () => {
    // Placeholder for iCal export functionality
    alert('iCal export feature coming soon!');
  };

  const handleSearchMissing = () => {
    // Placeholder for search missing functionality
    alert('Search for missing movies/episodes coming soon!');
  };

  const handleRssSync = () => {
    // Placeholder for RSS sync functionality
    alert('RSS Sync coming soon!');
  };

  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
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

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-text-secondary">View upcoming TV episodes and movie releases</p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrevious}>
            ← Previous
          </Button>
          <Button variant="primary" onClick={handleToday}>
            Today
          </Button>
          <Button variant="secondary" onClick={handleNext}>
            Next →
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={state.contentType === 'all' ? 'primary' : 'secondary'}
            onClick={() => handleContentTypeChange('all')}
          >
            All
          </Button>
          <Button
            variant={state.contentType === 'movies' ? 'primary' : 'secondary'}
            onClick={() => handleContentTypeChange('movies')}
          >
            Movies
          </Button>
          <Button
            variant={state.contentType === 'tv' ? 'primary' : 'secondary'}
            onClick={() => handleContentTypeChange('tv')}
          >
            TV
          </Button>
          <Button
            variant={state.viewMode === 'calendar' ? 'primary' : 'secondary'}
            onClick={() => handleViewModeChange('calendar')}
          >
            Calendar
          </Button>
          <Button
            variant={state.viewMode === 'agenda' ? 'primary' : 'secondary'}
            onClick={() => handleViewModeChange('agenda')}
          >
            Agenda
          </Button>
        </div>
      </div>

      {/* Additional actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSearchMissing}>
            Search Missing
          </Button>
          <Button variant="secondary" onClick={handleRssSync}>
            RSS Sync
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleIcalExport}>
            iCal
          </Button>
          <Button variant="secondary" onClick={() => setOptionsModalOpen(true)}>
            Options
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{formatDateRange()}</p>
        <CalendarLegend />
      </div>

      {/* Calendar Content */}
      <QueryPanel
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        errorMessage={episodesQuery.error?.message || moviesQuery.error?.message}
        onRetry={() => {
          episodesQuery.refetch();
          moviesQuery.refetch();
        }}
        emptyTitle={`No ${state.contentType === 'all' ? 'events' : state.contentType} found`}
        emptyBody="Adjust your date range or filters, or check back later"
      >
        {state.viewMode === 'calendar' ? (
          <Calendar
            events={events}
            currentDate={state.currentDate}
            dayCount={dayCount}
          />
        ) : (
          <Agenda events={events} />
        )}
      </QueryPanel>

      {/* Calendar Options Modal */}
      <CalendarOptionsModal
        isOpen={optionsModalOpen}
        onClose={() => setOptionsModalOpen(false)}
        options={state.options}
        onOptionsChange={(options) => calendarStore.dispatch({ type: 'calendar/options/set', payload: options })}
      />
    </section>
  );
}
