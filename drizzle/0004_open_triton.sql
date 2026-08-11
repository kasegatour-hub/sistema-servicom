CREATE TABLE `local_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`passwordHash` varchar(255) NOT NULL,
	`emailVerifiedAt` timestamp,
	`phoneVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `local_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_accounts_email_unique` UNIQUE(`email`),
	CONSTRAINT `local_accounts_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`channel` enum('email','sms') NOT NULL,
	`destination` varchar(320) NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_codes_id` PRIMARY KEY(`id`)
);
