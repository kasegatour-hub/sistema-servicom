ALTER TABLE `transfers` ADD `senderDocumentType` varchar(32) DEFAULT 'dni_peru' NOT NULL;--> statement-breakpoint
ALTER TABLE `transfers` ADD `recipientDocumentType` varchar(32) DEFAULT 'dni_peru' NOT NULL;--> statement-breakpoint
ALTER TABLE `transfers` ADD `destinationCurrency` varchar(8) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE `transfers` ADD `commissionPercent` decimal(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `transfers` ADD `exchangeRateSource` varchar(32) DEFAULT 'manual' NOT NULL;