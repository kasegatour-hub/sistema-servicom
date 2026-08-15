CREATE TABLE `shipment_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shipmentId` int NOT NULL,
	`requestTokenHash` varchar(128) NOT NULL,
	`requestTokenExpiresAt` timestamp NOT NULL,
	`status` enum('pending','signed') NOT NULL DEFAULT 'pending',
	`signerName` varchar(255),
	`signerDni` varchar(20),
	`signatureStrokes` longtext,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipment_signatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipment_signatures_shipmentId_unique` UNIQUE(`shipmentId`),
	CONSTRAINT `shipment_signatures_requestTokenHash_unique` UNIQUE(`requestTokenHash`)
);
--> statement-breakpoint
CREATE INDEX `shipment_signatures_shipment_idx` ON `shipment_signatures` (`shipmentId`);