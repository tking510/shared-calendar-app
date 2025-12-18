CREATE TABLE `event_friends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`friendId` int NOT NULL,
	CONSTRAINT `event_friends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`telegramChatId` varchar(100),
	`telegramUsername` varchar(100),
	`color` varchar(7) NOT NULL DEFAULT '#6366F1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `friends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `event_people`;--> statement-breakpoint
DROP TABLE `people`;--> statement-breakpoint
ALTER TABLE `reminders` ADD `customMessage` text;--> statement-breakpoint
ALTER TABLE `departments` DROP COLUMN `userId`;