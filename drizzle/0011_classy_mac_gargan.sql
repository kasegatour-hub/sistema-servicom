CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`dni` varchar(20),
	`phone` varchar(32),
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `clients_dni_idx` ON `clients` (`dni`);--> statement-breakpoint
CREATE INDEX `clients_name_last_name_idx` ON `clients` (`name`,`lastName`);