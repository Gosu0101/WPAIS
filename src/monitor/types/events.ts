import { RiskLevel, AlertType, AlertSeverity } from './enums';

export class RiskAlertEvent {
  constructor(
    public readonly projectId: string,
    public readonly episodeId: string,
    public readonly previousLevel: RiskLevel,
    public readonly newLevel: RiskLevel,
    public readonly message: string,
  ) {}
}

export class SealDeadlineAlertEvent {
  constructor(
    public readonly projectId: string,
    public readonly daysRemaining: number,
    public readonly isOnTrack: boolean,
    public readonly message: string,
  ) {}
}

export class VelocityAlertEvent {
  constructor(
    public readonly projectId: string,
    public readonly actualVelocity: number,
    public readonly requiredVelocity: number,
    public readonly deficit: number,
    public readonly message: string,
  ) {}
}

export interface AlertEventPayload {
  projectId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}
