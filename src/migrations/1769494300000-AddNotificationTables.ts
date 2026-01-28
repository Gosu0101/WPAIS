import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddNotificationTables1769494300000 implements MigrationInterface {
  name = 'AddNotificationTables1769494300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // notifications 테이블
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'projectId', type: 'uuid' },
          { name: 'recipientId', type: 'uuid' },
          { name: 'notificationType', type: 'varchar' },
          { name: 'severity', type: 'varchar' },
          { name: 'title', type: 'text' },
          { name: 'message', type: 'text' },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'isRead', type: 'boolean', default: false },
          { name: 'readAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ columnNames: ['projectId'] }),
    );
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ columnNames: ['recipientId'] }),
    );
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ columnNames: ['projectId', 'recipientId', 'createdAt'] }),
    );
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({ columnNames: ['recipientId', 'isRead'] }),
    );

    // project_members 테이블
    await queryRunner.createTable(
      new Table({
        name: 'project_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'projectId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'role', type: 'varchar' },
          { name: 'taskType', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [{ columnNames: ['projectId', 'userId', 'taskType'] }],
      }),
      true,
    );

    await queryRunner.createIndex(
      'project_members',
      new TableIndex({ columnNames: ['projectId'] }),
    );
    await queryRunner.createIndex(
      'project_members',
      new TableIndex({ columnNames: ['userId'] }),
    );
    await queryRunner.createIndex(
      'project_members',
      new TableIndex({ columnNames: ['projectId', 'userId'] }),
    );

    // notification_settings 테이블
    await queryRunner.createTable(
      new Table({
        name: 'notification_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'projectId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'enabledTypes', type: 'text' },
          { name: 'thresholds', type: 'text' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        uniques: [{ columnNames: ['projectId', 'userId'] }],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification_settings',
      new TableIndex({ columnNames: ['projectId'] }),
    );
    await queryRunner.createIndex(
      'notification_settings',
      new TableIndex({ columnNames: ['userId'] }),
    );
    await queryRunner.createIndex(
      'notification_settings',
      new TableIndex({ columnNames: ['projectId', 'userId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_settings');
    await queryRunner.dropTable('project_members');
    await queryRunner.dropTable('notifications');
  }
}
