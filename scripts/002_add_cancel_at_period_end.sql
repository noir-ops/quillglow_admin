-- Add cancel_at_period_end field to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of subscriptions to downgrade
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_period 
ON subscriptions(cancel_at_period_end, current_period_end) 
WHERE cancel_at_period_end = TRUE;
