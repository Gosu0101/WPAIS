"use client";

import { BufferStatusCard } from "./buffer-status-card";
import { ProgressChart } from "./progress-chart";
import { RiskAnalysisCard } from "./risk-analysis-card";
import { VelocityCard } from "./velocity-card";
import { SealCountdownCard } from "./seal-countdown-card";
import { HealthScoreCard } from "./health-score-card";
import { UpcomingMilestonesCard } from "../milestones";

interface DashboardGridProps {
  projectId: string;
}

export function DashboardGrid({ projectId }: DashboardGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* 첫 번째 행: 버퍼 상태, 봉인일 카운트다운, 건강 점수 */}
      <BufferStatusCard projectId={projectId} />
      <SealCountdownCard projectId={projectId} />
      <HealthScoreCard projectId={projectId} />

      {/* 두 번째 행: 진행률 차트 (2열 차지), 다가오는 마일스톤 */}
      <div className="md:col-span-2">
        <ProgressChart projectId={projectId} />
      </div>
      <UpcomingMilestonesCard projectId={projectId} />

      {/* 리스크 분석 */}
      <RiskAnalysisCard projectId={projectId} />

      {/* 세 번째 행: 속도 분석 (2열 차지) */}
      <div className="md:col-span-2">
        <VelocityCard projectId={projectId} />
      </div>
    </div>
  );
}
