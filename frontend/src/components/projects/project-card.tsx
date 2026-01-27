"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project, RiskLevel } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  progress?: number;
  riskLevel?: RiskLevel;
}

const riskLevelConfig: Record<
  RiskLevel,
  { label: string; className: string; icon?: boolean }
> = {
  LOW: {
    label: "안전",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  MEDIUM: {
    label: "주의",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  HIGH: {
    label: "위험",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: true,
  },
  CRITICAL: {
    label: "긴급",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: true,
  },
};

export function ProjectCard({
  project,
  progress = 0,
  riskLevel = "LOW",
}: ProjectCardProps) {
  const riskConfig = riskLevelConfig[riskLevel];
  const launchDate = new Date(project.launchDate);
  const daysUntilLaunch = Math.ceil(
    (launchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {format(launchDate, "yyyy년 M월 d일", { locale: ko })}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1", riskConfig.className)}
            >
              {riskConfig.icon && <AlertTriangle className="h-3 w-3" />}
              {riskConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>총 {project.totalEpisodes}화</span>
            </div>
            <span
              className={cn(
                "font-medium",
                daysUntilLaunch <= 7
                  ? "text-red-400"
                  : daysUntilLaunch <= 30
                    ? "text-yellow-400"
                    : "text-muted-foreground"
              )}
            >
              {daysUntilLaunch > 0 ? `D-${daysUntilLaunch}` : "런칭됨"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
