import { AppLayout } from "@/components/layout";

export default function Home() {
  return (
    <AppLayout title="대시보드" subtitle="프로젝트 현황을 한눈에 확인하세요">
      <div className="grid gap-6">
        {/* 환영 메시지 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-2">WPAIS에 오신 것을 환영합니다</h2>
          <p className="text-muted-foreground">
            웹툰 제작 관리 시스템입니다. 좌측 사이드바에서 프로젝트를 선택하거나 새 프로젝트를 생성하세요.
          </p>
        </div>

        {/* 빠른 시작 가이드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 card-hover">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-lg">📁</span>
            </div>
            <h3 className="font-semibold mb-1">프로젝트 관리</h3>
            <p className="text-sm text-muted-foreground">
              프로젝트를 생성하고 에피소드 일정을 관리하세요.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 card-hover">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <span className="text-lg">🎬</span>
            </div>
            <h3 className="font-semibold mb-1">워크플로우</h3>
            <p className="text-sm text-muted-foreground">
              배경, 선화, 채색, 후보정 공정을 추적하세요.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 card-hover">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <span className="text-lg">📊</span>
            </div>
            <h3 className="font-semibold mb-1">진행률 모니터링</h3>
            <p className="text-sm text-muted-foreground">
              7+3 버퍼 상태와 리스크를 실시간으로 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
