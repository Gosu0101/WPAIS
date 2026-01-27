"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  projectId?: string; // 페이지에서 전달받은 프로젝트 ID
}

// 브레이크포인트 상수
const BREAKPOINTS = {
  md: 768,
  lg: 1024,
};

export function AppLayout({ children, title, subtitle, projectId: propProjectId }: AppLayoutProps) {
  const pathname = usePathname();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL에서 프로젝트 ID 추출
  const extractProjectIdFromUrl = useCallback(() => {
    const match = pathname.match(/\/projects\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // 프로젝트 ID 초기화 및 복원
  useEffect(() => {
    // 1. props로 전달된 프로젝트 ID 우선
    if (propProjectId) {
      setSelectedProjectId(propProjectId);
      localStorage.setItem("selectedProjectId", propProjectId);
      return;
    }

    // 2. URL에서 프로젝트 ID 추출
    const urlProjectId = extractProjectIdFromUrl();
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId);
      localStorage.setItem("selectedProjectId", urlProjectId);
      return;
    }

    // 3. localStorage에서 복원
    const savedProjectId = localStorage.getItem("selectedProjectId");
    if (savedProjectId && !selectedProjectId) {
      setSelectedProjectId(savedProjectId);
    }
  }, [propProjectId, extractProjectIdFromUrl, selectedProjectId]);

  // 화면 크기에 따라 사이드바 접힘 상태 초기화
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // 태블릿(md~lg)에서는 기본적으로 접힌 상태
      if (width >= BREAKPOINTS.md && width < BREAKPOINTS.lg) {
        setSidebarCollapsed(true);
      } else if (width >= BREAKPOINTS.lg) {
        // 데스크톱에서는 펼친 상태 유지 (사용자가 수동으로 접지 않은 경우)
        // 사용자 선호도를 localStorage에서 확인
        const savedCollapsed = localStorage.getItem("sidebarCollapsed");
        if (savedCollapsed === null) {
          setSidebarCollapsed(false);
        }
      }
    };

    // 초기 실행
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem("selectedProjectId", projectId);
  }, []);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    // 사용자 선호도 저장
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 - 모바일에서는 슬라이드, 태블릿/데스크톱에서는 고정 */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleCollapsedChange}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          projectId={selectedProjectId}
          onMenuClick={handleMenuClick}
        />
        <main className="flex-1 overflow-auto">
          {/* 모바일에서 하단 네비게이션 공간 확보 */}
          <div className="container mx-auto p-4 pb-20 md:p-6 md:pb-6">{children}</div>
        </main>
      </div>

      {/* 모바일 하단 네비게이션 */}
      <BottomNav projectId={selectedProjectId} />
    </div>
  );
}
