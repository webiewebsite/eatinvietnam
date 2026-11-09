CREATE TABLE `newsletter_subscribers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`city` varchar(40),
	`source` varchar(40) NOT NULL DEFAULT 'waitlist',
	`consent_text` varchar(40) NOT NULL,
	`consent_at` datetime NOT NULL,
	`unsubscribe_token` char(43) NOT NULL,
	`unsubscribed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_email_uq` UNIQUE(`email`),
	CONSTRAINT `newsletter_token_uq` UNIQUE(`unsubscribe_token`)
);
