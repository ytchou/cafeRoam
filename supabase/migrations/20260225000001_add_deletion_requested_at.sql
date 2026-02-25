-- Add soft-delete support for 30-day grace period account deletion
ALTER TABLE profiles ADD COLUMN deletion_requested_at TIMESTAMPTZ;
