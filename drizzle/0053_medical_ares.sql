ALTER TABLE `shipments` DROP INDEX `shipments_orderNumber_unique`;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_code_unique` UNIQUE(`orderNumber`,`code`);