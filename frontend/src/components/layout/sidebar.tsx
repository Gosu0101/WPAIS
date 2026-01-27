"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Film,
  Flag,
  Bell,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjects } from "@/lib/hooks";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresProject?: boolean;
  getProjectHref?: (projectId: string) => string;
}

const navItems: NavItem[] = [
  {
    title: "대시보드",
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

interface SidebarProps {
  selectedProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ 
  selectedProjectId, 
  onProjectSelect,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const { data: projectsResponse, isLoading } = useProjects();

  // URL에서 프로젝트 ID 추출 (있는 경우)
  const urlProjectId = params?.id as string | undefined;
  const activeProjectId = selectedProjectId || urlProjectId;

  const projects = projectsResponse?.data ?? [];
  const selectedProject = projects.find((p) => p.id === activeProjectId);

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* 로고 */}
        <div className={cn(
          "flex h-16 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-2 px-6"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <span className="text-sm font-bold text-primary-foreground">W</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">WPAIS</span>
          )}
        </div>

        {/* 프로젝트 선택 */}
        <div className={cn(
          "border-b border-border",
          collapsed ? "p-2" : "p-4"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <FolderKanban className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {selectedProject?.title || "프로젝트 선택"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  <span className="truncate">
                    {isLoading
                      ? "로딩 중..."
                      : selectedProject?.title || "프로젝트 선택"}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onProjectSelect?.(project.id)}
                  className={cn(
                    "cursor-pointer",
                    project.id === activeProjectId && "bg-accent"
                  )}
                >
                  <span className="truncate">{project.title}</span>
                </DropdownMenuItem>
              ))}
              {projects.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem asChild>
                <Link href="/projects/new" className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  새 프로젝트
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 네비게이션 */}
        <ScrollArea className={cn(
          "flex-1 py-4",
          collapsed ? "px-2" : "px-3"
        )}>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const href = item.requiresProject && activeProjectId && item.getProjectHref
                ? item.getProjectHref(activeProjectId)
                : item.href;
              const isActive =
                pathname === href ||
                (item.href !== "/" && pathname.startsWith(item.href)) ||
                (item.requiresProject && pathname.includes(item.href.slice(1)));
              const isDisabled = item.requiresProject && !activeProjectId;

              const linkContent = (
                <Link
                  key={item.href}
                  href={isDisabled ? "#" : href}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed 
                      ? "justify-center p-2.5" 
                      : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    isDisabled && "pointer-events-none opacity-50"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && item.title}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </ScrollArea>

        {/* 하단: 설정 + 접기 버튼 */}
        <div className={cn(
          "border-t border-border",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-colors",
                    pathname === "/settings"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">설정</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              설정
            </Link>
          )}
          
          {/* 접기/펼치기 버튼 - 태블릿 이상에서만 표시 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className={cn(
              "mt-2 w-full hidden md:flex",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            {!collapsed && <span className="text-xs text-muted-foreground">사이드바 접기</span>}
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
