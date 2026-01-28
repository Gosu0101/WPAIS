import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskDueDates1769494200000 implements MigrationInterface {
  name = 'AddTaskDueDates1769494200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 공정별 마감일 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "pages" 
      ADD COLUMN "backgroundDueDate" TIMESTAMP,
      ADD COLUMN "lineArtDueDate" TIMESTAMP,
      ADD COLUMN "coloringDueDate" TIMESTAMP,
      ADD COLUMN "postProcessingDueDate" TIMESTAMP
    `);

    // 기존 데이터에 대해 공정별 마감일 계산 및 업데이트
    // 에피소드 기간을 4등분하여 각 공정에 할당
    await queryRunner.query(`
      UPDATE "pages" p
      SET 
        "backgroundDueDate" = e."dueDate" - (e."duration" * 3 / 4 || ' days')::interval,
        "lineArtDueDate" = e."dueDate" - (e."duration" * 2 / 4 || ' days')::interval,
        "coloringDueDate" = e."dueDate" - (e."duration" * 1 / 4 || ' days')::interval,
        "postProcessingDueDate" = e."dueDate"
      FROM "episodes" e
      WHERE p."episodeId" = e."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pages" 
      DROP COLUMN "backgroundDueDate",
      DROP COLUMN "lineArtDueDate",
      DROP COLUMN "coloringDueDate",
      DROP COLUMN "postProcessingDueDate"
    `);
  }
}
