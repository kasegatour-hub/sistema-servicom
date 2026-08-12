ALTER TABLE `shipments` MODIFY COLUMN `paymentCondition` varchar(100) DEFAULT 'Pagará en Italia (Torino)';--> statement-breakpoint
ALTER TABLE `shipments` ADD `paymentStatus` enum('Pagado','Falta cancelar') DEFAULT 'Falta cancelar' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `route` varchar(100) DEFAULT 'Lima - Torino' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `originAddress` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `destinationAddress` text;