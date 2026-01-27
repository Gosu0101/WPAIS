"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addMonths } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateProject } from "@/lib/hooks/use-projects";

interface FormErrors {
  title?: string;
  launchDate?: string;
  episodeCount?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const [title, setTitle] = useState("");
  const [launchDate, setLaunchDate] = useState(
    format(addMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [episodeCount, setEpisodeCount] = useState("10");
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = "작품명을 입력해주세요.";
    } else if (title.length > 100) {
      newErrors.title = "작품명은 100자 이내로 입력해주세요.";
    }

    if (!launchDate) {
      newErrors.launchDate = "런칭일을 선택해주세요.";
    } else {
      const selectedDate = new Date(launchDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.launchDate = "런칭일은 오늘 이후여야 합니다.";
      }
    }

    const episodes = parseInt(episodeCount, 10);
    if (isNaN(episodes) || episodes < 1) {
      newErrors.episodeCount = "에피소드 수는 1 이상이어야 합니다.";
    } else if (episodes > 100) {
      newErrors.episodeCount = "에피소드 수는 100 이하여야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createProject.mutateAsync({
        title: title.trim(),
        launchDate,
        episodeCount: parseInt(episodeCount, 10),
      });
      router.push("/projects");
    } catch (error) {
      // 에러는 mutation에서 처리됨
    }
  };

  return (
    <AppLayout title="새 프로젝트" subtitle="새로운 웹툰 프로젝트를 생성합니다">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          프로젝트 목록으로
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>프로젝트 정보</CardTitle>
            <CardDescription>
              프로젝트의 기본 정보를 입력해주세요. 런칭일과 에피소드 수를 기반으로
              일정이 자동 계산됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">작품명 *</Label>
                <Input
                  id="title"
                  placeholder="예: 나 혼자만 레벨업"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="launchDate">런칭일 *</Label>
                <Input
                  id="launchDate"
                  type="date"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  className={errors.launchDate ? "border-destructive" : ""}
                />
                {errors.launchDate && (
                  <p className="text-sm text-destructive">{errors.launchDate}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  첫 에피소드가 공개되는 날짜입니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="episodeCount">런칭 시 확보할 에피소드 수</Label>
                <Input
                  id="episodeCount"
                  type="number"
                  min="1"
                  max="100"
                  value={episodeCount}
                  onChange={(e) => setEpisodeCount(e.target.value)}
                  className={errors.episodeCount ? "border-destructive" : ""}
                />
                {errors.episodeCount && (
                  <p className="text-sm text-destructive">
                    {errors.episodeCount}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  기본값: 10화 (봉인 7화 + 비축 3화)
                </p>
              </div>

              {createProject.error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">
                    {createProject.error instanceof Error
                      ? createProject.error.message
                      : "프로젝트 생성 중 오류가 발생했습니다."}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={createProject.isPending}
                  className="flex-1"
                >
                  {createProject.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  프로젝트 생성
                </Button>
                <Link href="/projects">
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
