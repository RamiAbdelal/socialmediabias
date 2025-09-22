-- Seeded table from database/init.sql; create only if missing
CREATE TABLE IF NOT EXISTS `mbfc_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_name` varchar(255) NOT NULL,
	`mbfc_url` varchar(500),
	`bias` varchar(100),
	`country` varchar(100),
	`factual_reporting` varchar(50),
	`media_type` varchar(100),
	`source_url` varchar(255),
	`credibility` varchar(50),
	`source_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mbfc_sources_id` PRIMARY KEY(`id`)
);
-- Index expected to exist from seed; skip duplicate creation here