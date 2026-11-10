ALTER TABLE `photos` MODIFY COLUMN `r2_key` varchar(255);--> statement-breakpoint
ALTER TABLE `photos` ADD `external_url` varchar(500);--> statement-breakpoint
ALTER TABLE `photos` ADD `kind` enum('gallery','menu') DEFAULT 'gallery' NOT NULL;--> statement-breakpoint
ALTER TABLE `photos` ADD `credit_url` varchar(500);--> statement-breakpoint
ALTER TABLE `restaurants` ADD `features` json;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `amenities` json;