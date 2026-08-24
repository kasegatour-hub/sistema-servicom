ALTER TABLE `shipments` ADD `requiresTranslationService` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `isIncomplete` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `incompleteReason` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `photoMetadata` longtext;