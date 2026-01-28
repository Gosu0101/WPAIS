"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { DashboardGrid } from "@/components/dashboard";
import { FolderKanban, Film, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // localStorage에서 선택된 프로젝트 ID 확인
    const savedProjectId = localStorage.getItem("selectedProjectId");
    if (savedProjectId) {
      setSelectedProjectId(savedProjectId);
    }
    setIsLoading(false);
  }, []);

  // 프로젝트가 선택되어 있으면 대시보드 표시
  if (!isLoading && selectedProjectId) {
    return (
      <AppLayout 
        title="대시보드" 
        subtitle="프로젝트 현황을 한눈에 확인하세요"
        projectId={selectedProjectId}
      >
        <DashboardGrid projectId={selectedProjectId} />
      </AppLayout>
    );
  }

  // 프로젝트가 선택되지 않았으면 환영 화면 표시
  return (
    <AppLayout title="대시보드" subtitle="프로젝트 현황을 한눈에 확인하세요">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* 환영 메시지 */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold mb-2">WPAIS에 오신 것을 환영합니다</h2>
            <p className="text-muted-foreground mb-4">
              웹툰 제작 관리 시스템입니다. 좌측 사이드바에서 프로젝트를 선택하거나 새 프로젝트를 생성하세요.
            </p>
            <div className="flex gap-3">
              <Link href="/projects">
                <Button variant="outline">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  프로젝트 목록
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  새 프로젝트
                </Button>
              </Link>
            </div>
          </div>

          {/* 빠른 시작 가이드 - 클릭 가능하게 수정 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/projects" className="block">
              <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer h-full">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">프로젝트 관리</h3>
                <p className="text-sm text-muted-foreground">
                  프로젝트를 생성하고 에피소드 일정을 관리하세요.
                </p>
              </div>
            </Link>

            <Link href="/projects" className="block">
              <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer h-full">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                  <Film className="h-5 w-5 text-info" />
                </div>
                <h3 className="font-semibold mb-1">워크플로우</h3>
                <p className="text-sm text-muted-foreground">
                  배경, 선화, 채색, 후보정 공정을 추적하세요.
                </p>
              </div>
            </Link>

            <Link href="/projects" className="block">
              <div className="rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer h-full">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <h3 className="font-semibold mb-1">진행률 모니터링</h3>
                <p className="text-sm text-muted-foreground">
                  7+3 버퍼 상태와 리스크를 실시간으로 확인하세요.
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
