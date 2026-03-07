'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  MemberRole,
  ProjectMember,
  WorkflowTaskType,
} from '../api/client';
import { useAuth } from '../contexts/auth-context';

export function useProjectMembers(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await apiClient.members.list(projectId);
      return response.data;
    },
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      role: MemberRole;
      taskType?: WorkflowTaskType;
    }) => apiClient.members.add(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}

export function useUpdateProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
      taskType,
    }: {
      memberId: string;
      role?: MemberRole;
      taskType?: WorkflowTaskType | null;
    }) => apiClient.members.update(projectId, memberId, { role, taskType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => apiClient.members.remove(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}

export function getMemberLabel(member: ProjectMember, currentUserId?: string) {
  if (member.userId === currentUserId) {
    return '현재 사용자';
  }

  return member.userId;
}
