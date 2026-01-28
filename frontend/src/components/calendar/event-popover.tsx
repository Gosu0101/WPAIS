'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, ExternalLink, Calendar, CheckCircle, Clock, Lock } from 'lucide-react';
import { CalendarEvent } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface EventPopoverProps {
  event: CalendarEvent;
  position: { x: number; y: number };
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  LOCKED: '잠김',
  READY: '준비',
  DONE: '완료',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  BACKGROUND: '배경',
  LINE_ART: '선화',
  COLORING: '채색',
  POST_PROCESSING: '후보정',
};

export function EventPopover({ event, position, onClose }: EventPopoverProps) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleNavigate = () => {
    const props = event.extendedProps as Record<string, unknown>;
    
    switch (event.type) {
      case 'episode':
        router.push(`/episodes/${event.id}`);
        break;
      case 'milestone':
        router.push(`/projects/${event.projectId}/milestones`);
        break;
      case 'task':
        const pageId = props.pageId as string;
        router.push(`/episodes/${event.id.split('-')[0]}`);
        break;
    }
    onClose();
  };

  const renderContent = () => {
    const props = event.extendedProps as Record<string, unknown>;

    switch (event.type) {
      case 'episode':
        return (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={Boolean(props.isSealed) ? 'secondary' : 'outline'}>
                {Boolean(props.isSealed) ? '봉인됨' : STATUS_LABELS[String(props.status)] || String(props.status)}
              </Badge>
              {Boolean(props.isSealed) && <Lock className="h-4 w-4 text-violet-500" />}
            </div>
            <p className="text-sm text-muted-foreground">
              에피소드 {String(props.episodeNumber)}
            </p>
          </>
        );
      case 'milestone':
        return (
          <>
            <div className="flex items-center gap-2">
              {Boolean(props.isCompleted) ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  완료
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  진행중
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {String(props.milestoneType)}
            </p>
          </>
        );
      case 'task':
        return (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {TASK_TYPE_LABELS[String(props.taskType)] || String(props.taskType)}
              </Badge>
              <Badge variant={props.status === 'DONE' ? 'default' : 'secondary'}>
                {STATUS_LABELS[String(props.status)] || String(props.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              EP{String(props.episodeNumber)} 페이지 {String(props.pageNumber)}
            </p>
          </>
        );
    }
  };

  // Calculate position to keep popover in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 200),
    zIndex: 50,
  };

  return (
    <div
      ref={popoverRef}
      className="w-80 bg-background border rounded-lg shadow-lg p-4"
      style={style}
      role="dialog"
      aria-label={`${event.title} 상세 정보`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg">{event.title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {renderContent()}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(new Date(event.start), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
        </div>

        {event.projectTitle && (
          <p className="text-sm">
            <span className="text-muted-foreground">프로젝트:</span> {event.projectTitle}
          </p>
        )}

        <Button onClick={handleNavigate} className="w-full mt-2">
          <ExternalLink className="h-4 w-4 mr-2" />
          상세 보기
        </Button>
      </div>
    </div>
  );
}
