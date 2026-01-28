'use client';

import { CalendarProject } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

export interface ProjectSelectorProps {
  projects: CalendarProject[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ProjectSelector({
  projects,
  selectedIds,
  onSelectionChange,
}: ProjectSelectorProps) {
  const toggleProject = (projectId: string) => {
    if (selectedIds.includes(projectId)) {
      onSelectionChange(selectedIds.filter(id => id !== projectId));
    } else {
      onSelectionChange([...selectedIds, projectId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(projects.map(p => p.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const allSelected = selectedIds.length === projects.length;
  const noneSelected = selectedIds.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">프로젝트 선택</h4>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
            disabled={allSelected}
          >
            전체 선택
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={deselectAll}
            className="text-xs text-primary hover:underline"
            disabled={noneSelected}
          >
            전체 해제
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {projects.map((project) => {
          const isSelected = selectedIds.includes(project.id) || selectedIds.length === 0;
          return (
            <button
              key={project.id}
              onClick={() => toggleProject(project.id)}
              className="flex items-center gap-2 w-full text-left hover:bg-accent rounded p-1"
            >
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-sm">{project.title}</span>
            </button>
          );
        })}
      </div>

      {projects.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {selectedIds.length === 0
              ? '모든 프로젝트 표시 중'
              : `${selectedIds.length}개 프로젝트 선택됨`}
          </p>
        </div>
      )}
    </div>
  );
}
