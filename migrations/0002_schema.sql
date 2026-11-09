CREATE TABLE `user_areas` (
	`user_id` bigint unsigned NOT NULL,
	`area_id` bigint unsigned NOT NULL,
	`granted_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_areas_user_id_area_id_pk` PRIMARY KEY(`user_id`,`area_id`)
);
--> statement-breakpoint
ALTER TABLE `restaurants` ADD `verification_method` enum('visited','photo','phone');--> statement-breakpoint
ALTER TABLE `restaurants` ADD `verified_by` bigint unsigned;--> statement-breakpoint
ALTER TABLE `user_areas` ADD CONSTRAINT `user_areas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_areas` ADD CONSTRAINT `user_areas_area_id_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_areas` ADD CONSTRAINT `user_areas_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_areas_area_idx` ON `user_areas` (`area_id`);--> statement-breakpoint
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;