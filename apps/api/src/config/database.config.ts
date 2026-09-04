export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? '192.9.200.132',
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    username: process.env.DB_USERNAME ?? 'sa',
    password: process.env.DB_PASSWORD ?? '@twp1234#',
    database: process.env.DB_DATABASE ?? 'mini_project_db',
  },
});