CREATE TABLE `invitation_letter_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitationLetterId` int NOT NULL,
	`accountId` int,
	`requestTokenHash` varchar(128) NOT NULL,
	`requestTokenExpiresAt` timestamp NOT NULL,
	`status` enum('pending','signed') NOT NULL DEFAULT 'pending',
	`signerName` varchar(255),
	`signerEmail` varchar(320),
	`consentTextVersion` varchar(64),
	`consentAcceptedAt` timestamp,
	`evidenceHash` varchar(128),
	`signatureStrokes` longtext,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitation_letter_signatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_letter_signatures_invitationLetterId_unique` UNIQUE(`invitationLetterId`),
	CONSTRAINT `invitation_letter_signatures_requestTokenHash_unique` UNIQUE(`requestTokenHash`)
);
--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `clientAccountId` int;--> statement-breakpoint
ALTER TABLE `local_accounts` ADD `mustChangePassword` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `invitation_letter_signatures_letter_idx` ON `invitation_letter_signatures` (`invitationLetterId`);--> statement-breakpoint
CREATE INDEX `invitation_letter_signatures_account_idx` ON `invitation_letter_signatures` (`accountId`);