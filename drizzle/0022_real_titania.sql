CREATE TABLE `invitation_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByAdminId` int NOT NULL,
	`createdByAdminLabel` varchar(255) NOT NULL,
	`inviterName` varchar(255) NOT NULL,
	`inviterLastName` varchar(255) NOT NULL,
	`inviteeName` varchar(255) NOT NULL,
	`inviteeLastName` varchar(255) NOT NULL,
	`letterData` longtext NOT NULL,
	`italianData` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitation_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `invitation_letters_creator_created_idx` ON `invitation_letters` (`createdByAdminId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `invitation_letters_created_idx` ON `invitation_letters` (`createdAt`);