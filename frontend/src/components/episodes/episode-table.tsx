"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Lock, ChevronRight, Calendar, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Episode, EpisodeStatus } from "@/lib/api/client";
import { useEpisodes } from "@/lib/hooks";
import { EpisodeStatusBadge } from "./episode-status-badge";

interface EpisodeTableProps {
  projectId: string;
}

export function EpisodeTable({ projectId }: EpisodeTableProps) {
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | "ALL">("ALL");
  
  const { data: episodes, isLoading, error } = useEpisodes(
    projectId,
    statusFilter === "ALL" ? undefined : statusFilter
  );

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        에피소드를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        에피소드가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as EpisodeStatus | "ALL")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="PENDING">대기</SelectItem>
            <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          총 {episodes.length}개 에피소드
        </span>
      </div>

      {/* 모바일: 카드 레이아웃 */}
      <div className="space-y-3 sm:hidden">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>

      {/* 태블릿/데스크톱: 테이블 레이아웃 */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">에피소드</TableHead>
              <TableHead>마감일</TableHead>
              <TableHead className="w-[100px]">제작 기간</TableHead>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead className="w-[80px]">봉인</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes.map((episode) => (
              <EpisodeRow key={episode.id} episode={episode} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EpisodeCard({ episode }: { episode: Episode }) {
  const dueDate = new Date(episode.dueDate);
  const isOverdue = dueDate < new Date() && episode.status !== "COMPLETED";

  return (
    <Link href={`/episodes/${episode.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  EP.{episode.episodeNumber.toString().padStart(2, "0")}
                </span>
                {episode.isSealed && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                    <Lock className="mr-1 h-3 w-3" />
                    봉인
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {format(dueDate, "MM.dd (EEE)", { locale: ko })}
                  {isOverdue && <span className="text-xs">지연</span>}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {episode.duration}일
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EpisodeStatusBadge status={episode.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EpisodeRow({ episode }: { episode: Episode }) {
  const dueDate = new Date(episode.dueDate);
  const isOverdue = dueDate < new Date() && episode.status !== "COMPLETED";

  return (
    <TableRow>
      <TableCell className="font-medium">
        EP.{episode.episodeNumber.toString().padStart(2, "0")}
      </TableCell>
      <TableCell>
        <span className={isOverdue ? "text-destructive" : ""}>
          {format(dueDate, "yyyy.MM.dd (EEE)", { locale: ko })}
        </span>
        {isOverdue && (
          <span className="ml-2 text-xs text-destructive">지연</span>
        )}
      </TableCell>
      <TableCell>{episode.duration}일</TableCell>
      <TableCell>
        <EpisodeStatusBadge status={episode.status} />
      </TableCell>
      <TableCell>
        {episode.isSealed && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Lock className="mr-1 h-3 w-3" />
            봉인
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Link
          href={`/episodes/${episode.id}`}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}
