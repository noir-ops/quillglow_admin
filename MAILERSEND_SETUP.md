# MailerSend Email Integration Setup

This guide explains how to set up bidirectional email communication between admins and users using MailerSend.

## Features

- **Admin → User**: Send email replies from the admin panel
- **User → Admin**: Receive user email replies back into the admin panel
- **Threaded Conversations**: Track full email conversation history
- **Mobile Responsive**: Works perfectly on all devices

## Setup Instructions

### 1. Create MailerSend Account

1. Go to [MailerSend](https://www.mailersend.com/) and create an account
2. Verify your domain or use their testing domain
3. Get your API key from the dashboard

### 2. Add Environment Variables

Add these environment variables to your Vercel project:

\`\`\`env
MAILERSEND_API_KEY=your_api_key_here
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=QuilGlow Support
MAILERSEND_INBOUND_EMAIL=support@yourdomain.com
MAILERSEND_WEBHOOK_SECRET=your_webhook_secret_here
\`\`\`

### 3. Install MailerSend Package

The `mailersend` npm package is automatically installed when you use the code.

### 4. Run Database Migration

Execute the SQL migration to add email threading support:

\`\`\`bash
# The migration file is at: scripts/003_add_email_threading.sql
# Run it in your Supabase SQL editor or via the admin panel
\`\`\`

### 5. Set Up Inbound Email Routing

1. Go to your MailerSend dashboard
2. Navigate to **Inbound Routes**
3. Create a new inbound route:
   - **Domain**: Your verified domain
   - **Match**: `support@yourdomain.com` (or your preferred email)
   - **Forward to**: `https://yourdomain.com/api/mailersend/inbound`
   - **Enabled**: Yes

### 6. Configure Webhook (Optional)

For additional email event tracking:

1. Go to **Webhooks** in MailerSend dashboard
2. Create a new webhook:
   - **URL**: `https://yourdomain.com/api/mailersend/webhook`
   - **Events**: Select events you want to track (delivered, opened, etc.)
   - **Signing Secret**: Copy this to `MAILERSEND_WEBHOOK_SECRET`

## How It Works

### Admin Sends Reply

1. Admin opens a contact message in the admin panel
2. Admin types a reply and clicks "Send via Email"
3. System sends email to user via MailerSend API
4. Email includes proper Reply-To header for inbound routing
5. Reply is saved in database with thread tracking

### User Replies to Email

1. User receives email and clicks reply
2. User's email client sends reply to the Reply-To address
3. MailerSend receives the email and forwards to webhook
4. Webhook endpoint parses email and saves to database
5. Admin sees the reply in the admin panel conversation thread

## Testing

### Test Outbound Email

1. Go to `/admin/contacts`
2. Click on any contact message
3. Click "Reply via Email"
4. Type a message and send
5. Check the user's email inbox

### Test Inbound Email

1. Reply to the email you received
2. Check the admin panel - the reply should appear in the conversation thread
3. Check the webhook logs in MailerSend dashboard

## Troubleshooting

### Emails Not Sending

- Verify `MAILERSEND_API_KEY` is correct
- Check domain verification in MailerSend dashboard
- Check console logs for error messages

### Inbound Emails Not Working

- Verify inbound route is configured correctly
- Check webhook URL is publicly accessible
- Verify `MAILERSEND_INBOUND_EMAIL` matches the inbound route
- Check API logs at `/api/mailersend/inbound`

### Thread Not Linking

- Ensure database migration was run successfully
- Check that `thread_id` and `parent_id` fields exist
- Verify ticket numbers are being preserved

## Email Template Customization

Edit the email template in `lib/mailersend.ts`:

\`\`\`typescript
export function generateEmailTemplate(params: {
  userName: string
  subject: string
  message: string
  ticketNumber: string
  replyUrl?: string
}) {
  // Customize HTML and text templates here
}
\`\`\`

## Security Notes

- Always validate webhook signatures in production
- Use HTTPS for webhook endpoints
- Store API keys securely in environment variables
- Implement rate limiting on webhook endpoints
- Sanitize user input before displaying in admin panel

## Support

For issues with MailerSend integration:
- Check [MailerSend Documentation](https://developers.mailersend.com/)
- Review webhook logs in MailerSend dashboard
- Check application logs for error messages
