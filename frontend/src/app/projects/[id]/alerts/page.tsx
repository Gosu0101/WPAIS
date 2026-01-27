"use client";

import { use, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { AlertList } from "@/components/alerts";
import { useProject } from "@/lib/hooks";

interface AlertsPageProps {
  params: Promise<{ id: string }>;
}

export default function AlertsPage({ params }: AlertsPageProps) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);
  const [severityFilter, setSeverityFilter] = useState("all");

  if (isLoading) {
    return (
      <AppLayout title="로딩 중..." subtitle="프로젝트 정보를 불러오는 중입니다">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="프로젝트를 찾을 수 없습니다">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          요청한 프로젝트가 존재하지 않습니다.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={project.title} subtitle="알림 히스토리">
      <div className="mx-auto max-w-4xl">
        <AlertList
          projectId={id}
          severityFilter={severityFilter}
          onSeverityFilterChange={setSeverityFilter}
          maxHeight="calc(100vh - 250px)"
        />
      </div>
    </AppLayout>
  );
}
