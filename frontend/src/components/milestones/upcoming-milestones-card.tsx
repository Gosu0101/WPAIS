"use client";

import { format, differenceInDays, isFuture, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Clock,
  Flag,
  AlertCircle,
  Calendar,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMilestones } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneType } from "@/lib/api/client";

interface UpcomingMilestonesCardProps {
  projectId: string;
}

const getMilestoneLabel = (type: MilestoneType): string => {
  switch (type) {
    case "PLANNING_COMPLETE":
      return "기획 완료";
    case "HIRING_COMPLETE":
      return "채용 완료";
    case "PRODUCTION_START":
      return "제작 시작";
    case "EPISODE_3_COMPLETE":
      return "3화 완료";
    case "EPISODE_5_COMPLETE":
      return "5화 완료";
    case "EPISODE_7_SEAL":
      return "7화 봉인";
    case "LAUNCH":
      return "런칭";
    default:
      return type;
  }
};

interface UpcomingMilestoneItemProps {
  milestone: Milestone;
}

function UpcomingMilestoneItem({ milestone }: UpcomingMilestoneItemProps) {
  const targetDate = new Date(milestone.targetDate);
  const today = new Date();
  const daysUntil = differenceInDays(targetDate, today);
  const isDueToday = isToday(targetDate);
  const isUrgent = daysUntil <= 3;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 transition-colors",
        isDueToday
          ? "border-destructive/50 bg-destructive/5"
          : isUrgent
            ? "border-warning/50 bg-warning/5"
            : "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isDueToday
              ? "bg-destructive/10 text-destructive"
              : isUrgent
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary"
          )}
        >
          {isDueToday ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        <div>
          <h4 className="font-medium">{milestone.name}</h4>
          <p className="text-xs text-muted-foreground">
            {getMilestoneLabel(milestone.type)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge
          variant="outline"
          className={cn(
            "mb-1",
            isDueToday
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : isUrgent
                ? "border-warning/50 bg-warning/10 text-warning"
                : "border-primary/50 bg-primary/10 text-primary"
          )}
        >
          {isDueToday ? "오늘" : `D-${daysUntil}`}
        </Badge>
        <p className="text-xs text-muted-foreground">
          {format(targetDate, "M월 d일 (EEE)", { locale: ko })}
        </p>
      </div>
    </div>
  );
}

export function UpcomingMilestonesCard({
  projectId,
}: UpcomingMilestonesCardProps) {
  const { data: milestones, isLoading } = useMilestones(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4" />
            다가오는 마일스톤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 7일 이내 미완료 마일스톤 필터링
  const today = new Date();
  const upcomingMilestones = (milestones ?? [])
    .filter((m) => {
      if (m.isCompleted) return false;
      const targetDate = new Date(m.targetDate);
      const daysUntil = differenceInDays(targetDate, today);
      return (isFuture(targetDate) || isToday(targetDate)) && daysUntil <= 7;
    })
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );

  const hasUrgent = upcomingMilestones.some((m) => {
    const daysUntil = differenceInDays(new Date(m.targetDate), today);
    return daysUntil <= 3;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            다가오는 마일스톤
          </span>
          {upcomingMilestones.length > 0 && (
            <Badge
              variant="outline"
              className={cn(
                hasUrgent
                  ? "border-warning/50 bg-warning/10 text-warning"
                  : "border-primary/50 bg-primary/10 text-primary"
              )}
            >
              {upcomingMilestones.length}개
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingMilestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              7일 이내 예정된 마일스톤이 없습니다
            </p>
          </div>
        ) : (
          <>
            {upcomingMilestones.map((milestone) => (
              <UpcomingMilestoneItem key={milestone.id} milestone={milestone} />
            ))}
            <Button
              variant="ghost"
              className="w-full justify-between text-muted-foreground"
              asChild
            >
              <Link href={`/projects/${projectId}/milestones`}>
                전체 마일스톤 보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
