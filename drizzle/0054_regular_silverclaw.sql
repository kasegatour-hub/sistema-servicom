ALTER TABLE `notifications` ADD `workspaceAdminId` int;--> statement-breakpoint
CREATE INDEX `notifications_workspace_idx` ON `notifications` (`workspaceAdminId`,`createdAt`);