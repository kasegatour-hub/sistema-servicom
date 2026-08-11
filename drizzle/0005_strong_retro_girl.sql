ALTER TABLE `local_accounts` ADD `name` varchar(255);--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `lastName` varchar(255);--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `dni` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `accountId` int;