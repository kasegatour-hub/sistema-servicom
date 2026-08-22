ALTER TABLE `clients` ADD `ownerAdminId` int;--> statement-breakpoint
CREATE INDEX `clients_owner_admin_idx` ON `clients` (`ownerAdminId`,`createdAt`);