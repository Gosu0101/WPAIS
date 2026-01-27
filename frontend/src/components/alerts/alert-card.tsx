"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, AlertCircle, AlertTriangle, Info, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertSeverityBadge } from "./alert-severity-badge";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/api/client";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (alertId: string) => void;
  isAcknowledging?: boolean;
}

const severityIcons = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  CRITICAL: AlertCircle,
};

const severityColors = {
  INFO: "border-l-blue-500",
  WARNING: "border-l-warning",
  ERROR: "border-l-orange-500",
  CRITICAL: "border-l-destructive",
};

export function AlertCard({
  alert,
  onAcknowledge,
  isAcknowledging,
}: AlertCardProps) {
  const Icon = severityIcons[alert.severity];
  const createdAt = new Date(alert.createdAt);

  return (
    <Card
      className={cn(
        "border-l-4 transition-all",
        severityColors[alert.severity],
        alert.acknowledged && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                alert.severity === "INFO" && "bg-blue-500/10 text-blue-500",
                alert.severity === "WARNING" && "bg-warning/10 text-warning",
                alert.severity === "ERROR" && "bg-orange-500/10 text-orange-500",
                alert.severity === "CRITICAL" && "bg-destructive/10 text-destructive"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertSeverityBadge severity={alert.severity} showIcon={false} />
                <span className="text-xs text-muted-foreground">
                  {alert.type}
                </span>
              </div>
              <p
                className={cn(
                  "text-sm",
                  alert.acknowledged && "text-muted-foreground"
                )}
              >
                {alert.message}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {format(createdAt, "a h:mm", { locale: ko })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {alert.acknowledged ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                <span>확인됨</span>
              </div>
            ) : (
              onAcknowledge && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledge(alert.id)}
                  disabled={isAcknowledging}
                >
                  {isAcknowledging ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      확인
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
