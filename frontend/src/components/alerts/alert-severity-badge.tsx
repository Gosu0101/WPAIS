"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "ERROR";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  showIcon?: boolean;
  className?: string;
}

const severityConfig = {
  INFO: {
    icon: Info,
    label: "정보",
    className: "border-blue-500/50 bg-blue-500/10 text-blue-500",
  },
  WARNING: {
    icon: AlertTriangle,
    label: "경고",
    className: "border-warning/50 bg-warning/10 text-warning",
  },
  ERROR: {
    icon: AlertCircle,
    label: "오류",
    className: "border-orange-500/50 bg-orange-500/10 text-orange-500",
  },
  CRITICAL: {
    icon: AlertCircle,
    label: "위험",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
  },
};

export function AlertSeverityBadge({
  severity,
  showIcon = true,
  className,
}: AlertSeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
