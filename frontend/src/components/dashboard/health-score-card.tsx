"use client";

import { Activity, CheckCircle2, AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealth } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { HealthData, HealthStatus } from "@/lib/api/client";

interface HealthScoreCardProps {
  projectId: string;
}

export function HealthScoreCard({ projectId }: HealthScoreCardProps) {
  const { data, isLoading, error } = useHealth(projectId);
  const healthData = data as HealthData | undefined;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            건강 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            건강 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  // 실제 API 데이터 사용 (healthScore 필드명 매핑)
  const score = healthData?.healthScore ?? 0;
  const status = healthData?.status ?? "HEALTHY";
  const recommendations = healthData?.recommendations ?? [];

  const getStatusConfig = (status: HealthStatus) => {
    switch (status) {
      case "CRITICAL":
        return {
          icon: XCircle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          label: "위험",
        };
      case "WARNING":
        return {
          icon: AlertCircle,
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          label: "경고",
        };
      case "ATTENTION":
        return {
          icon: AlertTriangle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          label: "주의",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          label: "양호",
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  // 점수에 따른 게이지 색상
  const getScoreColor = (score: number) => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 60) return "stroke-warning";
    return "stroke-destructive";
  };

  // SVG 원형 게이지 계산
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            건강 점수
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 점수 게이지 */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="h-24 w-24 -rotate-90 transform">
              {/* 배경 원 */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* 진행 원 */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-500", getScoreColor(score))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
        </div>

        {/* 권장 조치 목록 */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">권장 조치</p>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            현재 권장 조치 사항이 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  );
}
