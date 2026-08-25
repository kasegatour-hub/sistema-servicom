ALTER TABLE `shipments` ADD `limaTorinoTransferMode` enum('dhl_recogida','persona_autorizada');--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryPersonName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryPersonLastName` varchar(255);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryPersonDni` varchar(20);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryPersonPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryLocationType` enum('direccion','aeropuerto_jorge_chavez');--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryLocationAddress` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryLocationLatitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `shipments` ADD `deliveryLocationLongitude` decimal(10,7);