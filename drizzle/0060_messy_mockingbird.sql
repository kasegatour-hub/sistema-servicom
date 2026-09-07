ALTER TABLE `shipments` ADD `apostilleManualPrice` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` ADD `apostilleManualCurrency` enum('EUR','USD','PEN') DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE `shipments` ADD `translationManualPrice` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` ADD `translationManualCurrency` enum('EUR','USD','PEN') DEFAULT 'EUR';