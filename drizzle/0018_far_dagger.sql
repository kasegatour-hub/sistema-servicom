CREATE TABLE `shipment_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipmentId` int NOT NULL,
	`authorType` enum('admin','account') NOT NULL,
	`authorId` int NOT NULL,
	`authorLabel` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`attachmentKey` varchar(512),
	`attachmentUrl` varchar(512),
	`attachmentName` varchar(255),
	`attachmentMimeType` varchar(128),
	`attachmentSizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipment_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shipment_audit_logs` MODIFY COLUMN `action` enum('created','updated','deleted','restored','price_updated','signature_requested','signature_completed','hidden_from_registradores','shown_to_registradores','feedback_added') NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `registeredByType` enum('admin','account','system') DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `registeredById` int;--> statement-breakpoint
ALTER TABLE `shipments` ADD `registeredByLabel` varchar(255) DEFAULT 'Registro anterior' NOT NULL;--> statement-breakpoint
CREATE INDEX `shipment_feedback_shipment_idx` ON `shipment_feedback` (`shipmentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `shipment_feedback_author_idx` ON `shipment_feedback` (`authorType`,`authorId`);