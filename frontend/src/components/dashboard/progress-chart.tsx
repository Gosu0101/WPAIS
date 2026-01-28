"use client";

import { BarChart3, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboard } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { EpisodeProgress, StageProgress, TaskType } from "@/lib/api/client";

interface ProgressChartProps {
  projectId: string;
}

const taskLabels: Record<TaskType, string> = {
  BACKGROUND: "배경",
  LINE_ART: "선화",
  COLORING: "채색",
  POST_PROCESSING: "후보정",
};

const taskColors: Record<TaskType, string> = {
  BACKGROUND: "bg-blue-500",
  LINE_ART: "bg-purple-500",
  COLORING: "bg-pink-500",
  POST_PROCESSING: "bg-orange-500",
};

const taskColorValues: Record<TaskType, string> = {
  BACKGROUND: "#3b82f6",
  LINE_ART: "#a855f7",
  COLORING: "#ec4899",
  POST_PROCESSING: "#f97316",
};

export function ProgressChart({ projectId }: ProgressChartProps) {
  const { data: dashboard, isLoading, error } = useDashboard(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            진행률 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !dashboard) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            진행률 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const { progress } = dashboard;
  const overallProgress = progress?.progressPercentage ?? 0;
  const episodeProgress = progress?.episodeProgress ?? [];
  const stageProgress = progress?.stageProgress ?? [];

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage > 0) return "bg-primary";
    return "bg-muted";
  };

  // 공정별 진행률을 객체로 변환
  const stageProgressMap = stageProgress.reduce((acc, sp) => {
    acc[sp.stage] = sp.progressPercentage;
    return acc;
  }, {} as Record<TaskType, number>);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            진행률 현황
          </span>
          <span className="text-2xl font-bold text-primary">
            {overallProgress.toFixed(1)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 에피소드별 진행률 바 차트 */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              에피소드별 진행률
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {episodeProgress.length > 0 ? (
                episodeProgress.map((ep) => (
                  <div key={ep.episodeId} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-muted-foreground">
                      EP{ep.episodeNumber}
                    </span>
                    <div className="flex-1">
                      <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            getStatusColor(ep.progressPercentage)
                          )}
                          style={{ width: `${ep.progressPercentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {ep.progressPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  에피소드 데이터가 없습니다
                </p>
              )}
            </div>
          </div>

          {/* 공정별 breakdown */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PieChart className="h-3.5 w-3.5" />
              공정별 진행률
            </h4>
            <div className="space-y-3">
              {stageProgress.length > 0 ? (
                stageProgress.map((sp) => (
                  <div key={sp.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("h-2 w-2 rounded-full", taskColors[sp.stage])}
                        />
                        {taskLabels[sp.stage]}
                      </span>
                      <span className="font-medium">{sp.progressPercentage}%</span>
                    </div>
                    <Progress
                      value={sp.progressPercentage}
                      className="h-2"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  공정 데이터가 없습니다
                </p>
              )}
            </div>

            {/* 파이 차트 시각화 */}
            {stageProgress.length > 0 && (
              <div className="mt-4 flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* 배경 원 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-muted"
                    />
                    {/* 각 공정별 세그먼트 */}
                    {(() => {
                      const total = stageProgress.reduce((sum, sp) => sum + sp.progressPercentage, 0);
                      if (total === 0) return null;
                      
                      let offset = 0;
                      const circumference = 2 * Math.PI * 40;
                      
                      return stageProgress.map((sp) => {
                        const percentage = sp.progressPercentage / total;
                        const strokeDasharray = `${percentage * circumference} ${circumference}`;
                        const strokeDashoffset = -offset * circumference;
                        offset += percentage;
                        
                        return (
                          <circle
                            key={sp.stage}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={taskColorValues[sp.stage]}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                      {stageProgress.length > 0
                        ? Math.round(
                            stageProgress.reduce((sum, sp) => sum + sp.progressPercentage, 0) /
                              stageProgress.length
                          )
                        : 0}%
                    </span>
                    <span className="text-xs text-muted-foreground">평균</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
