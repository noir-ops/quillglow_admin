import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"

// Initialize MailerSend client
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || "",
})

export interface SendEmailOptions {
  to: string
  toName: string
  subject: string
  html: string
  text: string
  replyTo?: string
  inReplyTo?: string
  references?: string
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL || "noreply@yourdomain.com",
      process.env.MAILERSEND_FROM_NAME || "QuilGlow Support",
    )

    const recipients = [new Recipient(options.to, options.toName)]

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(options.subject)
      .setHtml(options.html)
      .setText(options.text)

    // Set reply-to for inbound routing
    if (options.replyTo) {
      emailParams.setReplyTo({
        email: options.replyTo,
        name: "QuilGlow Support",
      })
    }

    // Add email threading headers
    if (options.inReplyTo) {
      emailParams.setInReplyTo(options.inReplyTo)
    }
    if (options.references) {
      emailParams.setReferences(options.references)
    }

    const response = await mailerSend.email.send(emailParams)

    console.log("[v0] Email sent successfully:", response)
    return {
      success: true,
      messageId: response.headers?.["x-message-id"] || response.body?.message_id,
    }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    throw new Error("Failed to send email")
  }
}

export function generateEmailTemplate(params: {
  userName: string
  subject: string
  message: string
  ticketNumber: string
  replyUrl?: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${params.subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px 20px; }
          .message-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .ticket-info { background: #e3f2fd; padding: 10px 15px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
          @media only screen and (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px 15px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ QuilGlow Support</h1>
          </div>
          <div class="content">
            <p>Hi ${params.userName},</p>
            <p>Thank you for contacting us. Here's our response to your inquiry:</p>
            
            <div class="ticket-info">
              <strong>Ticket #${params.ticketNumber}</strong> | Subject: ${params.subject}
            </div>
            
            <div class="message-box">
              ${params.message.replace(/\n/g, "<br>")}
            </div>
            
            <p>You can reply directly to this email and we'll receive your message in our system.</p>
            
            ${params.replyUrl ? `<a href="${params.replyUrl}" class="button">View in Dashboard</a>` : ""}
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If you have any questions, feel free to reply to this email.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} QuilGlow. All rights reserved.</p>
            <p>This email was sent regarding ticket #${params.ticketNumber}</p>
          </div>
        </div>
      </body>
    </html>
  `

  const text = `
Hi ${params.userName},

Thank you for contacting us. Here's our response to your inquiry:

Ticket #${params.ticketNumber} | Subject: ${params.subject}

${params.message}

You can reply directly to this email and we'll receive your message in our system.

© ${new Date().getFullYear()} QuilGlow. All rights reserved.
  `.trim()

  return { html, text }
}
