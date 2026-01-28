'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { CalendarEvent } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface EventEditDialogProps {
  open: boolean;
  event: CalendarEvent | null;
  newDate: Date | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EventEditDialog({
  open,
  event,
  newDate,
  onConfirm,
  onCancel,
  isLoading,
}: EventEditDialogProps) {
  if (!event || !newDate) return null;

  const oldDate = new Date(event.start);
  const isEpisode = event.type === 'episode';

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>일정 변경 확인</DialogTitle>
          <DialogDescription>
            {event.title}의 일정을 변경하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">기존 일정</p>
              <p className="font-medium">
                {format(oldDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">변경 일정</p>
              <p className="font-medium text-primary">
                {format(newDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </p>
            </div>
          </div>

          {isEpisode && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  연쇄 변경 경고
                </p>
                <p className="text-amber-600 dark:text-amber-400">
                  에피소드 일정 변경 시 관련된 다른 일정들도 영향을 받을 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            취소
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '변경 중...' : '변경 확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
