// Calendar Event Color Utilities

export const EVENT_COLORS = {
  episode: {
    PENDING: '#6b7280',      // gray-500
    IN_PROGRESS: '#f59e0b',  // amber-500
    COMPLETED: '#22c55e',    // green-500
    SEALED: '#8b5cf6',       // violet-500
  },
  milestone: {
    default: '#3b82f6',      // blue-500
    completed: '#22c55e',    // green-500
    overdue: '#ef4444',      // red-500
  },
  task: {
    LOCKED: '#374151',       // gray-700
    READY: '#3b82f6',        // blue-500
    IN_PROGRESS: '#f59e0b',  // amber-500
    DONE: '#22c55e',         // green-500
  },
} as const;

export const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
] as const;

export type EpisodeStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskStatus = 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'DONE';

export function getEpisodeColor(status: EpisodeStatus, isSealed: boolean): string {
  if (isSealed) {
    return EVENT_COLORS.episode.SEALED;
  }
  return EVENT_COLORS.episode[status] || EVENT_COLORS.episode.PENDING;
}

export function getMilestoneColor(isCompleted: boolean, targetDate: Date): string {
  if (isCompleted) {
    return EVENT_COLORS.milestone.completed;
  }
  if (targetDate < new Date()) {
    return EVENT_COLORS.milestone.overdue;
  }
  return EVENT_COLORS.milestone.default;
}

export function getTaskColor(status: TaskStatus): string {
  return EVENT_COLORS.task[status] || EVENT_COLORS.task.LOCKED;
}

export function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function assignProjectColors<T extends { id: string }>(
  projects: T[]
): Map<string, string> {
  const colorMap = new Map<string, string>();
  projects.forEach((project, index) => {
    colorMap.set(project.id, getProjectColor(index));
  });
  return colorMap;
}

// Deadline warning utilities
export const URGENT_THRESHOLD_DAYS = 3;

export function isUrgent(dueDate: Date): boolean {
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= URGENT_THRESHOLD_DAYS;
}

export function isOverdue(dueDate: Date, isCompleted: boolean): boolean {
  if (isCompleted) return false;
  return dueDate < new Date();
}

export function getDeadlineStatus(
  dueDate: Date,
  isCompleted: boolean
): 'normal' | 'urgent' | 'overdue' {
  if (isOverdue(dueDate, isCompleted)) return 'overdue';
  if (isUrgent(dueDate)) return 'urgent';
  return 'normal';
}

export const DEADLINE_STYLES = {
  normal: '',
  urgent: 'ring-2 ring-amber-400 ring-offset-1',
  overdue: 'ring-2 ring-red-500 ring-offset-1 opacity-90',
} as const;
