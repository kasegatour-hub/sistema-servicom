ALTER TABLE `shipments` ADD `isProvinceDelivery` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceCustomerPriceEur` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceOperationalCostSoles` decimal(10,2);--> statement-breakpoint
ALTER TABLE `shipments` ADD `provinceCarrier` enum('olva','shalom') DEFAULT 'shalom';