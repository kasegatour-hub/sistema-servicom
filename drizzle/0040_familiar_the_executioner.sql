ALTER TABLE `clients` ADD `isSender` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceSenderName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceSenderLastName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceSenderDni` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceSenderPhone` varchar(20);