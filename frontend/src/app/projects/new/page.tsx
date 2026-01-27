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
  name?: string;
  launchDate?: string;
  totalEpisodes?: string;
  pagesPerEpisode?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [launchDate, setLaunchDate] = useState(
    format(addMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [totalEpisodes, setTotalEpisodes] = useState("52");
  const [pagesPerEpisode, setPagesPerEpisode] = useState("5");
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "프로젝트명을 입력해주세요.";
    } else if (name.length > 100) {
      newErrors.name = "프로젝트명은 100자 이내로 입력해주세요.";
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

    const episodes = parseInt(totalEpisodes, 10);
    if (isNaN(episodes) || episodes < 1) {
      newErrors.totalEpisodes = "에피소드 수는 1 이상이어야 합니다.";
    } else if (episodes > 1000) {
      newErrors.totalEpisodes = "에피소드 수는 1000 이하여야 합니다.";
    }

    const pages = parseInt(pagesPerEpisode, 10);
    if (isNaN(pages) || pages < 1) {
      newErrors.pagesPerEpisode = "페이지 수는 1 이상이어야 합니다.";
    } else if (pages > 100) {
      newErrors.pagesPerEpisode = "페이지 수는 100 이하여야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        launchDate,
        totalEpisodes: parseInt(totalEpisodes, 10),
        pagesPerEpisode: parseInt(pagesPerEpisode, 10),
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
                <Label htmlFor="name">프로젝트명 *</Label>
                <Input
                  id="name"
                  placeholder="예: 나 혼자만 레벨업"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalEpisodes">총 에피소드 수 *</Label>
                  <Input
                    id="totalEpisodes"
                    type="number"
                    min="1"
                    max="1000"
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(e.target.value)}
                    className={errors.totalEpisodes ? "border-destructive" : ""}
                  />
                  {errors.totalEpisodes && (
                    <p className="text-sm text-destructive">
                      {errors.totalEpisodes}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pagesPerEpisode">에피소드당 페이지 수</Label>
                  <Input
                    id="pagesPerEpisode"
                    type="number"
                    min="1"
                    max="100"
                    value={pagesPerEpisode}
                    onChange={(e) => setPagesPerEpisode(e.target.value)}
                    className={errors.pagesPerEpisode ? "border-destructive" : ""}
                  />
                  {errors.pagesPerEpisode && (
                    <p className="text-sm text-destructive">
                      {errors.pagesPerEpisode}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">기본값: 5페이지</p>
                </div>
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
