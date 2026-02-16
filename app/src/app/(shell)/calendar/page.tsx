'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from './Calendar';
import { Agenda } from './Agenda';
import { CalendarLegend } from './CalendarLegend';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { getCalendarStore } from '@/lib/state/calendarStore';
import type { CalendarEpisode } from '@/types/calendar';

export default function CalendarPage() {
  const api = getApiClients();
  const calendarStore = getCalendarStore();
  const [mounted, setMounted] = useState(false);

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
    enabled: mounted,
  });

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

  const handleIcalExport = () => {
    // Placeholder for iCal export functionality
    alert('iCal export feature coming soon!');
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

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-text-secondary">View upcoming TV episode air dates</p>
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
          <Button variant="secondary" onClick={handleIcalExport}>
            iCal
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{formatDateRange()}</p>
        <CalendarLegend />
      </div>

      {/* Calendar Content */}
      <QueryPanel
        isLoading={episodesQuery.isPending}
        isError={episodesQuery.isError}
        isEmpty={episodesQuery.isResolvedEmpty}
        errorMessage={episodesQuery.error?.message}
        onRetry={() => void episodesQuery.refetch()}
        emptyTitle="No episodes found"
        emptyBody="Adjust your date range or check back later"
      >
        {state.viewMode === 'calendar' ? (
          <Calendar
            episodes={episodesQuery.data ?? []}
            currentDate={state.currentDate}
            dayCount={dayCount}
          />
        ) : (
          <Agenda episodes={episodesQuery.data ?? []} />
        )}
      </QueryPanel>
    </section>
  );
}
