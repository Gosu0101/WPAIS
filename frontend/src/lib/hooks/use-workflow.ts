"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, Page, EpisodeDetail, TaskStatus } from "../api/client";

// 에피소드 상세 조회 (자동 갱신 포함)
export function useEpisodeWorkflow(id: string) {
  return useQuery<EpisodeDetail>({
    queryKey: ["episode", id],
    queryFn: () => apiClient.episodes.get(id),
    enabled: !!id,
    // 30초마다 자동 갱신
    refetchInterval: 30 * 1000,
    // 윈도우 포커스 시 갱신
    refetchOnWindowFocus: true,
    // 10초 동안 stale 상태 유지
    staleTime: 10 * 1000,
  });
}

export function usePage(id: string) {
  return useQuery({
    queryKey: ["page", id],
    queryFn: () => apiClient.pages.get(id),
    enabled: !!id,
  });
}

// 작업 시작 (낙관적 업데이트 포함)
export function useStartTask(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, taskType }: { pageId: string; taskType: string }) => 
      apiClient.pages.startTask(pageId, taskType),
    
    // 낙관적 업데이트
    onMutate: async ({ pageId, taskType }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ["episode", episodeId] });
      
      // 이전 데이터 스냅샷
      const previousEpisode = queryClient.getQueryData<EpisodeDetail>(["episode", episodeId]);
      
      // 낙관적으로 상태 업데이트
      if (previousEpisode?.pages) {
        const updatedPages = previousEpisode.pages.map((page) => {
          if (page.id === pageId) {
            return updatePageTaskStatus(page, taskType, "IN_PROGRESS");
          }
          return page;
        });
        
        queryClient.setQueryData<EpisodeDetail>(["episode", episodeId], {
          ...previousEpisode,
          pages: updatedPages,
        });
      }
      
      return { previousEpisode };
    },
    
    // 에러 시 롤백
    onError: (err, variables, context) => {
      if (context?.previousEpisode) {
        queryClient.setQueryData(["episode", episodeId], context.previousEpisode);
      }
    },
    
    // 성공/실패 후 서버 데이터로 동기화
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["episode", episodeId] });
    },
  });
}

// 작업 완료 (낙관적 업데이트 포함)
export function useCompleteTask(episodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, taskType }: { pageId: string; taskType: string }) => 
      apiClient.pages.completeTask(pageId, taskType),
    
    // 낙관적 업데이트
    onMutate: async ({ pageId, taskType }) => {
      await queryClient.cancelQueries({ queryKey: ["episode", episodeId] });
      
      const previousEpisode = queryClient.getQueryData<EpisodeDetail>(["episode", episodeId]);
      
      if (previousEpisode?.pages) {
        const updatedPages = previousEpisode.pages.map((page) => {
          if (page.id === pageId) {
            // 현재 작업 완료
            const updatedPage = updatePageTaskStatus(page, taskType, "DONE");
            // 다음 작업 잠금 해제
            return unlockNextTask(updatedPage, taskType);
          }
          return page;
        });
        
        queryClient.setQueryData<EpisodeDetail>(["episode", episodeId], {
          ...previousEpisode,
          pages: updatedPages,
        });
      }
      
      return { previousEpisode };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousEpisode) {
        queryClient.setQueryData(["episode", episodeId], context.previousEpisode);
      }
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["episode", episodeId] });
    },
  });
}

// 페이지 작업 상태 업데이트 헬퍼
function updatePageTaskStatus(page: Page, taskType: string, status: TaskStatus): Page {
  switch (taskType) {
    case "background":
      return { ...page, backgroundStatus: status };
    case "lineArt":
      return { ...page, lineArtStatus: status };
    case "coloring":
      return { ...page, coloringStatus: status };
    case "postProcessing":
      return { ...page, postProcessingStatus: status };
    default:
      return page;
  }
}

// 다음 작업 잠금 해제 헬퍼
function unlockNextTask(page: Page, completedTaskType: string): Page {
  const taskOrder = ["background", "lineArt", "coloring", "postProcessing"];
  const currentIndex = taskOrder.indexOf(completedTaskType);
  
  if (currentIndex < 0 || currentIndex >= taskOrder.length - 1) {
    return page;
  }
  
  const nextTaskType = taskOrder[currentIndex + 1];
  const nextStatus = getTaskStatusFromPage(page, nextTaskType);
  
  // LOCKED 상태인 경우에만 READY로 변경
  if (nextStatus === "LOCKED") {
    return updatePageTaskStatus(page, nextTaskType, "READY");
  }
  
  return page;
}

// 페이지에서 작업 상태 가져오기
function getTaskStatusFromPage(page: Page, taskType: string): TaskStatus {
  switch (taskType) {
    case "background":
      return page.backgroundStatus;
    case "lineArt":
      return page.lineArtStatus;
    case "coloring":
      return page.coloringStatus;
    case "postProcessing":
      return page.postProcessingStatus;
    default:
      return "LOCKED";
  }
}
