CREATE TABLE `operating_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceKey` varchar(96) NOT NULL DEFAULT 'servicom',
	`workspaceLabel` varchar(180) NOT NULL DEFAULT 'Servicom Internacional',
	`shipmentId` int,
	`category` enum('transporte','agencia_provincial','embalaje','operativo','otro') NOT NULL DEFAULT 'operativo',
	`amount` decimal(12,2) NOT NULL,
	`currency` enum('EUR','PEN') NOT NULL DEFAULT 'EUR',
	`description` varchar(500) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`createdByAdminId` int NOT NULL,
	`createdByLabel` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operating_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operating_expenses_workspace_period_idx` ON `operating_expenses` (`workspaceKey`,`expenseDate`);--> statement-breakpoint
CREATE INDEX `operating_expenses_shipment_idx` ON `operating_expenses` (`shipmentId`);--> statement-breakpoint
CREATE INDEX `operating_expenses_creator_idx` ON `operating_expenses` (`createdByAdminId`,`createdAt`);