"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, Lock, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkflowBoard } from "@/components/workflow";
import { TaskType } from "@/components/workflow/page-workflow-card";
import { EpisodeStatusBadge } from "@/components/episodes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEpisodeWorkflow, useStartTask, useCompleteTask } from "@/lib/hooks";

interface EpisodeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EpisodeDetailPage({ params }: EpisodeDetailPageProps) {
  const { id } = use(params);
  
  // 자동 갱신이 포함된 에피소드 워크플로우 훅 사용
  const { 
    data: episode, 
    isLoading, 
    error, 
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useEpisodeWorkflow(id);
  
  // 낙관적 업데이트가 포함된 mutation 훅
  const startTaskMutation = useStartTask(id);
  const completeTaskMutation = useCompleteTask(id);
  
  // 로딩 상태 관리
  const [loadingPageId, setLoadingPageId] = useState<string | null>(null);
  const [loadingTask, setLoadingTask] = useState<TaskType | null>(null);

  // 작업 시작 핸들러 (낙관적 업데이트)
  const handleStartTask = useCallback(async (pageId: string, taskType: TaskType) => {
    setLoadingPageId(pageId);
    setLoadingTask(taskType);
    try {
      await startTaskMutation.mutateAsync({ pageId, taskType });
    } catch (error) {
      console.error("Failed to start task:", error);
    } finally {
      setLoadingPageId(null);
      setLoadingTask(null);
    }
  }, [startTaskMutation]);

  // 작업 완료 핸들러 (낙관적 업데이트)
  const handleCompleteTask = useCallback(async (pageId: string, taskType: TaskType) => {
    setLoadingPageId(pageId);
    setLoadingTask(taskType);
    try {
      await completeTaskMutation.mutateAsync({ pageId, taskType });
    } catch (error) {
      console.error("Failed to complete task:", error);
    } finally {
      setLoadingPageId(null);
      setLoadingTask(null);
    }
  }, [completeTaskMutation]);

  // 수동 새로고침
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <AppLayout title="로딩 중..." subtitle="에피소드 정보를 불러오는 중입니다">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !episode) {
    return (
      <AppLayout title="에피소드를 찾을 수 없습니다">
        <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
          <p>요청한 에피소드가 존재하지 않습니다.</p>
          <Button variant="outline" asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              프로젝트 목록으로
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const dueDate = new Date(episode.dueDate);
  const isOverdue = dueDate < new Date() && episode.status !== "COMPLETED";
  const completedPages = episode.pages?.filter(
    (p) =>
      p.backgroundStatus === "DONE" &&
      p.lineArtStatus === "DONE" &&
      p.coloringStatus === "DONE" &&
      p.postProcessingStatus === "DONE"
  ).length ?? 0;
  const totalPages = episode.pages?.length ?? 0;
  const progress = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;
  
  // 마지막 업데이트 시간
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <AppLayout
      title={`EP.${episode.episodeNumber.toString().padStart(2, "0")}`}
      subtitle="에피소드 상세"
    >
      <div className="space-y-6">
        {/* Episode Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EpisodeStatusBadge status={episode.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Calendar className="mr-1 inline h-4 w-4" />
                마감일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className={isOverdue ? "text-destructive" : ""}>
                {format(dueDate, "yyyy.MM.dd (EEE)", { locale: ko })}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="ml-2">
                  지연
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Clock className="mr-1 inline h-4 w-4" />
                제작 기간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-semibold">{episode.duration}</span>
              <span className="text-muted-foreground">일</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                진행률
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-lg font-semibold">{progress}%</span>
              <span className="text-sm text-muted-foreground">
                ({completedPages}/{totalPages} 페이지)
              </span>
              {episode.isSealed && (
                <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
                  <Lock className="mr-1 h-3 w-3" />
                  봉인
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Board */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>페이지 워크플로우</CardTitle>
            <div className="flex items-center gap-2">
              {/* 마지막 업데이트 시간 */}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {format(lastUpdated, "HH:mm:ss")} 업데이트
                </span>
              )}
              {/* 새로고침 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <WorkflowBoard 
              pages={episode.pages ?? []}
              onStartTask={handleStartTask}
              onCompleteTask={handleCompleteTask}
              isLoading={loadingPageId !== null}
              loadingPageId={loadingPageId}
              loadingTask={loadingTask}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
