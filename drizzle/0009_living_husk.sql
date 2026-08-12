ALTER TABLE `admins` MODIFY COLUMN `role` varchar(32) NOT NULL DEFAULT 'registrador';--> statement-breakpoint
UPDATE `admins` SET `role` = 'registrador' WHERE `role` = 'admin';--> statement-breakpoint
ALTER TABLE `admins` MODIFY COLUMN `role` enum('registrador','superadmin') NOT NULL DEFAULT 'registrador';--> statement-breakpoint
ALTER TABLE `admins` ADD `isActive` int DEFAULT 1 NOT NULL;
