import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Alert } from '../entities';
import {
  AlertType,
  AlertSeverity,
  RiskLevel,
  AlertEventPayload,
  RiskAlertEvent,
  SealDeadlineAlertEvent,
  VelocityAlertEvent,
} from '../types';

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async emitAlert(payload: AlertEventPayload): Promise<Alert> {
    const alert = this.alertRepository.create({
      projectId: payload.projectId,
      alertType: payload.alertType,
      severity: payload.severity,
      message: payload.message,
      metadata: payload.metadata,
    });

    const savedAlert = await this.alertRepository.save(alert);

    this.eventEmitter.emit('alert.created', savedAlert);

    return savedAlert;
  }

  async emitRiskAlert(event: RiskAlertEvent): Promise<Alert> {
    const severity = this.getRiskAlertSeverity(event.newLevel);

    return this.emitAlert({
      projectId: event.projectId,
      alertType: AlertType.RISK_LEVEL_CHANGE,
      severity,
      message: event.message,
      metadata: {
        episodeId: event.episodeId,
        previousLevel: event.previousLevel,
        newLevel: event.newLevel,
      },
    });
  }

  async emitSealDeadlineAlert(event: SealDeadlineAlertEvent): Promise<Alert> {
    const severity = this.getSealDeadlineSeverity(event.daysRemaining);

    return this.emitAlert({
      projectId: event.projectId,
      alertType: AlertType.SEAL_DEADLINE_APPROACHING,
      severity,
      message: event.message,
      metadata: {
        daysRemaining: event.daysRemaining,
        isOnTrack: event.isOnTrack,
      },
    });
  }

  async emitVelocityAlert(event: VelocityAlertEvent): Promise<Alert> {
    const deficitPercent =
      event.requiredVelocity > 0
        ? (event.deficit / event.requiredVelocity) * 100
        : 0;
    const severity = this.getVelocitySeverity(deficitPercent);

    return this.emitAlert({
      projectId: event.projectId,
      alertType: AlertType.VELOCITY_DEFICIT,
      severity,
      message: event.message,
      metadata: {
        actualVelocity: event.actualVelocity,
        requiredVelocity: event.requiredVelocity,
        deficit: event.deficit,
      },
    });
  }

  async getAlertHistory(
    projectId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      alertType?: AlertType;
      severity?: AlertSeverity;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ alerts: Alert[]; total: number }> {
    const where: Record<string, unknown> = { projectId };

    if (options?.alertType) {
      where.alertType = options.alertType;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.startDate && options?.endDate) {
      where.createdAt = Between(options.startDate, options.endDate);
    } else if (options?.startDate) {
      where.createdAt = MoreThanOrEqual(options.startDate);
    } else if (options?.endDate) {
      where.createdAt = LessThanOrEqual(options.endDate);
    }

    const [alerts, total] = await this.alertRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return { alerts, total };
  }

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledgedAt = new Date();
    return this.alertRepository.save(alert);
  }

  private getRiskAlertSeverity(riskLevel: RiskLevel): AlertSeverity {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return AlertSeverity.CRITICAL;
      case RiskLevel.HIGH:
        return AlertSeverity.ERROR;
      case RiskLevel.MEDIUM:
        return AlertSeverity.WARNING;
      default:
        return AlertSeverity.INFO;
    }
  }

  private getSealDeadlineSeverity(daysRemaining: number): AlertSeverity {
    if (daysRemaining <= 3) return AlertSeverity.CRITICAL;
    if (daysRemaining <= 7) return AlertSeverity.ERROR;
    if (daysRemaining <= 14) return AlertSeverity.WARNING;
    return AlertSeverity.INFO;
  }

  private getVelocitySeverity(deficitPercent: number): AlertSeverity {
    if (deficitPercent >= 50) return AlertSeverity.CRITICAL;
    if (deficitPercent >= 30) return AlertSeverity.ERROR;
    if (deficitPercent >= 10) return AlertSeverity.WARNING;
    return AlertSeverity.INFO;
  }
}
