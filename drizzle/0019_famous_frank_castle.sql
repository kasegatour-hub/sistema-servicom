CREATE TABLE `platform_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorType` enum('admin','account') NOT NULL,
	`authorId` int NOT NULL,
	`authorLabel` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`attachmentKey` varchar(512),
	`attachmentUrl` varchar(512),
	`attachmentName` varchar(255),
	`attachmentMimeType` varchar(128),
	`attachmentSizeBytes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `platform_feedback_author_idx` ON `platform_feedback` (`authorType`,`authorId`);--> statement-breakpoint
CREATE INDEX `platform_feedback_created_idx` ON `platform_feedback` (`createdAt`);