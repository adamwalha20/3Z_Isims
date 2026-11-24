import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  dispatchTaskAssignmentNotification,
  dispatchTaskVerificationNotification,
  dispatchAnnouncementBroadcastNotification,
  dispatchClubEventNotification,
  dispatchMeetingInviteNotification,
} from '@/lib/email/notification-dispatcher';
import { sendTransactionalEmail } from '@/lib/email/resend-service';
import { generateTaskEmailHtml, generateAnnouncementEmailHtml, generateMeetingEmailHtml, generateEventEmailHtml } from '@/lib/email/email-templates';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    const body = await req.json().catch(() => ({}));
    const { action, payload } = body;

    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://3-z-isims.vercel.app';

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'task_assignment': {
        const result = await dispatchTaskAssignmentNotification({
          ...payload,
          appUrl,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'task_verification': {
        const result = await dispatchTaskVerificationNotification({
          ...payload,
          appUrl,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'announcement': {
        const result = await dispatchAnnouncementBroadcastNotification({
          ...payload,
          appUrl,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'event': {
        const result = await dispatchClubEventNotification({
          ...payload,
          appUrl,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'meeting_invite': {
        const result = await dispatchMeetingInviteNotification({
          ...payload,
          appUrl,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'test_email': {
        const targetEmail = payload?.email || user?.email || 'admin@isims.usf.tn';
        const targetName = payload?.name || user?.user_metadata?.full_name || 'Membre 3ZERO';
        const channelType = payload?.channelType || 'meeting'; // 'meeting' | 'task' | 'event' | 'announcement'

        let emailContent: { subject: string; html: string; text: string };

        if (channelType === 'task') {
          emailContent = generateTaskEmailHtml({
            recipientName: targetName,
            taskTitle: 'Audit Énergétique des Laboratoires Informatiques',
            taskId: 'task-test-01',
            status: 'todo',
            priority: 'high',
            dueAt: new Date(Date.now() + 3 * 86400 * 1000).toISOString(),
            assignedByName: 'Présidence & Bureau Exécutif',
            notes: 'Vérification du dispatch automatique transactionnel du canal Tâches.',
            eventType: 'assigned',
            appUrl,
          });
        } else if (channelType === 'event') {
          emailContent = generateEventEmailHtml({
            recipientName: targetName,
            eventTitle: 'Hackathon Climat & Transition Numérique ISIMS 2026',
            eventId: 'event-test-01',
            startsAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
            location: 'Amphithéâtre ISIMS, Sfax',
            description: 'Notification test pour valider la délivrabilité des alertes événements.',
            organizerName: 'Pôle Événements & Logistique',
            eventType: 'published',
            appUrl,
          });
        } else if (channelType === 'announcement') {
          emailContent = generateAnnouncementEmailHtml({
            recipientName: targetName,
            announcementId: 'ann-test-01',
            title: 'Lancement de la Campagne Campus Zéro Carbone 2026',
            body: 'Ceci est un email test généré par le moteur de notification du 3ZERO Club ISIMS.\n\nVotre adresse email est correctement enregistrée et reçoit les communiqués officiels.',
            authorName: 'Secrétariat Général',
            publishedAt: new Date().toISOString(),
            isPinned: true,
            appUrl,
          });
        } else {
          emailContent = generateMeetingEmailHtml({
            recipientName: targetName,
            meetingTitle: 'Session Test — Coordination Climat ISIMS',
            meetingId: 'meet-test-01',
            startsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            endsAt: new Date(Date.now() + 50 * 3600 * 1000).toISOString(),
            description: 'Email de test envoyé depuis le panneau de gestion des préférences de notification.',
            organizerName: 'Bureau Exécutif 3ZERO Club ISIMS',
            agenda: '1. Vérification du routage des emails transactionnels\n2. Validation de la délivrabilité Resend',
            meetingUrl: 'https://meet.google.com/zec-isims-sync',
            reminderType: '48h',
            appUrl,
          });
        }

        const sendRes = await sendTransactionalEmail({
          to: targetEmail,
          recipientUserId: user?.id || '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0',
          subject: `[TEST] ${emailContent.subject}`,
          html: emailContent.html,
          text: emailContent.text,
          emailType: `test_${channelType}`,
        });

        return NextResponse.json({
          success: sendRes.success,
          status: sendRes.status,
          messageId: sendRes.messageId,
          sentTo: targetEmail,
          error: sendRes.error,
          channelType,
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown dispatch error';
    console.error('[API /api/email/dispatch] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
