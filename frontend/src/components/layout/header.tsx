"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications";
import { useAuth } from "@/lib/contexts/auth-context";

interface HeaderProps {
  title: string;
  subtitle?: string;
  projectId?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, projectId, onMenuClick }: HeaderProps) {
  const { user } = useAuth();

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
        {user ? <NotificationBell recipientId={user.id} projectId={projectId} /> : null}
      </div>
    </header>
  );
}
