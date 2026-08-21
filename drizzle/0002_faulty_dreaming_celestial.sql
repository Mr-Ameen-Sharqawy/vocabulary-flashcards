ALTER TABLE `student_accounts` ADD `access_type` enum('standard','trial') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD `trial_started_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD `trial_ends_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_accounts` ADD `trial_locked` boolean DEFAULT false NOT NULL;