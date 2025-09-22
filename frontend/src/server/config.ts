// Centralized server config and TTLs (DRY)

export const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Reddit fetch config
export const REDDIT_TOP_LIMIT = 25;
export const REDDIT_TOP_TIME = 'month' as const; // 'day' | 'week' | 'month' | 'year' | 'all'
export const COMMENT_TIMEOUT_MS = 10_000; // per-thread fetch timeout

// Discussion analysis batching
export const DISCUSSION_LIMIT = 6; // total posts for Phase C
export const DISCUSSION_BATCH_SIZE = 3; // emit after each batch of N
export const JITTER_MIN_MS = 50; // min per-task jitter to smooth bursts
export const JITTER_MAX_MS = 200; // max per-task jitter to smooth bursts

// Cache TTLs (ms) for in-memory layer; Redis uses seconds (set where used)
export const POSTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10m
export const COMMENTS_CACHE_TTL_MS = 30 * 60 * 1000; // 30m
export const MBFC_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d
export const AI_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d
export const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000; // 10m

// Timezone semantics
export const TIMEZONE = 'UTC';

// Persistence retention (days). Set 0 to disable automatic deletion (retain forever).
export const RETAIN_ANALYSIS_RUN_DAYS = 0;
export const RETAIN_AI_RESULTS_DAYS = 0;
