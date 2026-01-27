"use client";

import { BarChart3, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDashboard } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface ProgressChartProps {
  projectId: string;
}

// 임시 에피소드 데이터 (실제로는 API에서 가져옴)
interface EpisodeProgress {
  number: number;
  progress: number;
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
}

// 공정별 진행률 데이터
interface TaskBreakdown {
  background: number;
  lineArt: number;
  coloring: number;
  postProcessing: number;
}

export function ProgressChart({ projectId }: ProgressChartProps) {
  const { data: dashboard, isLoading } = useDashboard(projectId);

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

  // 임시 데이터 (실제로는 API 응답에서 가져옴)
  const episodes: EpisodeProgress[] = [
    { number: 1, progress: 100, status: "COMPLETED" },
    { number: 2, progress: 100, status: "COMPLETED" },
    { number: 3, progress: 85, status: "IN_PROGRESS" },
    { number: 4, progress: 60, status: "IN_PROGRESS" },
    { number: 5, progress: 30, status: "IN_PROGRESS" },
    { number: 6, progress: 0, status: "NOT_STARTED" },
    { number: 7, progress: 0, status: "NOT_STARTED" },
    { number: 8, progress: 0, status: "NOT_STARTED" },
  ];

  const taskBreakdown: TaskBreakdown = {
    background: 75,
    lineArt: 60,
    coloring: 45,
    postProcessing: 30,
  };

  const overallProgress = dashboard?.progress?.progressPercentage ?? 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "IN_PROGRESS":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const taskLabels = {
    background: "배경",
    lineArt: "선화",
    coloring: "채색",
    postProcessing: "후보정",
  };

  const taskColors = {
    background: "bg-blue-500",
    lineArt: "bg-purple-500",
    coloring: "bg-pink-500",
    postProcessing: "bg-orange-500",
  };

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
            <div className="space-y-2">
              {episodes.map((ep) => (
                <div key={ep.number} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-muted-foreground">
                    EP{ep.number}
                  </span>
                  <div className="flex-1">
                    <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          getStatusColor(ep.status)
                        )}
                        style={{ width: `${ep.progress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {ep.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 공정별 breakdown */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PieChart className="h-3.5 w-3.5" />
              공정별 진행률
            </h4>
            <div className="space-y-3">
              {(Object.keys(taskBreakdown) as Array<keyof TaskBreakdown>).map(
                (task) => (
                  <div key={task} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("h-2 w-2 rounded-full", taskColors[task])}
                        />
                        {taskLabels[task]}
                      </span>
                      <span className="font-medium">{taskBreakdown[task]}%</span>
                    </div>
                    <Progress
                      value={taskBreakdown[task]}
                      className={cn(
                        "h-2",
                        `[&>div]:${taskColors[task].replace("bg-", "bg-")}`
                      )}
                    />
                  </div>
                )
              )}
            </div>

            {/* 파이 차트 시각화 (간단한 도넛 차트) */}
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
                    const total = Object.values(taskBreakdown).reduce((a, b) => a + b, 0);
                    let offset = 0;
                    const circumference = 2 * Math.PI * 40;
                    const colors = ["#3b82f6", "#a855f7", "#ec4899", "#f97316"];
                    
                    return Object.values(taskBreakdown).map((value, index) => {
                      const percentage = value / total;
                      const strokeDasharray = `${percentage * circumference} ${circumference}`;
                      const strokeDashoffset = -offset * circumference;
                      offset += percentage;
                      
                      return (
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={colors[index]}
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
                    {Math.round(
                      Object.values(taskBreakdown).reduce((a, b) => a + b, 0) / 4
                    )}%
                  </span>
                  <span className="text-xs text-muted-foreground">평균</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
