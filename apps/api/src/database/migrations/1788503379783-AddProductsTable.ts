import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductsTable1788503379783 implements MigrationInterface {
    name = 'AddProductsTable1788503379783'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "products" ("id" int NOT NULL IDENTITY(1,1), "name" nvarchar(255) NOT NULL, "price" decimal(10,2) NOT NULL, "cost_price" decimal(10,2) NOT NULL, "stock" int NOT NULL CONSTRAINT "DF_048a28949bb332d397edb9b7ab1" DEFAULT 0, "created_at" datetime2 NOT NULL CONSTRAINT "DF_995d8194c43edfc98838cabc5ab" DEFAULT getdate(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "products"`);
    }

}
