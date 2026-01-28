'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
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

export function CalendarView({
  projectId,
  initialView = 'dayGridMonth',
  initialDate,
  editable = true,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  
  // 초기 날짜 안정화
  const stableInitialDate = useMemo(() => initialDate || new Date(), []);
  
  const [currentView, setCurrentView] = useState<CalendarViewType>(initialView);
  const [currentDate, setCurrentDate] = useState(stableInitialDate);
  
  // 고정된 넓은 날짜 범위 (2년) - 변경되지 않음
  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear() - 1, 0, 1), // 작년 1월 1일
      end: new Date(now.getFullYear() + 1, 11, 31), // 내년 12월 31일
    };
  }, []);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ event: CalendarEvent; newDate: Date } | null>(null);
  const [filters, setFilters] = useState({
    eventTypes: ['episode', 'milestone'] as CalendarEventType[],
    episodeStatuses: [] as string[],
    taskTypes: [] as string[],
    projectIds: [] as string[],
  });

  const { data, isLoading, isFetching, error } = useCalendarEvents({
    startDate: dateRange.start,
    endDate: dateRange.end,
    projectId,
    projectIds: filters.projectIds.length ? filters.projectIds : undefined,
    types: filters.eventTypes,
  });

  // 디버깅용 로그
  console.log('Calendar data:', { 
    dateRange, 
    eventsCount: data?.events?.length, 
    projectsCount: data?.projects?.length,
    isLoading,
    isFetching,
    error: error?.message 
  });

  const reschedule = useRescheduleEvent();

  // 날짜 변경 시 현재 날짜만 업데이트 (데이터 재요청 없음)
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
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

  const events = useMemo(() => 
    data?.events.map(event => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      backgroundColor: event.color,
      borderColor: event.color,
      extendedProps: event.extendedProps,
    })) || []
  , [data?.events]);

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

      <div className="flex-1 min-h-0 relative">
        {/* 로딩 인디케이터 - 캘린더 위에 오버레이 */}
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        
        {/* 에러 표시 */}
        {error && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="text-center p-4">
              <p className="text-destructive font-medium">캘린더 데이터를 불러오는데 실패했습니다</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          </div>
        )}
        
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          initialDate={stableInitialDate}
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
