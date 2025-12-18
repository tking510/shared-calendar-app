CREATE TABLE `event_people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`personId` int NOT NULL,
	CONSTRAINT `event_people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320),
	`color` varchar(7) NOT NULL DEFAULT '#6366F1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
