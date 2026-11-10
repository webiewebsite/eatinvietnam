CREATE TABLE `areas` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`short_name` varchar(20),
	`kind` enum('ward','legacy_district','neighborhood') NOT NULL,
	`parent_id` bigint unsigned,
	`city` varchar(40) NOT NULL DEFAULT 'tp-hcm',
	`is_live` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `areas_id` PRIMARY KEY(`id`),
	CONSTRAINT `areas_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`action` varchar(40) NOT NULL,
	`entity` varchar(40) NOT NULL,
	`entity_id` bigint unsigned,
	`diff` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(40) NOT NULL,
	`anon_id` char(36) NOT NULL,
	`path` varchar(200) NOT NULL,
	`props` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`group_name` varchar(60) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(255),
	`price` int unsigned NOT NULL,
	`must_try` boolean NOT NULL DEFAULT false,
	`photo_id` bigint unsigned,
	`sort_order` smallint NOT NULL DEFAULT 0,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nl_query_cache` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`query_norm` varchar(200) NOT NULL,
	`taxonomy_version` varchar(20) NOT NULL,
	`filters` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `nl_query_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `nl_query_cache_uq` UNIQUE(`query_norm`,`taxonomy_version`)
);
--> statement-breakpoint
CREATE TABLE `opening_hours` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`day` tinyint unsigned NOT NULL,
	`opens_at` time NOT NULL,
	`closes_at` time NOT NULL,
	CONSTRAINT `opening_hours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_claims` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`evidence` text,
	`reviewed_by` bigint unsigned,
	`reviewed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `owner_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`r2_key` varchar(255) NOT NULL,
	`width` smallint unsigned NOT NULL,
	`height` smallint unsigned NOT NULL,
	`alt` varchar(200) NOT NULL,
	`credit` varchar(200),
	`sort_order` smallint NOT NULL DEFAULT 0,
	`created_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`reason` enum('price','hours','closed','address','other') NOT NULL,
	`note` varchar(500),
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`resolved_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_areas` (
	`restaurant_id` bigint unsigned NOT NULL,
	`area_id` bigint unsigned NOT NULL,
	CONSTRAINT `restaurant_areas_restaurant_id_area_id_pk` PRIMARY KEY(`restaurant_id`,`area_id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_tags` (
	`restaurant_id` bigint unsigned NOT NULL,
	`tag_id` smallint unsigned NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT false,
	CONSTRAINT `restaurant_tags_restaurant_id_tag_id_pk` PRIMARY KEY(`restaurant_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('draft','pending','verified','temp_closed','closed') NOT NULL DEFAULT 'draft',
	`source` enum('editor','osm','owner','ugc') NOT NULL DEFAULT 'editor',
	`venue_type` varchar(60) NOT NULL,
	`address` varchar(255) NOT NULL,
	`location` point NOT NULL,
	`price_min` int unsigned,
	`price_max` int unsigned,
	`price_updated_at` date,
	`rating_avg` decimal(2,1),
	`rating_count` int unsigned NOT NULL DEFAULT 0,
	`editor_pick` boolean NOT NULL DEFAULT false,
	`highlight` varchar(160) NOT NULL DEFAULT '',
	`tip` varchar(255),
	`busy_hint` varchar(60),
	`phone` varchar(20),
	`grab_url` varchar(500),
	`shopee_url` varchar(500),
	`google_place_id` varchar(255),
	`search_text` text NOT NULL,
	`verified_at` datetime,
	`reverify_due_at` datetime,
	`created_by` bigint unsigned,
	`updated_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurants_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` tinyint unsigned AUTO_INCREMENT NOT NULL,
	`slug` enum('user','owner','editor','admin') NOT NULL,
	`label` varchar(40) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`two_factor_passed` boolean NOT NULL DEFAULT false,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` smallint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(60) NOT NULL,
	`label` varchar(60) NOT NULL,
	`kind` enum('dish','vibe','feature') NOT NULL,
	`group_slug` varchar(40),
	`sort_order` smallint NOT NULL DEFAULT 0,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_kind_slug_uq` UNIQUE(`kind`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` bigint unsigned NOT NULL,
	`role_id` tinyint unsigned NOT NULL,
	`granted_by` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`display_name` varchar(80) NOT NULL,
	`password_hash` varchar(255),
	`totp_secret_enc` varchar(255),
	`totp_enabled_at` datetime,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_photo_id_photos_id_fk` FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `opening_hours` ADD CONSTRAINT `opening_hours_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owner_claims` ADD CONSTRAINT `owner_claims_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owner_claims` ADD CONSTRAINT `owner_claims_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owner_claims` ADD CONSTRAINT `owner_claims_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_areas` ADD CONSTRAINT `restaurant_areas_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_areas` ADD CONSTRAINT `restaurant_areas_area_id_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_tags` ADD CONSTRAINT `restaurant_tags_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_tags` ADD CONSTRAINT `restaurant_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `areas_kind_idx` ON `areas` (`kind`,`is_live`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_name_time_idx` ON `events` (`name`,`created_at`);--> statement-breakpoint
CREATE INDEX `menu_items_restaurant_idx` ON `menu_items` (`restaurant_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `opening_hours_restaurant_idx` ON `opening_hours` (`restaurant_id`,`day`);--> statement-breakpoint
CREATE INDEX `owner_claims_restaurant_idx` ON `owner_claims` (`restaurant_id`,`status`);--> statement-breakpoint
CREATE INDEX `photos_restaurant_idx` ON `photos` (`restaurant_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `restaurant_areas_area_idx` ON `restaurant_areas` (`area_id`);--> statement-breakpoint
CREATE INDEX `restaurant_tags_tag_idx` ON `restaurant_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `restaurants_status_idx` ON `restaurants` (`status`);--> statement-breakpoint
CREATE INDEX `restaurants_reverify_idx` ON `restaurants` (`status`,`reverify_due_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);