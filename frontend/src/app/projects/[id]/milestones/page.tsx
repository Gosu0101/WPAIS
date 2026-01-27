"use client";

import { use } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { MilestoneTimeline } from "@/components/milestones";
import { useProject } from "@/lib/hooks";

interface MilestonesPageProps {
  params: Promise<{ id: string }>;
}

export default function MilestonesPage({ params }: MilestonesPageProps) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);

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
    <AppLayout title={project.title} subtitle="마일스톤">
      <div className="mx-auto max-w-3xl">
        <MilestoneTimeline projectId={id} />
      </div>
    </AppLayout>
  );
}
