import { mysqlTable, int, varchar, json, timestamp, index, uniqueIndex, decimal } from 'drizzle-orm/mysql-core';

export const aiResults = mysqlTable('ai_results', {
  id: int('id').autoincrement().primaryKey(),
  hash: varchar('hash', { length: 64 }).notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  model: varchar('model', { length: 64 }).notNull(),
  promptKey: varchar('prompt_key', { length: 64 }).notNull(),
  promptVersion: varchar('prompt_version', { length: 16 }).notNull(),
  // Nullable fields to allow partial AI info
  alignment: varchar('alignment', { length: 16 }),
  alignmentScore: varchar('alignment_score', { length: 16 }),
  stanceLabel: varchar('stance_label', { length: 32 }),
  stanceScore: varchar('stance_score', { length: 16 }),
  confidence: varchar('confidence', { length: 16 }),
  meta: json('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  hashIdx: uniqueIndex('ai_results_hash_uq').on(t.hash),
  createdIdx: index('ai_results_created_idx').on(t.createdAt),
}));

// Existing table from database/init.sql; keep names/types aligned
export const analysisResults = mysqlTable('analysis_results', {
  id: int('id').autoincrement().primaryKey(),
  communityName: varchar('community_name', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  biasScore: decimal('bias_score', { precision: 3, scale: 1 }),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  analysisDate: timestamp('analysis_date').defaultNow().notNull(),
  signalBreakdown: json('signal_breakdown'),
}, (t) => ({
  cpIdx: index('idx_community_platform').on(t.communityName, t.platform),
}));

// Mirror of seeded MBFC dataset; DO NOT DROP/MODIFY via migrations
export const mbfcSources = mysqlTable('mbfc_sources', {
  id: int('id').autoincrement().primaryKey(),
  sourceName: varchar('source_name', { length: 255 }).notNull(),
  mbfcUrl: varchar('mbfc_url', { length: 500 }),
  bias: varchar('bias', { length: 100 }),
  country: varchar('country', { length: 100 }),
  factualReporting: varchar('factual_reporting', { length: 50 }),
  mediaType: varchar('media_type', { length: 100 }),
  sourceUrl: varchar('source_url', { length: 255 }),
  credibility: varchar('credibility', { length: 50 }),
  sourceId: int('source_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  sourceUrlIdx: index('idx_source_url').on(t.sourceUrl),
}));
