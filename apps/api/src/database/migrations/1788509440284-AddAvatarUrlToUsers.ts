import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUrlToUsers1788509440284 implements MigrationInterface {
    name = 'AddAvatarUrlToUsers1788509440284'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_url" nvarchar(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    }

}
