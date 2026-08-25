ALTER TABLE `platform_feedback` ADD `authorEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `platform_feedback` ADD `authorRole` varchar(64) DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_feedback` ADD `workspaceKey` varchar(96) DEFAULT 'servicom' NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_feedback` ADD `workspaceLabel` varchar(180) DEFAULT 'Servicom Internacional' NOT NULL;--> statement-breakpoint
CREATE INDEX `platform_feedback_workspace_idx` ON `platform_feedback` (`workspaceKey`,`createdAt`);