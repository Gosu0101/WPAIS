'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, CalendarEventsResponse, CalendarEventType, RescheduleEventResponse } from '../api/client';

export interface UseCalendarEventsParams {
  startDate: Date;
  endDate: Date;
  projectId?: string;
  projectIds?: string[];
  types?: CalendarEventType[];
  enabled?: boolean;
}

export function useCalendarEvents({
  startDate,
  endDate,
  projectId,
  projectIds,
  types,
  enabled = true,
}: UseCalendarEventsParams) {
  return useQuery<CalendarEventsResponse>({
    queryKey: ['calendar-events', startDate.toISOString(), endDate.toISOString(), projectId, projectIds, types],
    queryFn: () => {
      if (projectId) {
        return apiClient.calendar.getProjectEvents(projectId, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          types,
        });
      }
      return apiClient.calendar.getEvents({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        projectIds,
        types,
      });
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
}

export function useRescheduleEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    RescheduleEventResponse,
    Error,
    { eventId: string; newDate: string; eventType: CalendarEventType }
  >({
    mutationFn: ({ eventId, newDate, eventType }) =>
      apiClient.calendar.rescheduleEvent(eventId, { newDate, eventType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
