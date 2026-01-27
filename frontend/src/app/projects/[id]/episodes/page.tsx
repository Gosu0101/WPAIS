"use client";

import { use } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { EpisodeTable } from "@/components/episodes";
import { useProject } from "@/lib/hooks";

interface EpisodesPageProps {
  params: Promise<{ id: string }>;
}

export default function EpisodesPage({ params }: EpisodesPageProps) {
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
    <AppLayout title={project.title} subtitle="에피소드 관리">
      <EpisodeTable projectId={id} />
    </AppLayout>
  );
}
