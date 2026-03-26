-- Expand shop_submissions status to include pending_review and rejected
ALTER TABLE shop_submissions
  DROP CONSTRAINT shop_submissions_status_check,
  ADD CONSTRAINT shop_submissions_status_check
    CHECK (status IN ('pending', 'processing', 'pending_review', 'live', 'rejected', 'failed'));

-- Add rejection reason column for admin rejections
ALTER TABLE shop_submissions ADD COLUMN rejection_reason TEXT;
