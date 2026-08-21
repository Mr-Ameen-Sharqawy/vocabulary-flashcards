ALTER TABLE `student_accounts` ADD `allowed_grades` varchar(32) DEFAULT 'grade4,grade5' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_devices` ADD `trial_started_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_devices` ADD `trial_ends_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_devices` ADD `trial_locked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD `allowed_grades` varchar(32) NOT NULL DEFAULT 'grade4,grade5';
