ALTER TABLE `invitation_letters` ADD `basePriceEur` decimal(10,2) DEFAULT '15.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `manualPriceEur` decimal(10,2);--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `extraPriceEur` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `extraItems` longtext;