"use client";

import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Rocket,
  Users,
  FileCheck,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMilestones } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneType } from "@/lib/api/client";

interface MilestoneTimelineProps {
  projectId: string;
}

const getMilestoneIcon = (type: MilestoneType) => {
  switch (type) {
    case "PLANNING_COMPLETE":
      return FileCheck;
    case "HIRING_COMPLETE":
      return Users;
    case "PRODUCTION_START":
      return Rocket;
    case "EPISODE_3_COMPLETE":
    case "EPISODE_5_COMPLETE":
    case "EPISODE_7_SEAL":
      return Flag;
    case "LAUNCH":
      return Calendar;
    default:
      return Circle;
  }
};

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

interface MilestoneItemProps {
  milestone: Milestone;
  isLast: boolean;
}

function MilestoneItem({ milestone, isLast }: MilestoneItemProps) {
  const targetDate = new Date(milestone.targetDate);
  const today = new Date();
  const daysUntil = differenceInDays(targetDate, today);
  const isUpcoming = isFuture(targetDate) && daysUntil <= 7 && daysUntil >= 0;
  const isOverdue = isPast(targetDate) && !milestone.isCompleted;

  const Icon = getMilestoneIcon(milestone.type);

  return (
    <div className="relative flex gap-4">
      {/* 타임라인 라인 */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5",
            milestone.isCompleted ? "bg-green-500/50" : "bg-muted"
          )}
        />
      )}

      {/* 아이콘 */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
          milestone.isCompleted
            ? "border-green-500 bg-green-500/10 text-green-500"
            : isOverdue
              ? "border-destructive bg-destructive/10 text-destructive"
              : isUpcoming
                ? "border-warning bg-warning/10 text-warning"
                : "border-muted bg-background text-muted-foreground"
        )}
      >
        {milestone.isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 pb-6">
        <div
          className={cn(
            "rounded-lg border p-3 transition-colors",
            milestone.isCompleted
              ? "border-green-500/20 bg-green-500/5"
              : isOverdue
                ? "border-destructive/20 bg-destructive/5"
                : isUpcoming
                  ? "border-warning/20 bg-warning/5"
                  : "border-border bg-card"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className="font-medium leading-none">{milestone.name}</h4>
              <p className="text-xs text-muted-foreground">
                {getMilestoneLabel(milestone.type)}
              </p>
            </div>
            {isUpcoming && !milestone.isCompleted && (
              <Badge
                variant="outline"
                className="shrink-0 border-warning/50 bg-warning/10 text-warning"
              >
                <Clock className="mr-1 h-3 w-3" />
                D-{daysUntil}
              </Badge>
            )}
            {isOverdue && (
              <Badge
                variant="outline"
                className="shrink-0 border-destructive/50 bg-destructive/10 text-destructive"
              >
                지연
              </Badge>
            )}
            {milestone.isCompleted && (
              <Badge
                variant="outline"
                className="shrink-0 border-green-500/50 bg-green-500/10 text-green-500"
              >
                완료
              </Badge>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              목표: {format(targetDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </span>
          </div>

          {milestone.isCompleted && milestone.completedAt && (
            <div className="mt-1 flex items-center gap-2 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              <span>
                완료:{" "}
                {format(new Date(milestone.completedAt), "yyyy년 M월 d일", {
                  locale: ko,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const { data: milestones, isLoading } = useMilestones(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5" />
            마일스톤 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flag className="h-5 w-5" />
            마일스톤 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            등록된 마일스톤이 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  // 날짜순 정렬
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  const completedCount = milestones.filter((m) => m.isCompleted).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            마일스톤 타임라인
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount} / {milestones.length} 완료
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-0">
            {sortedMilestones.map((milestone, index) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                isLast={index === sortedMilestones.length - 1}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
