-- Allow a user to belong to multiple offices (one broker record per office).
-- Replaces the old single-office constraint on user_id alone.
ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_user_id_unique;
ALTER TABLE brokers ADD CONSTRAINT brokers_user_office_unique UNIQUE (user_id, office_id);
