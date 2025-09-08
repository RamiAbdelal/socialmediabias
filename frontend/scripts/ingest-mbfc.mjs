// Streaming importer for MBFC JSON -> MySQL (mbfc.mbfc_sources)
// Usage (inside frontend container or with envs set):
//   node scripts/ingest-mbfc.mjs [path-to-json]

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
// stream-json is CommonJS; use default import and destructure
import StreamJson from 'stream-json';
const { parser } = StreamJson;
import StreamArray from 'stream-json/streamers/StreamArray';
const { streamArray } = StreamArray;

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const JSON_PATH = process.argv[2] || path.resolve(process.cwd(), '..', 'database', 'mbfc-current.json');

async function main() {
  const stats = fs.statSync(JSON_PATH);
  if (!stats.isFile()) throw new Error(`Not a file: ${JSON_PATH}`);

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'mysql',
    user: process.env.MYSQL_USER || 'mbfc_user',
    password: process.env.MYSQL_PASSWORD || 'mbfc_pass',
    database: process.env.MYSQL_DATABASE || 'mbfc',
    multipleStatements: true,
  });

  console.log('Connected to MySQL at', process.env.MYSQL_HOST || 'mysql');
  await conn.query('CREATE DATABASE IF NOT EXISTS mbfc');
  await conn.query('USE mbfc');

  // Ensure table exists (idempotent relative to init.sql schema)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS mbfc_sources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_name VARCHAR(255) NOT NULL,
      mbfc_url VARCHAR(500),
      bias VARCHAR(100),
      country VARCHAR(100),
      factual_reporting VARCHAR(50),
      media_type VARCHAR(100),
      source_url VARCHAR(255),
      credibility VARCHAR(50),
      source_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

  console.log('Truncating mbfc_sources...');
  await conn.query('TRUNCATE TABLE mbfc_sources');

  const BATCH_SIZE = 500;
  let batch = [];
  let total = 0;

  function flush() {
    if (batch.length === 0) return Promise.resolve();
    const values = batch.flatMap(r => [
      r.source_name,
      r.mbfc_url,
      r.bias,
      r.country,
      r.factual_reporting,
      r.media_type,
      r.source_url,
      r.credibility,
      r.source_id,
    ]);
    const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
    const sql = `INSERT INTO mbfc_sources 
      (source_name, mbfc_url, bias, country, factual_reporting, media_type, source_url, credibility, source_id)
      VALUES ${placeholders}`;
    batch = [];
    return conn.query(sql, values);
  }

  console.log('Importing from', JSON_PATH);
  const pipeline = fs.createReadStream(JSON_PATH)
    .pipe(parser())
    .pipe(streamArray());

  await new Promise((resolve, reject) => {
    pipeline.on('data', ({ value }) => {
      // Map incoming keys to table columns
      const row = {
        source_name: value['Source'] ?? null,
        mbfc_url: value['MBFC URL'] ?? null,
        bias: value['Bias'] ?? null,
        country: value['Country'] ?? null,
        factual_reporting: value['Factual Reporting'] ?? null,
        media_type: value['Media Type'] ?? null,
        source_url: value['Source URL'] ?? null,
        credibility: value['Credibility'] ?? null,
        source_id: value['Source ID#'] ?? null,
      };
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        pipeline.pause();
        flush()
          .then(() => { total += BATCH_SIZE; process.stdout.write(`\rInserted: ${total}`); pipeline.resume(); })
          .catch(reject);
      }
    });
    pipeline.on('end', () => {
      const remainder = batch.length;
      flush()
        .then(() => { total += remainder; console.log(`\nDone. Total inserted: ${total}`); resolve(); })
        .catch(reject);
    });
    pipeline.on('error', reject);
  });

  await conn.end();
  console.log('MySQL connection closed.');
}

main().catch((e) => {
  console.error('Import failed:', e.message || e);
  process.exit(1);
});
