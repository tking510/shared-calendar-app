CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#10B981',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`departmentId` int NOT NULL,
	CONSTRAINT `event_departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_departments_id` PRIMARY KEY(`id`)
);
