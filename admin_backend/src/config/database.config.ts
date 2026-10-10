import { registerAs } from '@nestjs/config';

function isSslEnabled(): boolean {
  const host = process.env.DB_HOST ?? '';
  return process.env.DB_SSL === 'true' || host.includes('rds.amazonaws.com');
}

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: process.env.NODE_ENV !== 'production',
  ssl: isSslEnabled(),
}));
