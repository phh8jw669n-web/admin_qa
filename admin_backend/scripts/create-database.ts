import { config } from 'dotenv';
import { Client } from 'pg';

config();

const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

if (!host || !port || !user || password === undefined || !dbName) {
  throw new Error('DB_HOST, DB_PORT, DB_USER, DB_PASS and DB_NAME must be set in .env');
}

const sslEnabled =
  process.env.DB_SSL === 'true' || host.includes('rds.amazonaws.com');

const client = new Client({
  host,
  port: Number(port),
  user,
  password,
  database: 'postgres',
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

async function createDatabase() {
  await client.connect();

  const existing = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );

  if (existing.rowCount) {
    console.log(`Database "${dbName}" already exists`);
  } else {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}"`);
  }

  await client.end();
}

createDatabase().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
