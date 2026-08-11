ALTER TABLE `shipments` MODIFY COLUMN `status` enum('En agencia','En tránsito','En destino','Entregado') NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` MODIFY COLUMN `events` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `senderName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `senderLastName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `senderDni` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `senderPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `recipientName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `recipientLastName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `recipientDni` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `recipientPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `notes` text;