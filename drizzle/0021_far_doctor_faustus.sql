ALTER TABLE `shipments` ADD `documentKind` enum('simple','apostillado') DEFAULT 'apostillado' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `documentSheetCount` int DEFAULT 1 NOT NULL;