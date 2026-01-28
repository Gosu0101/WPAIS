'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useCalendarEvents, useRescheduleEvent } from '@/lib/hooks/use-calendar';
import { CalendarEvent, CalendarEventType } from '@/lib/api/client';
import { CalendarToolbar } from './calendar-toolbar';
import { CalendarFilters } from './calendar-filters';
import { EventPopover } from './event-popover';
import { EventEditDialog } from './event-edit-dialog';

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

export interface CalendarViewProps {
  projectId?: string;
  initialView?: CalendarViewType;
  initialDate?: Date;
  editable?: boolean;
}

// 초기 날짜 범위 계산 (현재 월 기준 전후 1개월)
function getInitialDateRange(date: Date) {
  return {
    start: subMonths(startOfMonth(date), 1),
    end: addMonths(endOfMonth(date), 1),
  };
}

export function CalendarView({
  projectId,
  initialView = 'dayGridMonth',
  initialDate = new Date(),
  editable = true,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [dateRange, setDateRange] = useState(() => getInitialDateRange(initialDate));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ event: CalendarEvent; newDate: Date } | null>(null);
  const [filters, setFilters] = useState({
    eventTypes: ['episode', 'milestone', 'task'] as CalendarEventType[],
    episodeStatuses: [] as string[],
    taskTypes: [] as string[],
    projectIds: [] as string[],
  });

  const { data, isLoading } = useCalendarEvents({
    startDate: dateRange.start,
    endDate: dateRange.end,
    projectId,
    projectIds: filters.projectIds.length ? filters.projectIds : undefined,
    types: filters.eventTypes,
  });

  const reschedule = useRescheduleEvent();

  // Responsive view based on viewport
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let newView: CalendarViewType = 'dayGridMonth';
      if (width < 640) {
        newView = 'timeGridDay';
      } else if (width < 1024) {
        newView = 'timeGridWeek';
      }
      if (newView !== currentView) {
        setCurrentView(newView);
        calendarRef.current?.getApi().changeView(newView);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentView]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({ start: arg.start, end: arg.end });
    setCurrentDate(arg.view.currentStart);
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const event = data?.events.find(e => e.id === arg.event.id);
    if (event) {
      setSelectedEvent(event);
      setPopoverAnchor({ x: arg.jsEvent.clientX, y: arg.jsEvent.clientY });
    }
  }, [data?.events]);

  const handleEventDrop = useCallback((arg: EventDropArg) => {
    const event = data?.events.find(e => e.id === arg.event.id);
    if (event && arg.event.start) {
      setPendingDrop({ event, newDate: arg.event.start });
      setEditDialogOpen(true);
      arg.revert();
    }
  }, [data?.events]);

  const handleConfirmReschedule = useCallback(async () => {
    if (!pendingDrop) return;
    
    await reschedule.mutateAsync({
      eventId: pendingDrop.event.id,
      newDate: pendingDrop.newDate.toISOString(),
      eventType: pendingDrop.event.type,
    });
    
    setEditDialogOpen(false);
    setPendingDrop(null);
  }, [pendingDrop, reschedule]);

  const handleViewChange = useCallback((view: CalendarViewType) => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const handleNavigate = useCallback((action: 'prev' | 'next' | 'today') => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    
    switch (action) {
      case 'prev':
        api.prev();
        break;
      case 'next':
        api.next();
        break;
      case 'today':
        api.today();
        break;
    }
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    calendarRef.current?.getApi().gotoDate(date);
  }, []);

  const events = data?.events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
    extendedProps: event.extendedProps,
  })) || [];

  return (
    <div className="flex flex-col h-full">
      <CalendarToolbar
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={handleViewChange}
        onNavigate={handleNavigate}
        onDateChange={handleDateChange}
      />
      
      {!projectId && (
        <CalendarFilters
          filters={filters}
          projects={data?.projects || []}
          onFilterChange={setFilters}
        />
      )}

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            initialDate={initialDate}
            headerToolbar={false}
            editable={editable}
            droppable={false}
            events={events}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            datesSet={handleDatesSet}
            locale="ko"
            firstDay={0}
            dayMaxEvents={3}
            moreLinkClick="popover"
            height="100%"
            eventDisplay="block"
          />
        )}
      </div>

      {selectedEvent && popoverAnchor && (
        <EventPopover
          event={selectedEvent}
          position={popoverAnchor}
          onClose={() => {
            setSelectedEvent(null);
            setPopoverAnchor(null);
          }}
        />
      )}

      <EventEditDialog
        open={editDialogOpen}
        event={pendingDrop?.event || null}
        newDate={pendingDrop?.newDate || null}
        onConfirm={handleConfirmReschedule}
        onCancel={() => {
          setEditDialogOpen(false);
          setPendingDrop(null);
        }}
        isLoading={reschedule.isPending}
      />
    </div>
  );
}
