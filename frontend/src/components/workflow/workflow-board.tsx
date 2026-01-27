"use client";

import { Page } from "@/lib/api/client";
import { PageWorkflowCard, TaskType } from "./page-workflow-card";

interface WorkflowBoardProps {
  pages: Page[];
  onStartTask?: (pageId: string, taskType: TaskType) => void;
  onCompleteTask?: (pageId: string, taskType: TaskType) => void;
  isLoading?: boolean;
  loadingPageId?: string | null;
  loadingTask?: TaskType | null;
}

export function WorkflowBoard({ 
  pages, 
  onStartTask, 
  onCompleteTask,
  isLoading = false,
  loadingPageId = null,
  loadingTask = null,
}: WorkflowBoardProps) {
  if (!pages || pages.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        페이지가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {pages.map((page) => (
        <PageWorkflowCard 
          key={page.id} 
          page={page}
          onStartTask={onStartTask}
          onCompleteTask={onCompleteTask}
          isLoading={isLoading && loadingPageId === page.id}
          loadingTask={loadingPageId === page.id ? loadingTask : null}
        />
      ))}
    </div>
  );
}
