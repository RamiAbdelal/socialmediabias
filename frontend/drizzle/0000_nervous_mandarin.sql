CREATE TABLE `ai_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hash` varchar(64) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`model` varchar(64) NOT NULL,
	`prompt_key` varchar(64) NOT NULL,
	`prompt_version` varchar(16) NOT NULL,
	`alignment` varchar(16),
	`alignment_score` varchar(16),
	`stance_label` varchar(32),
	`stance_score` varchar(16),
	`confidence` varchar(16),
	`meta` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_results_hash_uq` UNIQUE(`hash`)
);
--> statement-breakpoint
CREATE TABLE `subreddit_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subreddit` varchar(128) NOT NULL,
	`window` enum('day','week','month') NOT NULL,
	`window_start` timestamp NOT NULL,
	`window_end` timestamp NOT NULL,
	`mbfc_raw_score` varchar(16),
	`mbfc_raw_label` varchar(32),
	`discussion_lean` varchar(16),
	`lean_normalized` varchar(16),
	`overall_score` varchar(16),
	`overall_label` varchar(32),
	`confidence` varchar(16),
	`sample_count` int,
	`posts_analyzed` int,
	`urls_checked` int,
	`bias_breakdown` json,
	`ai_version_tag` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subreddit_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ai_results_created_idx` ON `ai_results` (`created_at`);--> statement-breakpoint
CREATE INDEX `sa_subreddit_start_idx` ON `subreddit_analyses` (`subreddit`,`window_start`);--> statement-breakpoint
CREATE INDEX `sa_created_idx` ON `subreddit_analyses` (`created_at`);