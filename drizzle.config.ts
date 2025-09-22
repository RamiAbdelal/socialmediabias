export default {
  schema: './frontend/src/server/db/schema.ts',
  out: './frontend/drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    database: process.env.MYSQL_DATABASE || '',
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
  },
};
