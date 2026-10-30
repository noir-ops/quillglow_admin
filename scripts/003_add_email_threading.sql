-- Add email threading support to contact_messages table
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS thread_id uuid,
ADD COLUMN IF NOT EXISTS parent_id uuid,
ADD COLUMN IF NOT EXISTS email_message_id text,
ADD COLUMN IF NOT EXISTS is_admin_reply boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sent_via_email boolean DEFAULT false;

-- Create index for faster thread lookups
CREATE INDEX IF NOT EXISTS idx_contact_messages_thread_id ON contact_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_parent_id ON contact_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_message_id ON contact_messages(email_message_id);

-- Add foreign key constraint for parent_id
ALTER TABLE contact_messages
ADD CONSTRAINT fk_contact_messages_parent
FOREIGN KEY (parent_id) REFERENCES contact_messages(id) ON DELETE CASCADE;

COMMENT ON COLUMN contact_messages.thread_id IS 'Groups related messages together in a conversation thread';
COMMENT ON COLUMN contact_messages.parent_id IS 'References the message this is replying to';
COMMENT ON COLUMN contact_messages.email_message_id IS 'MailerSend message ID for tracking';
COMMENT ON COLUMN contact_messages.is_admin_reply IS 'True if this message was sent by an admin';
COMMENT ON COLUMN contact_messages.sent_via_email IS 'True if this message was sent via email';
