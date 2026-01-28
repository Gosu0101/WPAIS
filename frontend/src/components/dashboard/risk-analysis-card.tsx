"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRiskAnalysis } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/api/client";

interface RiskAnalysisCardProps {
  projectId: string;
}

export function RiskAnalysisCard({ projectId }: RiskAnalysisCardProps) {
  const { data: riskData, isLoading, error } = useRiskAnalysis(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            리스크 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !riskData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            리스크 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = riskData.overallRiskLevel ?? "LOW";
  const riskScore = riskData.riskScore ?? 0;
  const riskEpisodes = riskData.atRiskEpisodes ?? [];

  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case "CRITICAL":
        return {
          icon: ShieldAlert,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "심각",
        };
      case "HIGH":
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
          label: "높음",
        };
      case "MEDIUM":
        return {
          icon: Shield,
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
          label: "보통",
        };
      default:
        return {
          icon: ShieldCheck,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          label: "낮음",
        };
    }
  };

  const config = getRiskConfig(riskLevel);
  const RiskIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            리스크 분석
          </span>
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              config.bgColor,
              config.color,
              config.borderColor
            )}
          >
            <RiskIcon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 리스크 점수 */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg p-3",
            config.bgColor
          )}
        >
          <span className="text-sm text-muted-foreground">리스크 점수</span>
          <span className={cn("text-2xl font-bold", config.color)}>
            {riskScore}
          </span>
        </div>

        {/* 위험 에피소드 목록 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            주의 필요 에피소드
          </h4>
          {riskEpisodes.length > 0 ? (
            <ul className="space-y-2">
              {riskEpisodes.map((ep) => {
                const epConfig = getRiskConfig(ep.riskLevel);
                return (
                  <li
                    key={ep.episodeNumber}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-2 text-sm",
                      epConfig.borderColor
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <epConfig.icon className={cn("h-3.5 w-3.5", epConfig.color)} />
                      EP{ep.episodeNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ep.reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-2">
              현재 위험 에피소드가 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
