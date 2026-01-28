'use client';

import { CalendarEventType, CalendarProject } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

export interface CalendarFilter {
  eventTypes: CalendarEventType[];
  episodeStatuses: string[];
  taskTypes: string[];
  projectIds: string[];
}

export interface CalendarFiltersProps {
  filters: CalendarFilter;
  projects: CalendarProject[];
  onFilterChange: (filters: CalendarFilter) => void;
}

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  episode: '에피소드',
  milestone: '마일스톤',
  task: '작업',
};

export function CalendarFilters({
  filters,
  projects,
  onFilterChange,
}: CalendarFiltersProps) {
  const toggleEventType = (type: CalendarEventType) => {
    const newTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter(t => t !== type)
      : [...filters.eventTypes, type];
    onFilterChange({ ...filters, eventTypes: newTypes });
  };

  const toggleProject = (projectId: string) => {
    const newProjectIds = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter(id => id !== projectId)
      : [...filters.projectIds, projectId];
    onFilterChange({ ...filters, projectIds: newProjectIds });
  };

  const clearFilters = () => {
    onFilterChange({
      eventTypes: ['episode', 'milestone', 'task'],
      episodeStatuses: [],
      taskTypes: [],
      projectIds: [],
    });
  };

  const hasActiveFilters = 
    filters.eventTypes.length < 3 || 
    filters.projectIds.length > 0;

  return (
    <div className="p-4 border-b space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">필터</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2">
            <X className="h-3 w-3 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">타입:</span>
        {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => (
          <Badge
            key={type}
            variant={filters.eventTypes.includes(type) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleEventType(type)}
          >
            {EVENT_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">프로젝트:</span>
          {projects.map((project) => (
            <Badge
              key={project.id}
              variant={filters.projectIds.includes(project.id) || filters.projectIds.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer"
              style={{
                backgroundColor: filters.projectIds.includes(project.id) || filters.projectIds.length === 0 
                  ? project.color 
                  : undefined,
                borderColor: project.color,
              }}
              onClick={() => toggleProject(project.id)}
            >
              {project.title}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
