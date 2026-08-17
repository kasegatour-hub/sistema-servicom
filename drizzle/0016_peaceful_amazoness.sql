CREATE TABLE `admin_password_reset_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`destination` varchar(320) NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_password_reset_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_password_reset_codes_admin_idx` ON `admin_password_reset_codes` (`adminId`,`createdAt`);