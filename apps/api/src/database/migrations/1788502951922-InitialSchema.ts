import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788502951922 implements MigrationInterface {
    name = 'InitialSchema1788502951922'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" int NOT NULL IDENTITY(1,1), "email" nvarchar(255) NOT NULL, "password_hash" nvarchar(255) NOT NULL, "name" nvarchar(255) NOT NULL, "role" nvarchar(50) NOT NULL CONSTRAINT "DF_ace513fa30d485cfd25c11a9e4a" DEFAULT 'staff', "created_at" datetime2 NOT NULL CONSTRAINT "DF_c9b5b525a96ddc2c5647d7f7fa5" DEFAULT getdate(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
