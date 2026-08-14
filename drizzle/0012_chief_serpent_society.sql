CREATE TABLE `discount_coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`discountPercent` decimal(5,2) NOT NULL DEFAULT '25.00',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdByAdminId` int NOT NULL,
	`redeemedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `shipments` ADD `couponCode` varchar(64);--> statement-breakpoint
ALTER TABLE `shipments` ADD `basePriceEur` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` ADD `discountPercent` decimal(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `discountAmountEur` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `finalPriceEur` decimal(10,2);