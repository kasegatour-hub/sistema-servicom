CREATE TABLE `shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(64) NOT NULL,
	`code` varchar(64) NOT NULL,
	`status` enum('Registrado','En origen','En tránsito','En destino','Entregado') NOT NULL,
	`events` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipments_orderNumber_unique` UNIQUE(`orderNumber`)
);
