import mysql, { Pool } from 'mysql2/promise';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from './schema';

let db: MySql2Database<typeof schema> | null = null;

export function getDb(): MySql2Database<typeof schema> {
  if (db) return db;
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const { MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD } = process.env as Record<string, string | undefined>;
  if (!MYSQL_DATABASE || !MYSQL_USER || !MYSQL_PASSWORD) {
    throw new Error('Missing MySQL env vars (MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD)');
  }
  const pool: Pool = mysql.createPool({
    host,
    database: MYSQL_DATABASE,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  db = drizzle(pool, { schema, mode: 'default' });
  return db;
}
