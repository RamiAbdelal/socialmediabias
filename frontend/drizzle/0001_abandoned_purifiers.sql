CREATE TABLE IF NOT EXISTS `analysis_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`community_name` varchar(255) NOT NULL,
	`platform` varchar(50) NOT NULL,
	`bias_score` decimal(3,1),
	`confidence` decimal(3,2),
	`analysis_date` timestamp NOT NULL DEFAULT (now()),
	`signal_breakdown` json,
	CONSTRAINT `analysis_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE IF EXISTS `subreddit_analyses`;--> statement-breakpoint
CREATE INDEX `idx_community_platform` ON `analysis_results` (`community_name`,`platform`);