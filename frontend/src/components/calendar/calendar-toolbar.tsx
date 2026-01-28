'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarViewType } from './calendar-view';

export interface CalendarToolbarProps {
  currentView: CalendarViewType;
  currentDate: Date;
  onViewChange: (view: CalendarViewType) => void;
  onNavigate: (action: 'prev' | 'next' | 'today') => void;
  onDateChange: (date: Date) => void;
}

const VIEW_LABELS: Record<CalendarViewType, string> = {
  dayGridMonth: '월',
  timeGridWeek: '주',
  timeGridDay: '일',
};

export function CalendarToolbar({
  currentView,
  currentDate,
  onViewChange,
  onNavigate,
}: CalendarToolbarProps) {
  const getDateLabel = () => {
    switch (currentView) {
      case 'dayGridMonth':
        return format(currentDate, "yyyy'년' M'월'", { locale: ko });
      case 'timeGridWeek':
        return format(currentDate, "yyyy'년' M'월' wo", { locale: ko });
      case 'timeGridDay':
        return format(currentDate, "yyyy'년' M'월' d'일' (EEE)", { locale: ko });
      default:
        return format(currentDate, "yyyy'년' M'월'", { locale: ko });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => onNavigate('today')}>
          오늘
        </Button>
        <h2 className="text-lg font-semibold ml-4">{getDateLabel()}</h2>
      </div>

      <div className="flex items-center gap-1">
        {(Object.keys(VIEW_LABELS) as CalendarViewType[]).map((view) => (
          <Button
            key={view}
            variant={currentView === view ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange(view)}
          >
            {VIEW_LABELS[view]}
          </Button>
        ))}
      </div>
    </div>
  );
}
