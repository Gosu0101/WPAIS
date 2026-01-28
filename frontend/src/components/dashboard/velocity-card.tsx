"use client";

import { TrendingUp, TrendingDown, Minus, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVelocity } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface VelocityCardProps {
  projectId: string;
}

interface VelocityApiResponse {
  velocity: {
    actualVelocity: number;
    requiredVelocity: number;
    velocityDeficit: number;
    isDeficient: boolean;
  };
  trend: {
    data: { date: string; velocity: number }[];
    direction: "UP" | "DOWN" | "STABLE";
  };
}

export function VelocityCard({ projectId }: VelocityCardProps) {
  const { data, isLoading, error } = useVelocity(projectId);
  const velocityData = data as VelocityApiResponse | undefined;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" />
            속도 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !velocityData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" />
            속도 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const currentVelocity = velocityData.velocity?.actualVelocity ?? 0;
  const requiredVelocity = velocityData.velocity?.requiredVelocity ?? 1;
  const isDeficient = velocityData.velocity?.isDeficient ?? false;
  const trend = velocityData.trend?.direction ?? "STABLE";
  const history = velocityData.trend?.data ?? [];

  const velocityRatio = requiredVelocity > 0 ? (currentVelocity / requiredVelocity) * 100 : 0;
  const isOnTrack = !isDeficient;

  const getTrendIcon = () => {
    switch (trend) {
      case "UP":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "DOWN":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case "UP":
        return "상승 중";
      case "DOWN":
        return "하락 중";
      default:
        return "유지";
    }
  };

  // 차트 계산
  const maxVelocity = history.length > 0 
    ? Math.max(...history.map((h) => h.velocity), requiredVelocity) * 1.2
    : requiredVelocity * 1.5;
  const chartHeight = 120;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            속도 분석
          </span>
          <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            {getTrendIcon()}
            {getTrendLabel()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 속도 비교 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 현재 속도 */}
              <div
                className={cn(
                  "rounded-lg p-4 text-center",
                  isOnTrack ? "bg-green-500/10" : "bg-destructive/10"
                )}
              >
                <p className="text-xs text-muted-foreground">현재 속도</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    isOnTrack ? "text-green-500" : "text-destructive"
                  )}
                >
                  {currentVelocity.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">페이지/일</p>
              </div>

              {/* 필요 속도 */}
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <p className="text-xs text-muted-foreground">필요 속도</p>
                <p className="text-2xl font-bold text-primary">
                  {requiredVelocity.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">페이지/일</p>
              </div>
            </div>

            {/* 달성률 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">달성률</span>
                <span
                  className={cn(
                    "font-medium",
                    isOnTrack ? "text-green-500" : "text-destructive"
                  )}
                >
                  {velocityRatio.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isOnTrack ? "bg-green-500" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(velocityRatio, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 트렌드 라인 차트 */}
          <div className="lg:col-span-2">
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">
              속도 추이
            </h4>
            {history.length > 0 ? (
              <div className="relative" style={{ height: chartHeight }}>
                {/* 필요 속도 기준선 */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-primary/50"
                  style={{
                    bottom: `${(requiredVelocity / maxVelocity) * chartHeight}px`,
                  }}
                >
                  <span className="absolute -top-3 right-0 text-xs text-primary">
                    필요: {requiredVelocity.toFixed(1)}
                  </span>
                </div>

                {/* 라인 차트 */}
                <svg className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`
                      M 0 ${chartHeight}
                      ${history
                        .map((h, i) => {
                          const x = (i / (history.length - 1)) * 100;
                          const y = chartHeight - (h.velocity / maxVelocity) * chartHeight;
                          return `L ${x}% ${y}`;
                        })
                        .join(" ")}
                      L 100% ${chartHeight}
                      Z
                    `}
                    fill="url(#velocityGradient)"
                  />
                  <path
                    d={history
                      .map((h, i) => {
                        const x = (i / (history.length - 1)) * 100;
                        const y = chartHeight - (h.velocity / maxVelocity) * chartHeight;
                        return `${i === 0 ? "M" : "L"} ${x}% ${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {history.map((h, i) => {
                    const x = (i / (history.length - 1)) * 100;
                    const y = chartHeight - (h.velocity / maxVelocity) * chartHeight;
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={y}
                        r="4"
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>

                {/* X축 레이블 */}
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  {history.map((h, i) => (
                    <span key={i}>{h.date}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                속도 추이 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
