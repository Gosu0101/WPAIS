"use client";

import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { differenceInDays, format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface SealCountdownCardProps {
  projectId: string;
}

export function SealCountdownCard({ projectId }: SealCountdownCardProps) {
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            봉인일 카운트다운
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            봉인일 카운트다운
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const sealDate = parseISO(project.sealDate);
  const launchDate = parseISO(project.launchDate);
  const today = new Date();
  const daysUntilSeal = differenceInDays(sealDate, today);
  const daysUntilLaunch = differenceInDays(launchDate, today);

  const getUrgencyLevel = (days: number) => {
    if (days < 0) return "overdue";
    if (days <= 7) return "critical";
    if (days <= 14) return "warning";
    return "normal";
  };

  const urgency = getUrgencyLevel(daysUntilSeal);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          봉인일 카운트다운
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* D-day 표시 */}
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-lg p-4",
            urgency === "overdue" && "bg-destructive/10",
            urgency === "critical" && "bg-destructive/10",
            urgency === "warning" && "bg-warning/10",
            urgency === "normal" && "bg-primary/10"
          )}
        >
          {urgency === "critical" || urgency === "overdue" ? (
            <AlertTriangle
              className={cn(
                "mb-1 h-5 w-5",
                urgency === "overdue" ? "text-destructive" : "text-warning"
              )}
            />
          ) : (
            <Clock className="mb-1 h-5 w-5 text-primary" />
          )}
          <span
            className={cn(
              "text-3xl font-bold",
              urgency === "overdue" && "text-destructive",
              urgency === "critical" && "text-destructive",
              urgency === "warning" && "text-warning",
              urgency === "normal" && "text-primary"
            )}
          >
            {daysUntilSeal < 0 ? `D+${Math.abs(daysUntilSeal)}` : `D-${daysUntilSeal}`}
          </span>
          <span className="text-xs text-muted-foreground">봉인일까지</span>
        </div>

        {/* 주요 일정 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">봉인일</span>
            <span className="font-medium">
              {format(sealDate, "yyyy.MM.dd (EEE)", { locale: ko })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">런칭일</span>
            <span className="font-medium">
              {format(launchDate, "yyyy.MM.dd (EEE)", { locale: ko })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">런칭까지</span>
            <span className="font-medium text-primary">
              {daysUntilLaunch < 0 ? `D+${Math.abs(daysUntilLaunch)}` : `D-${daysUntilLaunch}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
