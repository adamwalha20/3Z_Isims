import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTransactionalEmail } from '@/lib/email/resend-service';
import { generateMeetingEmailHtml } from '@/lib/email/email-templates';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.toEmail || user?.email || 'admin@isims.usf.tn';
    const recipientName = body.recipientName || user?.user_metadata?.full_name || 'Admin ZEC';

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://3-z-isims.vercel.app';
    const sampleStartsAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const sampleEndsAt = new Date(Date.now() + 50 * 3600 * 1000).toISOString();

    const emailContent = generateMeetingEmailHtml({
      recipientName,
      meetingTitle: 'Session Test — Coordination Climat ISIMS',
      meetingId: 'meet-001',
      startsAt: sampleStartsAt,
      endsAt: sampleEndsAt,
      description: 'Email de test envoyé depuis le panneau d’administration du système d’automatisation.',
      organizerName: 'Bureau Exécutif 3ZERO Club ISIMS',
      agenda: '1. Vérification de la délivrabilité Resend\n2. Validation du gabarit HTML émeraude\n3. Test des liens de redirection vers le Hub',
      meetingUrl: 'https://meet.google.com/zec-isims-sync',
      reminderType: body.reminderType || '48h',
      appUrl,
    });

    const sendRes = await sendTransactionalEmail({
      to: targetEmail,
      recipientUserId: user?.id || 'usr-admin-001',
      subject: `[TEST] ${emailContent.subject}`,
      html: emailContent.html,
      text: emailContent.text,
      meetingId: 'meet-001',
      emailType: 'admin_test_email',
    });

    return NextResponse.json({
      success: sendRes.success,
      status: sendRes.status,
      messageId: sendRes.messageId,
      sentTo: targetEmail,
      error: sendRes.error,
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      message:
        sendRes.status === 'simulated'
          ? 'Simulation mode active: Configure RESEND_API_KEY to send real transactional emails.'
          : 'Real test email dispatched through Resend.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send test email';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

