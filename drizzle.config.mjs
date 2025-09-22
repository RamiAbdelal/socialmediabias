import 'dotenv/config';

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './frontend/src/server/db/schema.ts',
  out: './frontend/drizzle',
  driver: 'mysql2',
  dbCredentials: {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  },
};
