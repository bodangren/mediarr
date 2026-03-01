import { useState, useEffect, useMemo } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import { formatEpisodeCode } from '@/lib/format';
import type { CalendarItem } from '@/types/calendar';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/providers/ToastProvider';

export function CalendarPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  
  // Date state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCalendar = async () => {
      setIsLoading(true);
      try {
        // Fetch from 1st of month to end of month
        // We'll pad it slightly to cover the visible grid (previous/next month days)
        const startDate = new Date(currentYear, currentMonth, 1);
        const startDayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - startDayOfWeek); // Backtrack to Sunday
        
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        const endDayOfWeek = endDate.getDay();
        endDate.setDate(endDate.getDate() + (6 - endDayOfWeek)); // Forward to Saturday
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const data = await api.calendarApi.list({ start: startStr, end: endStr });
        setItems(data);
      } catch (err) {
        pushToast({ variant: 'error', title: 'Error', message: 'Failed to load calendar' });
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchCalendar();
  }, [api, currentYear, currentMonth, pushToast]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const gridStart = new Date(firstDayOfMonth);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const cursor = new Date(gridStart);
    for (let i = 0; i < 6; i++) {
      const week: Date[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
      if (week[6].getMonth() !== currentMonth && week[6].getTime() > firstDayOfMonth.getTime()) {
        break;
      }
    }
    return result;
  }, [currentYear, currentMonth]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const dateStr = item.date;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <RouteScaffold title="Calendar" description="Upcoming monitored movie and TV releases.">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          {isLoading && <span className="text-sm text-text-secondary">Loading...</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="rounded border border-border-subtle px-3 py-1 text-sm bg-surface-1 hover:bg-surface-2">&lt; Prev</button>
          <button onClick={handleToday} className="rounded border border-border-subtle px-3 py-1 text-sm bg-surface-1 hover:bg-surface-2">Today</button>
          <button onClick={handleNextMonth} className="rounded border border-border-subtle px-3 py-1 text-sm bg-surface-1 hover:bg-surface-2">Next &gt;</button>
        </div>
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-1 overflow-hidden flex flex-col h-[70vh]">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border-subtle bg-surface-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="px-2 py-2 text-center text-sm font-medium text-text-secondary">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col bg-surface-0">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 flex-1 border-b border-border-subtle last:border-b-0">
              {week.map((day, dIdx) => {
                const dateStr = day.toISOString().split('T')[0];
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = dateStr === todayStr;
                const dayItems = itemsByDate.get(dateStr) || [];

                return (
                  <div 
                    key={dIdx} 
                    className={`border-r border-border-subtle last:border-r-0 p-2 flex flex-col gap-1 overflow-y-auto ${
                      isCurrentMonth ? '' : 'bg-surface-2/50 text-text-muted'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-semibold ${isToday ? 'bg-accent-primary text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                        {day.getDate()}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {dayItems.map(item => (
                        <div key={`${item.type}-${item.id}`} className={`p-1.5 rounded-sm border text-xs flex flex-col gap-1 ${
                          item.status === 'downloaded' ? 'border-status-completed/50 bg-status-completed/10' :
                          item.status === 'missing' ? 'border-status-error/50 bg-status-error/10' :
                          item.status === 'airing' ? 'border-accent-info/50 bg-accent-info/10' :
                          'border-border-subtle bg-surface-1'
                        }`}>
                          <div className="font-medium truncate">
                            {item.type === 'movie' ? (
                              <Link to={`/library/movies/${item.movieId}`} className="hover:underline">{item.title}</Link>
                            ) : (
                              <Link to={`/library/series/${item.seriesId}`} className="hover:underline">{item.title}</Link>
                            )}
                          </div>
                          
                          {item.type === 'episode' && (
                            <div className="text-[10px] text-text-secondary truncate">
                              {formatEpisodeCode(item.seasonNumber!, item.episodeNumber!)} - {item.episodeTitle}
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{item.status}</span>
                            {item.status === 'missing' && dateStr < todayStr && (
                              <button 
                                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border-subtle hover:bg-surface-3 transition-colors"
                                title="Search for item"
                              >
                                Search
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </RouteScaffold>
  );
}