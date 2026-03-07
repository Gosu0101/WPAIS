'use client';

import { use, useState, useEffect } from 'react';
import { Bell, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/lib/hooks/use-notification-settings';
import { useAuth } from '@/lib/contexts/auth-context';

const NOTIFICATION_TYPES = [
  { key: 'TASK_DEADLINE_APPROACHING', label: '공정 마감 임박', description: '공정 마감일이 다가올 때 알림' },
  { key: 'EPISODE_DEADLINE_APPROACHING', label: '에피소드 마감 임박', description: '에피소드 마감일이 다가올 때 알림' },
  { key: 'MILESTONE_DEADLINE_APPROACHING', label: '마일스톤 마감 임박', description: '마일스톤 마감일이 다가올 때 알림' },
  { key: 'TASK_STARTED', label: '작업 시작', description: '작업이 시작되었을 때 알림' },
  { key: 'TASK_COMPLETED', label: '작업 완료', description: '작업이 완료되었을 때 알림' },
  { key: 'NEXT_TASK_READY', label: '다음 작업 준비', description: '다음 공정 작업이 준비되었을 때 알림' },
  { key: 'EPISODE_COMPLETED', label: '에피소드 완료', description: '에피소드가 완료되었을 때 알림' },
];

export default function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  const { data, isLoading } = useNotificationSettings(projectId);
  const updateSettings = useUpdateNotificationSettings();

  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [thresholds, setThresholds] = useState({
    task: [3, 1, 0],
    episode: [7, 3, 1],
    milestone: [14, 7, 3, 1],
  });

  useEffect(() => {
    if (data?.data) {
      setEnabledTypes(data.data.enabledTypes);
      setThresholds(data.data.thresholds);
    }
  }, [data]);


  const handleToggleType = (type: string) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = () => {
    updateSettings.mutate({
      projectId,
      updates: { enabledTypes, thresholds },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            알림 설정
          </h1>
          <p className="text-gray-500 mt-1">프로젝트 알림 수신 설정을 관리합니다</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>알림 유형</CardTitle>
          <CardDescription>받고 싶은 알림 유형을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.key} className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{type.label}</Label>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
              <Switch
                checked={enabledTypes.includes(type.key)}
                onCheckedChange={() => handleToggleType(type.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>마감 임박 임계값</CardTitle>
          <CardDescription>마감 며칠 전에 알림을 받을지 설정하세요 (쉼표로 구분)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>공정 마감 (일)</Label>
              <Input
                value={thresholds.task.join(', ')}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    task: e.target.value.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v)),
                  }))
                }
                placeholder="3, 1, 0"
              />
            </div>
            <div className="space-y-2">
              <Label>에피소드 마감 (일)</Label>
              <Input
                value={thresholds.episode.join(', ')}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    episode: e.target.value.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v)),
                  }))
                }
                placeholder="7, 3, 1"
              />
            </div>
            <div className="space-y-2">
              <Label>마일스톤 마감 (일)</Label>
              <Input
                value={thresholds.milestone.join(', ')}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    milestone: e.target.value.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v)),
                  }))
                }
                placeholder="14, 7, 3, 1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
