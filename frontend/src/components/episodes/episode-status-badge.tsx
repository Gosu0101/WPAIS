"use client";

import { Badge } from "@/components/ui/badge";
import { EpisodeStatus } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface EpisodeStatusBadgeProps {
  status: EpisodeStatus;
  className?: string;
}

const statusConfig: Record<EpisodeStatus, { label: string; className: string }> = {
  PENDING: {
    label: "대기",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  IN_PROGRESS: {
    label: "진행 중",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  COMPLETED: {
    label: "완료",
    className: "bg-primary/20 text-primary border-primary/30",
  },
};

export function EpisodeStatusBadge({ status, className }: EpisodeStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
