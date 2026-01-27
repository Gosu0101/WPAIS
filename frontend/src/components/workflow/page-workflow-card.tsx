"use client";

import { Page, TaskStatus } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusIndicator } from "./task-status-indicator";
import { cn } from "@/lib/utils";

interface PageWorkflowCardProps {
  page: Page;
}

type TaskType = "background" | "lineArt" | "coloring" | "postProcessing";

const taskLabels: Record<TaskType, string> = {
  background: "배경",
  lineArt: "선화",
  coloring: "채색",
  postProcessing: "후보정",
};

const taskOrder: TaskType[] = ["background", "lineArt", "coloring", "postProcessing"];

function getTaskStatus(page: Page, taskType: TaskType): TaskStatus {
  switch (taskType) {
    case "background":
      return page.backgroundStatus;
    case "lineArt":
      return page.lineArtStatus;
    case "coloring":
      return page.coloringStatus;
    case "postProcessing":
      return page.postProcessingStatus;
  }
}

function calculateProgress(page: Page): number {
  const statuses = [
    page.backgroundStatus,
    page.lineArtStatus,
    page.coloringStatus,
    page.postProcessingStatus,
  ];
  const completed = statuses.filter((s) => s === "DONE").length;
  return Math.round((completed / 4) * 100);
}

export function PageWorkflowCard({ page }: PageWorkflowCardProps) {
  const progress = calculateProgress(page);
  const isComplete = progress === 100;

  return (
    <Card className={cn(
      "transition-all",
      isComplete && "border-primary/50 bg-primary/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            페이지 {page.pageNumber}
          </CardTitle>
          <span className={cn(
            "text-xs font-medium",
            isComplete ? "text-primary" : "text-muted-foreground"
          )}>
            {progress}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {taskOrder.map((taskType, index) => {
          const status = getTaskStatus(page, taskType);
          const isLast = index === taskOrder.length - 1;
          
          return (
            <div key={taskType} className="relative">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">
                  {taskLabels[taskType]}
                </span>
                <TaskStatusIndicator status={status} size="sm" />
              </div>
              {!isLast && (
                <div className="absolute left-1/2 -bottom-1 h-2 w-px bg-border" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
