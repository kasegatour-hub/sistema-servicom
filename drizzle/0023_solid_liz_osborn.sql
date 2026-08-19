ALTER TABLE `invitation_letters` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `deletedByAdminId` int;--> statement-breakpoint
ALTER TABLE `invitation_letters` ADD `deleteReason` text;--> statement-breakpoint
CREATE INDEX `invitation_letters_deleted_idx` ON `invitation_letters` (`deletedAt`);