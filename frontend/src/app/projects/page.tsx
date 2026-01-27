"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, SortAsc, SortDesc, Filter } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { ProjectCard, ProjectCardSkeleton } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/lib/hooks/use-projects";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { Project, RiskLevel } from "@/lib/api/client";

type SortField = "name" | "launchDate" | "progress";
type SortOrder = "asc" | "desc";
type FilterRisk = "all" | RiskLevel;

function ProjectCardWithData({ project }: { project: Project }) {
  const { data: dashboard } = useDashboard(project.id);

  return (
    <ProjectCard
      project={project}
      progress={dashboard?.progress?.progressPercentage ?? 0}
      riskLevel={dashboard?.risk?.overallRiskLevel ?? "LOW"}
    />
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("launchDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("all");

  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];

    let result = [...projects];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "launchDate":
          comparison =
            new Date(a.launchDate).getTime() -
            new Date(b.launchDate).getTime();
          break;
        case "progress":
          comparison = a.totalEpisodes - b.totalEpisodes;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, sortField, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <AppLayout title="프로젝트" subtitle="모든 프로젝트를 관리하세요">
      <div className="space-y-6">
        {/* 툴바 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={sortField}
              onValueChange={(v) => setSortField(v as SortField)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">이름</SelectItem>
                <SelectItem value="launchDate">런칭일</SelectItem>
                <SelectItem value="progress">에피소드 수</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={sortOrder === "asc" ? "오름차순" : "내림차순"}
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 프로젝트
            </Button>
          </Link>
        </div>

        {/* 프로젝트 그리드 */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive">
              프로젝트를 불러오는 중 오류가 발생했습니다.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "알 수 없는 오류"}
            </p>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            {searchQuery ? (
              <>
                <p className="text-muted-foreground">
                  &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
                </p>
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  검색 초기화
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  아직 프로젝트가 없습니다.
                </p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />첫 프로젝트 만들기
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProjects.map((project) => (
              <ProjectCardWithData key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* 프로젝트 수 표시 */}
        {!isLoading && !error && filteredAndSortedProjects.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            총 {filteredAndSortedProjects.length}개 프로젝트
            {searchQuery && ` (검색: "${searchQuery}")`}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
