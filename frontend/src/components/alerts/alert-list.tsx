"use client";

import { useMemo } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCard } from "./alert-card";
import { useAlerts, useAcknowledgeAlert } from "@/lib/hooks";
import type { Alert } from "@/lib/api/client";

interface AlertListProps {
  projectId: string;
  severityFilter?: string;
  onSeverityFilterChange?: (severity: string) => void;
  maxHeight?: string;
}

interface GroupedAlerts {
  date: Date;
  label: string;
  alerts: Alert[];
}

function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return "오늘";
  }
  if (isYesterday(date)) {
    return "어제";
  }
  return format(date, "M월 d일 (EEE)", { locale: ko });
}

function groupAlertsByDate(alerts: Alert[]): GroupedAlerts[] {
  const groups = new Map<string, Alert[]>();

  // 날짜별로 그룹화
  alerts.forEach((alert) => {
    const date = startOfDay(new Date(alert.createdAt));
    const key = date.toISOString();
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, alert]);
  });

  // 날짜 내림차순 정렬 (최신 날짜가 먼저)
  const sortedGroups = Array.from(groups.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([dateStr, groupAlerts]) => {
      const date = new Date(dateStr);
      // 각 그룹 내에서 시간 내림차순 정렬
      const sortedAlerts = [...groupAlerts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        date,
        label: getDateLabel(date),
        alerts: sortedAlerts,
      };
    });

  return sortedGroups;
}

export function AlertList({
  projectId,
  severityFilter = "all",
  onSeverityFilterChange,
  maxHeight = "600px",
}: AlertListProps) {
  const { data, isLoading } = useAlerts(
    projectId,
    severityFilter !== "all" ? { severity: severityFilter } : undefined
  );
  const acknowledgeAlert = useAcknowledgeAlert();

  const groupedAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return groupAlertsByDate(data.alerts);
  }, [data?.alerts]);

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert.mutate(alertId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            알림
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = data?.total || 0;
  const unacknowledgedCount =
    data?.alerts?.filter((a) => !a.acknowledged).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            알림
            {unacknowledgedCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                {unacknowledgedCount}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={severityFilter}
              onValueChange={onSeverityFilterChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="INFO">정보</SelectItem>
                <SelectItem value="WARNING">경고</SelectItem>
                <SelectItem value="ERROR">오류</SelectItem>
                <SelectItem value="CRITICAL">위험</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          총 {totalAlerts}개의 알림
        </p>
      </CardHeader>
      <CardContent>
        {groupedAlerts.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            알림이 없습니다
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-6 pr-4">
              {groupedAlerts.map((group) => (
                <div key={group.date.toISOString()} className="space-y-3">
                  <h3 className="sticky top-0 z-10 bg-card py-1 text-sm font-medium text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.alerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                        isAcknowledging={
                          acknowledgeAlert.isPending &&
                          acknowledgeAlert.variables === alert.id
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
