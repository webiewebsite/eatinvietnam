CREATE TABLE `user_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`purpose` enum('invite','reset') NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_tokens_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `restaurant_tags` ADD `criteria` json;--> statement-breakpoint
ALTER TABLE `user_tokens` ADD CONSTRAINT `user_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_tokens` ADD CONSTRAINT `user_tokens_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_tokens_user_idx` ON `user_tokens` (`user_id`);