ALTER TABLE `clients` ADD `documentType` enum('dni_peru','pasaporte','carta_identita_italia') DEFAULT 'dni_peru' NOT NULL;--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `documentType` enum('dni_peru','pasaporte','carta_identita_italia') DEFAULT 'dni_peru' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `senderDocumentType` enum('dni_peru','pasaporte','carta_identita_italia') DEFAULT 'dni_peru' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `recipientDocumentType` enum('dni_peru','pasaporte','carta_identita_italia') DEFAULT 'dni_peru' NOT NULL;