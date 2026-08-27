CREATE TABLE `delivery_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationType` enum('documento','encomienda','transferencia') NOT NULL,
	`operationId` int NOT NULL,
	`operationReference` varchar(64) NOT NULL,
	`brand` enum('servicom','kasega') NOT NULL DEFAULT 'servicom',
	`legalEntity` varchar(255) NOT NULL,
	`recipientName` varchar(255) NOT NULL,
	`recipientLastName` varchar(255) NOT NULL,
	`recipientDni` varchar(64) NOT NULL,
	`status` enum('pending','signed') NOT NULL DEFAULT 'pending',
	`deliveredAt` timestamp,
	`signerName` varchar(255),
	`signerDni` varchar(64),
	`signatureStrokes` longtext,
	`consentTextVersion` varchar(64),
	`consentAcceptedAt` timestamp,
	`evidenceHash` varchar(128),
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `delivery_receipts_operation_idx` ON `delivery_receipts` (`operationType`,`operationId`);--> statement-breakpoint
CREATE INDEX `delivery_receipts_reference_idx` ON `delivery_receipts` (`operationReference`);