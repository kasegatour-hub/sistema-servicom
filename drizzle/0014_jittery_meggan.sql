CREATE TABLE `shipment_route_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`route` varchar(100) NOT NULL,
	`encomiendasEnabled` int NOT NULL DEFAULT 1,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipment_route_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipment_route_policies_route_unique` UNIQUE(`route`)
);
--> statement-breakpoint
ALTER TABLE `discount_coupons` ADD `appliesTo` enum('ambos','documento','encomienda') DEFAULT 'ambos' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `documentItems` longtext;--> statement-breakpoint
ALTER TABLE `shipments` ADD `contentChecklist` longtext;