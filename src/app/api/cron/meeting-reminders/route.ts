import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTransactionalEmail } from '@/lib/email/resend-service';
import { generateMeetingEmailHtml } from '@/lib/email/email-templates';

export async function GET(req: NextRequest) {
  return processDueReminders(req);
}

export async function POST(req: NextRequest) {
  return processDueReminders(req);
}

async function processDueReminders(req: NextRequest) {
  // Authorization: accept Vercel Cron Secret or Admin token
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if authenticated user is admin
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized cron invocation' }, { status: 401 });
      }

      // Verify admin role
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      const roleName = (roleRow as any)?.roles?.name || (roleRow as any)?.roles?.[0]?.name;
      if (roleName !== 'admin' && user.email?.toLowerCase() !== 'adamwalha20@gmail.com') {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://3-z-isims.vercel.app';

  try {
    // 1. Claim up to 30 pending reminders atomically
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_pending_reminders', {
      p_batch_size: 30,
    });

    if (claimErr) {
      console.error('[ZEC Cron Worker] Claim RPC error:', claimErr);
      return NextResponse.json({ success: false, error: claimErr.message }, { status: 500 });
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending reminders due at this moment.',
      });
    }

    const results = {
      total: claimed.length,
      sent: 0,
      skippedPref: 0,
      failed: 0,
    };

    // 2. Process each claimed reminder
    for (const job of claimed) {
      try {
        // Fetch recipient profile & email preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', job.recipient_user_id)
          .maybeSingle();

        if (!profile || !profile.email) {
          await supabase
            .from('scheduled_email_reminders')
            .update({
              status: 'failed',
              error_message: 'Recipient profile or email missing',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          results.failed++;
          continue;
        }

        // Check recipient email preferences
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('meeting_reminders_enabled')
          .eq('user_id', job.recipient_user_id)
          .maybeSingle();

        if (prefs && prefs.meeting_reminders_enabled === false) {
          await supabase
            .from('scheduled_email_reminders')
            .update({
              status: 'cancelled',
              error_message: 'Recipient opted out of meeting reminder emails',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          results.skippedPref++;
          continue;
        }

        // Fetch meeting details
        const { data: meeting } = await supabase
          .from('meetings')
          .select('id, title, description, starts_at, ends_at, location, meeting_url, agenda, status')
          .eq('id', job.meeting_id)
          .maybeSingle();

        if (!meeting || meeting.status === 'cancelled') {
          await supabase
            .from('scheduled_email_reminders')
            .update({
              status: 'cancelled',
              error_message: 'Meeting was deleted or cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          continue;
        }

        // Generate email template
        const emailContent = generateMeetingEmailHtml({
          recipientName: profile.full_name || 'Membre ZEC',
          meetingTitle: meeting.title,
          meetingId: meeting.id,
          startsAt: meeting.starts_at,
          endsAt: meeting.ends_at,
          description: meeting.description,
          organizerName: 'Bureau Exécutif 3ZERO Club ISIMS',
          agenda: meeting.agenda || undefined,
          meetingUrl: meeting.meeting_url || undefined,
          reminderType: job.reminder_type as any,
          appUrl,
        });

        // Send via Resend
        const sendRes = await sendTransactionalEmail({
          to: profile.email,
          recipientUserId: profile.id,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          meetingId: meeting.id,
          reminderId: job.id,
          emailType: `meeting_${job.reminder_type}`,
        });

        if (sendRes.success) {
          await supabase
            .from('scheduled_email_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          results.sent++;
        } else {
          const newStatus = job.attempts >= 3 ? 'failed' : 'pending';
          await supabase
            .from('scheduled_email_reminders')
            .update({
              status: newStatus,
              error_message: sendRes.error || 'Provider rejected email',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          results.failed++;
        }
      } catch (itemErr: unknown) {
        const msg = itemErr instanceof Error ? itemErr.message : 'Item dispatch error';
        await supabase
          .from('scheduled_email_reminders')
          .update({
            status: 'failed',
            error_message: msg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cron worker processing error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
