-- Seed data after all pre-ledger migrations but before the ledger migrations.
-- The old balances MUST be preserved exactly across migration.
INSERT INTO "Child" ("id", "name", "dob", "stars", "avatarCoins", "xp", "rewardedLevel")
VALUES ('aabbccdd-0000-4000-8000-000000000025', 'Avatar-Migration-Smoke-Test', '2018-04-01', 11, 17, 150, 3);
-- Legacy badges must remain unlocked but must not fire a surprise toast.
INSERT INTO "Badge" ("id", "title", "description", "icon", "ruleType", "threshold")
VALUES ('aabbccdd-0000-4000-8000-000000000026', 'Legacy First Badge', 'Earned before notifications', '🏆', 'TOTAL_TASKS', 1);
INSERT INTO "ChildBadge" ("id", "childId", "badgeId")
VALUES ('aabbccdd-0000-4000-8000-000000000027', 'aabbccdd-0000-4000-8000-000000000025', 'aabbccdd-0000-4000-8000-000000000026');
