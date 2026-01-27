"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Film,
  Flag,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresProject?: boolean;
  getProjectHref?: (projectId: string) => string;
}

const navItems: NavItem[] = [
  {
    title: "홈",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "프로젝트",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "에피소드",
    href: "/episodes",
    icon: Film,
    requiresProject: true,
    getProjectHref: (projectId) => `/projects/${projectId}/episodes`,
  },
  {
    title: "마일스톤",
    href: "/milestones",
    icon: Flag,
    requiresProject: true,
    getProjectHref: (projectId) => `/projects/${projectId}/milestones`,
  },
  {
    title: "알림",
    href: "/alerts",
    icon: Bell,
    requiresProject: true,
    getProjectHref: (projectId) => `/projects/${projectId}/alerts`,
  },
];

interface BottomNavProps {
  projectId?: string;
}

export function BottomNav({ projectId }: BottomNavProps) {
  const pathname = usePathname();
  const params = useParams();
  
  // URL에서 프로젝트 ID 추출 (있는 경우)
  const urlProjectId = params?.id as string | undefined;
  const activeProjectId = projectId || urlProjectId;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const href = item.requiresProject && activeProjectId && item.getProjectHref
            ? item.getProjectHref(activeProjectId)
            : item.href;
          const isActive =
            pathname === href ||
            (item.href !== "/" && pathname.startsWith(item.href)) ||
            (item.requiresProject && pathname.includes(item.href.slice(1)));
          const isDisabled = item.requiresProject && !activeProjectId;

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground",
                isDisabled && "pointer-events-none opacity-40"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive && "text-primary"
              )} />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
