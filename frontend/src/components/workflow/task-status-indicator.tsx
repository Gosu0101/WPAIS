"use client";

import { TaskStatus } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Lock, Circle, Play, CheckCircle, Loader2 } from "lucide-react";

interface TaskStatusIndicatorProps {
  status: TaskStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  isLoading?: boolean;
}

const statusConfig: Record<TaskStatus, { 
  label: string; 
  icon: typeof Lock; 
  className: string;
  bgClassName: string;
}> = {
  LOCKED: {
    label: "잠금",
    icon: Lock,
    className: "text-muted-foreground",
    bgClassName: "bg-muted",
  },
  READY: {
    label: "준비",
    icon: Circle,
    className: "text-info",
    bgClassName: "bg-info/20",
  },
  IN_PROGRESS: {
    label: "진행 중",
    icon: Play,
    className: "text-warning",
    bgClassName: "bg-warning/20",
  },
  DONE: {
    label: "완료",
    icon: CheckCircle,
    className: "text-primary",
    bgClassName: "bg-primary/20",
  },
};

const sizeConfig = {
  sm: { icon: "h-3 w-3", text: "text-xs", padding: "p-1" },
  md: { icon: "h-4 w-4", text: "text-sm", padding: "p-1.5" },
  lg: { icon: "h-5 w-5", text: "text-base", padding: "p-2" },
};

export function TaskStatusIndicator({ 
  status, 
  size = "md", 
  showLabel = false,
  isLoading = false,
}: TaskStatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = isLoading ? Loader2 : config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", showLabel && "gap-2")}>
      <div className={cn(
        "rounded-full flex items-center justify-center",
        sizes.padding,
        config.bgClassName
      )}>
        <Icon className={cn(
          sizes.icon, 
          config.className,
          isLoading && "animate-spin"
        )} />
      </div>
      {showLabel && (
        <span className={cn(sizes.text, config.className)}>
          {isLoading ? "처리 중..." : config.label}
        </span>
      )}
    </div>
  );
}
