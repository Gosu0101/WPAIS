'use client';

import { use, useMemo, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/contexts/auth-context';
import { useProject } from '@/lib/hooks';
import {
  getMemberLabel,
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMember,
} from '@/lib/hooks/use-project-members';
import { MemberRole, WorkflowTaskType } from '@/lib/api/client';

const roleOptions: MemberRole[] = ['PD', 'WORKER'];
const taskOptions: WorkflowTaskType[] = [
  'BACKGROUND',
  'LINE_ART',
  'COLORING',
  'POST_PROCESSING',
];

export default function ProjectMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: members = [], isLoading, error } = useProjectMembers(projectId);
  const addMember = useAddProjectMember(projectId);
  const updateMember = useUpdateProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<MemberRole>('WORKER');
  const [taskType, setTaskType] = useState<WorkflowTaskType>('BACKGROUND');
  const [formError, setFormError] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === 'PD' ? -1 : 1;
        }

        return left.createdAt.localeCompare(right.createdAt);
      }),
    [members],
  );

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await addMember.mutateAsync({
        userId,
        role,
        taskType: role === 'WORKER' ? taskType : undefined,
      });
      setUserId('');
      setRole('WORKER');
      setTaskType('BACKGROUND');
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : '멤버를 추가하지 못했습니다.',
      );
    }
  };

  return (
    <AppLayout
      title={project?.title ?? '프로젝트 멤버'}
      subtitle="프로젝트 참여자와 역할을 관리합니다"
      projectId={projectId}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              멤버 목록
            </CardTitle>
            <CardDescription>
              현재 프로젝트에 연결된 PD와 작업자 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error instanceof Error ? error.message : '멤버 목록을 불러오지 못했습니다.'}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                아직 등록된 멤버가 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>담당 공정</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">
                          {getMemberLabel(member, user?.id)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.userId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value) => {
                            const nextRole = value as MemberRole;
                            void updateMember.mutateAsync({
                              memberId: member.id,
                              role: nextRole,
                              taskType: nextRole === 'PD' ? null : member.taskType,
                            });
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.taskType ?? 'NONE'}
                          onValueChange={(value) => {
                            void updateMember.mutateAsync({
                              memberId: member.id,
                              taskType:
                                value === 'NONE'
                                  ? null
                                  : (value as WorkflowTaskType),
                            });
                          }}
                          disabled={member.role !== 'WORKER'}
                        >
                          <SelectTrigger className="w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">지정 안 함</SelectItem>
                            {taskOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void removeMember.mutateAsync(member.id)}
                        >
                          제거
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              멤버 추가
            </CardTitle>
            <CardDescription>
              현재는 사용자 검색 API가 없어 `userId`를 직접 입력하는 방식입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleAddMember}>
              <div className="space-y-2">
                <Label htmlFor="userId">사용자 ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="UUID 형식 사용자 ID"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>역할</Label>
                <Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>담당 공정</Label>
                <Select
                  value={taskType}
                  onValueChange={(value) => setTaskType(value as WorkflowTaskType)}
                  disabled={role !== 'WORKER'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={addMember.isPending}>
                {addMember.isPending ? '추가 중...' : '멤버 추가'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
