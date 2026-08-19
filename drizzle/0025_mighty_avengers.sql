ALTER TABLE `admins` ADD `failedPasswordAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `passwordLockedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `failedPasswordAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `passwordLockedUntil` timestamp;