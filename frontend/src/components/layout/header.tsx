"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlerts } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface HeaderProps {
  title: string;
  subtitle?: string;
  projectId?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, projectId, onMenuClick }: HeaderProps) {
  const { data: alertsData } = useAlerts(projectId ?? "");
  const unreadCount = alertsData?.alerts?.filter((a) => !a.acknowledged).length ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        {/* 모바일 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>

        {/* 페이지 타이틀 */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* 알림 */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">알림</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>알림</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount}개 미확인
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {alertsData?.alerts && alertsData.alerts.length > 0 ? (
                alertsData.alerts.slice(0, 5).map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3",
                      !alert.acknowledged && "bg-accent/50"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium uppercase",
                          alert.severity === "CRITICAL" && "text-destructive",
                          alert.severity === "WARNING" && "text-warning",
                          alert.severity === "INFO" && "text-info"
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  알림이 없습니다
                </div>
              )}
            </ScrollArea>
            {alertsData?.alerts && alertsData.alerts.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center">
                  <Link href="/alerts" className="w-full text-center text-sm">
                    모든 알림 보기
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
