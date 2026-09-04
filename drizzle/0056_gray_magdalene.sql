ALTER TABLE `shipments` ADD `originPoint` varchar(32) DEFAULT 'Lima' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `destinationPoint` varchar(32) DEFAULT 'Torino' NOT NULL;