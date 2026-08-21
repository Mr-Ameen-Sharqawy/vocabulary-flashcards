CREATE TABLE `student_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`device_id` varchar(80) NOT NULL,
	`device_label` varchar(120) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_devices_student_device_unique` UNIQUE(`student_id`,`device_id`)
);
--> statement-breakpoint
ALTER TABLE `student_accounts` ADD `max_devices` int DEFAULT 1 NOT NULL;