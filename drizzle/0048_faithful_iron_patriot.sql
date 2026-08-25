CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientType` enum('admin','account') NOT NULL,
	`recipientId` int NOT NULL,
	`kind` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`actorType` enum('admin','account','system') NOT NULL,
	`actorId` int,
	`actorLabel` varchar(255),
	`isRead` int NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientType`,`recipientId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`recipientType`,`recipientId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_entity_idx` ON `notifications` (`entityType`,`entityId`);