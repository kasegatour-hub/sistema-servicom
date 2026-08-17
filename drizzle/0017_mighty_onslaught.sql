ALTER TABLE `shipment_audit_logs` MODIFY COLUMN `action` enum('created','updated','deleted','restored','price_updated','signature_requested','signature_completed','hidden_from_registradores','shown_to_registradores') NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `hiddenFromRegistradoresAt` timestamp;--> statement-breakpoint
ALTER TABLE `shipments` ADD `hiddenFromRegistradoresByAdminId` int;--> statement-breakpoint
ALTER TABLE `shipments` ADD `hideFromRegistradoresReason` text;