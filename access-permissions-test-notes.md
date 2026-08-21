# Access permissions verification notes

On 21 August 2026, the teacher portal displayed the new Grade 4 and Grade 5 controls in both the new-account form and every existing student row. The newly created `mahmoud` account was temporarily restricted to Grade 4 through the teacher interface; the account summary changed to show only Grade 4, and the database stored `allowed_grades = grade4`.

The Grade 5 permission was then restored for the same test account, and the teacher interface again showed both Grade 4 and Grade 5. The account was left with both grades enabled after the test.

The portal also shows the new trial-account description: each device receives an independent one-hour trial, and only a device whose hour ended is locked.
