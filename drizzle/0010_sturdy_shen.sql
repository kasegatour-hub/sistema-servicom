ALTER TABLE `shipments` ADD `shipmentType` enum('documento','encomienda') DEFAULT 'documento' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `weightKg` decimal(10,2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE `shipments` ADD `manualPriceEur` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` DROP COLUMN `paymentCondition`;