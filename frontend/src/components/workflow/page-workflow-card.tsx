"use client";

import { Page, TaskStatus } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusIndicator } from "./task-status-indicator";
import { cn } from "@/lib/utils";
import { ArrowDown, Unlock, Play, CheckCircle, Sparkles } from "lucide-react";

export interface PageWorkflowCardProps {
  page: Page;
  onStartTask?: (pageId: string, taskType: TaskType) => void;
  onCompleteTask?: (pageId: string, taskType: TaskType) => void;
  isLoading?: boolean;
  loadingTask?: TaskType | null;
}

export type TaskType = "background" | "lineArt" | "coloring" | "postProcessing";

export const taskLabels: Record<TaskType, string> = {
  background: "배경",
  lineArt: "선화",
  coloring: "채색",
  postProcessing: "후보정",
};

export const taskOrder: TaskType[] = ["background", "lineArt", "coloring", "postProcessing"];

export function getTaskStatus(page: Page, taskType: TaskType): TaskStatus {
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

export function calculateProgress(page: Page): number {
  const statuses = [
    page.backgroundStatus,
    page.lineArtStatus,
    page.coloringStatus,
    page.postProcessingStatus,
  ];
  const completed = statuses.filter((s) => s === "DONE").length;
  return Math.round((completed / 4) * 100);
}

// 다음 공정이 잠금 해제될 예정인지 확인
function willUnlockNext(page: Page, taskType: TaskType): boolean {
  const currentStatus = getTaskStatus(page, taskType);
  if (currentStatus !== "IN_PROGRESS") return false;
  
  const currentIndex = taskOrder.indexOf(taskType);
  if (currentIndex >= taskOrder.length - 1) return false;
  
  const nextTaskType = taskOrder[currentIndex + 1];
  const nextStatus = getTaskStatus(page, nextTaskType);
  return nextStatus === "LOCKED";
}

// 이전 공정이 방금 완료되어 잠금이 해제된 상태인지 확인
function isJustUnlocked(page: Page, taskType: TaskType): boolean {
  const currentStatus = getTaskStatus(page, taskType);
  if (currentStatus !== "READY") return false;
  
  const currentIndex = taskOrder.indexOf(taskType);
  if (currentIndex === 0) return false;
  
  const prevTaskType = taskOrder[currentIndex - 1];
  const prevStatus = getTaskStatus(page, prevTaskType);
  return prevStatus === "DONE";
}

// 다음 공정 하이라이트 여부 확인
function shouldHighlightNext(page: Page, taskType: TaskType): boolean {
  const currentStatus = getTaskStatus(page, taskType);
  if (currentStatus !== "DONE") return false;
  
  const currentIndex = taskOrder.indexOf(taskType);
  if (currentIndex >= taskOrder.length - 1) return false;
  
  const nextTaskType = taskOrder[currentIndex + 1];
  const nextStatus = getTaskStatus(page, nextTaskType);
  return nextStatus === "READY";
}

// 상태별 배경 색상 클래스
const statusBgClasses: Record<TaskStatus, string> = {
  LOCKED: "bg-muted/30",
  READY: "bg-info/10 border-l-2 border-l-info",
  IN_PROGRESS: "bg-warning/10 border-l-2 border-l-warning animate-pulse",
  DONE: "bg-primary/10 border-l-2 border-l-primary",
};

// 작업 시작 가능 여부 확인
function canStartTask(status: TaskStatus): boolean {
  return status === "READY";
}

// 작업 완료 가능 여부 확인
function canCompleteTask(status: TaskStatus): boolean {
  return status === "IN_PROGRESS";
}

export function PageWorkflowCard({ 
  page, 
  onStartTask, 
  onCompleteTask,
  isLoading = false,
  loadingTask = null,
}: PageWorkflowCardProps) {
  const progress = calculateProgress(page);
  const isComplete = progress === 100;
  const hasInProgress = taskOrder.some(t => getTaskStatus(page, t) === "IN_PROGRESS");

  const handleStartTask = (taskType: TaskType) => {
    if (onStartTask && !isLoading) {
      onStartTask(page.id, taskType);
    }
  };

  const handleCompleteTask = (taskType: TaskType) => {
    if (onCompleteTask && !isLoading) {
      onCompleteTask(page.id, taskType);
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      isComplete && "border-primary/50 bg-primary/5 shadow-primary/10 shadow-md",
      hasInProgress && !isComplete && "border-warning/30 shadow-warning/10 shadow-sm"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            페이지 {page.pageNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* 진행률 표시 바 */}
            <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  isComplete ? "bg-primary" : "bg-warning"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium tabular-nums",
              isComplete ? "text-primary" : "text-muted-foreground"
            )}>
              {progress}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {taskOrder.map((taskType, index) => {
          const status = getTaskStatus(page, taskType);
          const isLast = index === taskOrder.length - 1;
          const showUnlockHint = willUnlockNext(page, taskType);
          const justUnlocked = isJustUnlocked(page, taskType);
          const highlightNext = shouldHighlightNext(page, taskType);
          const isTaskLoading = isLoading && loadingTask === taskType;
          const showStartButton = canStartTask(status) && onStartTask;
          const showCompleteButton = canCompleteTask(status) && onCompleteTask;
          
          return (
            <div key={taskType} className="relative">
              {/* 공정 상태 행 */}
              <div 
                className={cn(
                  "flex items-center justify-between py-1.5 px-2 rounded-md transition-all",
                  statusBgClasses[status],
                  isTaskLoading && "opacity-50",
                  // 잠금 해제 애니메이션
                  justUnlocked && "ring-2 ring-info ring-offset-1 ring-offset-background animate-[pulse_1s_ease-in-out_2]"
                )}
              >
                <div className="flex items-center gap-2">
                  {/* 잠금 해제 아이콘 */}
                  {justUnlocked && (
                    <Sparkles className="h-3 w-3 text-info animate-bounce" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    status === "DONE" && "text-primary",
                    status === "IN_PROGRESS" && "text-warning",
                    status === "READY" && "text-info",
                    status === "LOCKED" && "text-muted-foreground"
                  )}>
                    {taskLabels[taskType]}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* 작업 시작 버튼 */}
                  {showStartButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 px-2 text-xs text-info hover:text-info hover:bg-info/20",
                        justUnlocked && "animate-pulse"
                      )}
                      onClick={() => handleStartTask(taskType)}
                      disabled={isLoading}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      시작
                    </Button>
                  )}
                  
                  {/* 작업 완료 버튼 */}
                  {showCompleteButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-warning hover:text-warning hover:bg-warning/20"
                      onClick={() => handleCompleteTask(taskType)}
                      disabled={isLoading}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      완료
                    </Button>
                  )}
                  
                  <TaskStatusIndicator 
                    status={status} 
                    size="sm" 
                    showLabel={false}
                    isLoading={isTaskLoading}
                  />
                </div>
              </div>
              
              {/* 공정 간 연결선 및 잠금 해제 힌트 */}
              {!isLast && (
                <div className="flex justify-center py-0.5">
                  {showUnlockHint ? (
                    <div className="flex items-center gap-1 text-info animate-bounce">
                      <Unlock className="h-3 w-3" />
                      <ArrowDown className="h-3 w-3" />
                    </div>
                  ) : highlightNext ? (
                    <div className="flex items-center gap-1 text-info">
                      <ArrowDown className="h-3 w-3 animate-pulse" />
                    </div>
                  ) : (
                    <ArrowDown className={cn(
                      "h-3 w-3",
                      status === "DONE" ? "text-primary/50" : "text-muted-foreground/30"
                    )} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
