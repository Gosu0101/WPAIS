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
  // 날짜를 년-월 형식으로 단순화하여 queryKey 안정화
  const startKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
  const endKey = `${endDate.getFullYear()}-${endDate.getMonth()}`;
  
  return useQuery<CalendarEventsResponse>({
    queryKey: ['calendar-events', startKey, endKey, projectId, projectIds?.join(','), types?.join(',')],
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
    staleTime: 5 * 60 * 1000, // 5분 캐시
    gcTime: 10 * 60 * 1000, // 10분 가비지 컨렉션
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
