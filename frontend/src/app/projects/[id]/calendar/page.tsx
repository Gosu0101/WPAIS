'use client';

import { use } from 'react';
import { CalendarView } from '@/components/calendar';

interface ProjectCalendarPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectCalendarPage({ params }: ProjectCalendarPageProps) {
  const { id } = use(params);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <CalendarView projectId={id} />
    </div>
  );
}
