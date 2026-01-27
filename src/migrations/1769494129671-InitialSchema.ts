import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769494129671 implements MigrationInterface {
    name = 'InitialSchema1769494129671'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "milestones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "targetDate" TIMESTAMP NOT NULL, "isCompleted" boolean NOT NULL DEFAULT false, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0bdbfe399c777a6a8520ff902d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "launchDate" TIMESTAMP NOT NULL, "sealDate" TIMESTAMP NOT NULL, "productionStartDate" TIMESTAMP NOT NULL, "hiringStartDate" TIMESTAMP NOT NULL, "planningStartDate" TIMESTAMP NOT NULL, "velocityConfig" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_project_launch_date" ON "projects" ("launchDate") `);
        await queryRunner.query(`CREATE TABLE "episodes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "episodeNumber" integer NOT NULL, "dueDate" TIMESTAMP NOT NULL, "duration" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "isSealed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a003fda8b0473fffc39cb831c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_episode_project_id" ON "episodes" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "idx_episode_due_date" ON "episodes" ("dueDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_38449f9f65c8edcf98aec964da" ON "episodes" ("projectId", "dueDate") `);
        await queryRunner.query(`CREATE TABLE "pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "episodeId" uuid NOT NULL, "pageNumber" integer NOT NULL, "heightPx" integer NOT NULL DEFAULT '20000', "backgroundStatus" character varying NOT NULL DEFAULT 'READY', "lineArtStatus" character varying NOT NULL DEFAULT 'LOCKED', "coloringStatus" character varying NOT NULL DEFAULT 'LOCKED', "postProcessingStatus" character varying NOT NULL DEFAULT 'LOCKED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f21ed625aa34c8391d636b7d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_page_episode_id" ON "pages" ("episodeId") `);
        await queryRunner.query(`CREATE TABLE "progress_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "snapshotDate" date NOT NULL, "metrics" jsonb NOT NULL, "healthScore" numeric(5,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_17917254784c4224f69a24a9e63" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f06beba23d61f20fa4744a6cf" ON "progress_snapshots" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d75a590bcd1f653016932d9ec9" ON "progress_snapshots" ("projectId", "snapshotDate") `);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "alertType" character varying NOT NULL, "severity" character varying NOT NULL, "message" text NOT NULL, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "acknowledgedAt" TIMESTAMP, CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a7dbbc40b364957973946190a4" ON "alerts" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_3e0e33c089e78bf961ca9f6f46" ON "alerts" ("projectId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "milestones" ADD CONSTRAINT "FK_662a1f9d865fe49768fa369fd0f" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "episodes" ADD CONSTRAINT "FK_f7859effa389e5e9999b1c48908" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pages" ADD CONSTRAINT "FK_7951fef61603ade326e49a170ab" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "FK_7951fef61603ade326e49a170ab"`);
        await queryRunner.query(`ALTER TABLE "episodes" DROP CONSTRAINT "FK_f7859effa389e5e9999b1c48908"`);
        await queryRunner.query(`ALTER TABLE "milestones" DROP CONSTRAINT "FK_662a1f9d865fe49768fa369fd0f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e0e33c089e78bf961ca9f6f46"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a7dbbc40b364957973946190a4"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d75a590bcd1f653016932d9ec9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f06beba23d61f20fa4744a6cf"`);
        await queryRunner.query(`DROP TABLE "progress_snapshots"`);
        await queryRunner.query(`DROP INDEX "public"."idx_page_episode_id"`);
        await queryRunner.query(`DROP TABLE "pages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38449f9f65c8edcf98aec964da"`);
        await queryRunner.query(`DROP INDEX "public"."idx_episode_due_date"`);
        await queryRunner.query(`DROP INDEX "public"."idx_episode_project_id"`);
        await queryRunner.query(`DROP TABLE "episodes"`);
        await queryRunner.query(`DROP INDEX "public"."idx_project_launch_date"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TABLE "milestones"`);
    }

}
