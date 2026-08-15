CREATE TABLE `interaction_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorType` enum('anonymous','account','admin','system') NOT NULL,
	`actorId` int,
	`sessionKeyHash` varchar(128),
	`eventName` varchar(100) NOT NULL,
	`surface` varchar(100) NOT NULL,
	`metadata` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interaction_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipment_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipmentId` int NOT NULL,
	`action` enum('created','updated','deleted','restored','price_updated','signature_requested','signature_completed') NOT NULL,
	`actorType` enum('admin','account','public','system') NOT NULL,
	`actorId` int,
	`actorLabel` varchar(255),
	`reason` text,
	`snapshot` longtext,
	`metadata` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipment_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shipment_signatures` ADD `signerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `shipment_signatures` ADD `signerPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `shipment_signatures` ADD `consentTextVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `shipment_signatures` ADD `consentAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `shipment_signatures` ADD `evidenceHash` varchar(128);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryMode` enum('agencia','remoto') DEFAULT 'agencia' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `shipments` ADD `deletedByType` enum('admin','account','system');--> statement-breakpoint
ALTER TABLE `shipments` ADD `deletedById` int;--> statement-breakpoint
ALTER TABLE `shipments` ADD `deleteReason` text;--> statement-breakpoint
CREATE INDEX `interaction_events_event_idx` ON `interaction_events` (`eventName`,`createdAt`);--> statement-breakpoint
CREATE INDEX `interaction_events_actor_idx` ON `interaction_events` (`actorType`,`actorId`);--> statement-breakpoint
CREATE INDEX `shipment_audit_logs_shipment_idx` ON `shipment_audit_logs` (`shipmentId`);--> statement-breakpoint
CREATE INDEX `shipment_audit_logs_action_idx` ON `shipment_audit_logs` (`action`,`createdAt`);