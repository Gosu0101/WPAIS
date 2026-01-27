"use client";

import { Shield, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBufferStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface BufferStatusCardProps {
  projectId: string;
}

export function BufferStatusCard({ projectId }: BufferStatusCardProps) {
  const { data: bufferStatus, isLoading } = useBufferStatus(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            버퍼 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bufferStatus) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            버퍼 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const {
    sealedEpisodes,
    reserveEpisodes,
    sealTarget,
    reserveTarget,
    sealProgress,
    reserveProgress,
    isOnTrack,
  } = bufferStatus;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            7+3 버퍼 상태
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              isOnTrack
                ? "bg-green-500/10 text-green-500"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {isOnTrack ? "정상" : "주의"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 봉인 에피소드 (7개 목표) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              봉인 에피소드
            </span>
            <span className="font-medium">
              {sealedEpisodes} / {sealTarget}
            </span>
          </div>
          <Progress
            value={sealProgress}
            className={cn(
              "h-2.5",
              sealProgress >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-primary"
            )}
          />
        </div>

        {/* 비축 에피소드 (3개 목표) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Archive className="h-3.5 w-3.5 text-blue-500" />
              비축 에피소드
            </span>
            <span className="font-medium">
              {reserveEpisodes} / {reserveTarget}
            </span>
          </div>
          <Progress
            value={reserveProgress}
            className={cn(
              "h-2.5",
              reserveProgress >= 100
                ? "[&>div]:bg-green-500"
                : "[&>div]:bg-blue-500"
            )}
          />
        </div>

        {/* 총 완료 현황 */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">총 완료</span>
            <span className="font-semibold">
              {sealedEpisodes + reserveEpisodes} / {sealTarget + reserveTarget} 에피소드
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
