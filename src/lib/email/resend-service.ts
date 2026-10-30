import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

export interface SendEmailOptions {
  to: string;
  recipientUserId: string;
  subject: string;
  html: string;
  text?: string;
  meetingId?: string | null;
  reminderId?: string | null;
  emailType?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated';
  error?: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, recipientUserId, subject, html, text, meetingId, reminderId, emailType = 'meeting_reminder' } = options;

  const resend = getResendClient();
  const fromEmail = process.env.EMAIL_FROM || 'ZEC Campus Club ISIMS <onboarding@resend.dev>';
  const replyTo = process.env.EMAIL_REPLY_TO || 'notifications@zec-isims.org';

  let result: SendEmailResult;

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to,
        replyTo,
        subject,
        html,
        text,
      });

      if (response.error) {
        result = {
          success: false,
          status: 'failed',
          error: response.error.message || 'Resend provider error',
        };
      } else {
        result = {
          success: true,
          status: 'sent',
          messageId: response.data?.id || `resend_${Date.now()}`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown email dispatch error';
      result = {
        success: false,
        status: 'failed',
        error: msg,
      };
    }
  } else {
    // Simulated Mode: Active when RESEND_API_KEY is not yet configured in local/test environment
    console.warn(`[ZEC Email Engine] RESEND_API_KEY not configured. Simulating delivery to ${to} (${subject}).`);
    result = {
      success: true,
      status: 'simulated',
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  // Persist delivery log to Supabase
  try {
    const supabase = await createClient();
    if (supabase) {
      await supabase.from('email_delivery_logs').insert({
        recipient_user_id: recipientUserId,
        meeting_id: meetingId || null,
        reminder_id: reminderId || null,
        email_type: emailType,
        recipient_email: to,
        subject,
        provider_message_id: result.messageId || null,
        delivery_status: result.status,
        error_message: result.error || null,
        sent_at: new Date().toISOString(),
      });
    }
  } catch (logErr) {
    console.error('[ZEC Email Engine] Failed to record email delivery log:', logErr);
  }

  return result;
}
