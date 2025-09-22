import type { Config } from 'drizzle-kit';
import { config as dotenv } from 'dotenv';

// Load base env from project root, then override with frontend-local
dotenv({ path: '../.env', override: false });
dotenv({ path: './.env.local', override: true });

export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    database: process.env.MYSQL_DATABASE || '',
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
  },
} satisfies Config;