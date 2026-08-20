CREATE TABLE `student_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`display_name` varchar(120) NOT NULL,
	`username` varchar(48) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`session_version` int NOT NULL DEFAULT 1,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_accounts_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `student_progress` (
	`student_id` int NOT NULL,
	`selected_lesson_id` varchar(48),
	`lesson_answers` json NOT NULL,
	`quiz_scores` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_progress_student_id` PRIMARY KEY(`student_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
