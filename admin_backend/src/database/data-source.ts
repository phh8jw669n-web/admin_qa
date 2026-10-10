import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const host = process.env.DB_HOST ?? '';
const sslEnabled =
  process.env.DB_SSL === 'true' || host.includes('rds.amazonaws.com');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  extra: sslEnabled ? { ssl: { rejectUnauthorized: false } } : undefined,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
