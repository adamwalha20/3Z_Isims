import { formatTunisDate, formatTunisTime } from './timezone-utils';

export interface MeetingEmailData {
  recipientName: string;
  meetingTitle: string;
  meetingId: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  organizerName: string;
  agenda?: string;
  meetingUrl?: string;
  reminderType: '48h' | 'morning_8am' | '1h' | 'urgent' | 'cancellation' | 'reschedule';
  appUrl: string;
  oldSchedule?: {
    startsAt: string;
    endsAt: string;
  };
}

export function generateMeetingEmailHtml(data: MeetingEmailData): { subject: string; html: string; text: string } {
  const {
    recipientName,
    meetingTitle,
    meetingId,
    startsAt,
    endsAt,
    description,
    organizerName,
    agenda,
    meetingUrl,
    reminderType,
    appUrl,
  } = data;

  const meetingDateStr = formatTunisDate(startsAt);
  const startTimeStr = formatTunisTime(startsAt);
  const endTimeStr = formatTunisTime(endsAt);
  const meetingHubUrl = `${appUrl.replace(/\/$/, '')}/meetings/${meetingId}`;

  let subjectPrefix = 'Rappel:';
  let bannerHeadline = 'Rappel de Réunion';
  let variationMessage = 'Une séance de travail officielle du club 3ZERO Club ISIMS est programmée prochainement.';
  let badgeText = 'Rappel Automatique';
  let badgeColor = '#059669'; // Emerald

  switch (reminderType) {
    case '48h':
      subjectPrefix = 'Dans 2 jours:';
      bannerHeadline = 'Votre réunion est dans 2 jours';
      variationMessage = `Votre réunion "${meetingTitle}" aura lieu dans deux jours. Veuillez consulter l'ordre du jour et préparer vos points de discussion.`;
      badgeText = 'J-2 Rappel';
      break;
    case 'morning_8am':
      subjectPrefix = "Aujourd'hui:";
      bannerHeadline = 'Votre réunion a lieu aujourd’hui';
      variationMessage = `Votre réunion "${meetingTitle}" est programmée pour aujourd’hui à ${startTimeStr}.`;
      badgeText = "Aujourd'hui";
      break;
    case '1h':
      subjectPrefix = 'Dans 1 heure:';
      bannerHeadline = 'Votre réunion commence dans 1 heure';
      variationMessage = `Votre réunion "${meetingTitle}" débutera dans une heure (à ${startTimeStr}). Préparez votre connexion Google Meet.`;
      badgeText = 'Dans 1 heure';
      badgeColor = '#d97706'; // Amber
      break;
    case 'urgent':
      subjectPrefix = 'Urgent — Commence bientôt:';
      bannerHeadline = 'Votre réunion commence sous peu';
      variationMessage = `La réunion "${meetingTitle}" débute très prochainement. Rejoignez directement la session Google Meet.`;
      badgeText = 'Urgent';
      badgeColor = '#dc2626'; // Red
      break;
    case 'cancellation':
      subjectPrefix = 'Annulation:';
      bannerHeadline = 'Séance de réunion annulée';
      variationMessage = `Veuillez noter que la réunion "${meetingTitle}" initialement prévue le ${meetingDateStr} a été annulée par l'organisateur.`;
      badgeText = 'Annulée';
      badgeColor = '#64748b'; // Slate
      break;
    case 'reschedule':
      subjectPrefix = 'Reportée / Nouveau créneau:';
      bannerHeadline = 'Date ou horaire de réunion modifié';
      variationMessage = `L'horaire de la réunion "${meetingTitle}" a été mis à jour. Notez le nouveau créneau horaire ci-dessous.`;
      badgeText = 'Horaire Modifié';
      badgeColor = '#2563eb'; // Blue
      break;
  }

  const subject = `${subjectPrefix} ${meetingTitle} — 3ZERO Club ISIMS`;

  // Plain-text representation
  const text = `
Bonjour ${recipientName},

${variationMessage}

RÉUNION: ${meetingTitle}
DATE: ${meetingDateStr}
HORAIRE: ${startTimeStr} – ${endTimeStr} (Heure de Tunis)
ORGANISATEUR: ${organizerName}

${agenda ? `ORDRE DU JOUR:\n${agenda}\n\n` : ''}
${meetingUrl ? `LIEN GOOGLE MEET:\n${meetingUrl}\n\n` : ''}
ESPACE DE LA RÉUNION SUR ZEC CAMPUS HUB:
${meetingHubUrl}

Nous comptons sur votre présence active pour porter l'impact 3ZERO à l'ISIMS.

ZERO EXCLUSION CARBON POVERTY — Campus Club ISIMS
Institut Supérieur d'Informatique et de Multimédia de Sfax
  `.trim();

  // Responsive HTML template matching Google Stitch & Emerald brand
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; }
    .wrapper { width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .brand-pill { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.3); }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; background-color: ${badgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px; }
    .meta-row { display: flex; margin-bottom: 10px; font-size: 13px; }
    .meta-label { width: 120px; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .meta-value { font-weight: 600; color: #0f172a; flex: 1; }
    .agenda-box { background-color: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 8px; margin-top: 14px; font-size: 13px; color: #064e3b; line-height: 1.5; white-space: pre-line; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn-primary { display: inline-block; background-color: #047857; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 10px rgba(4, 120, 87, 0.25); }
    .btn-secondary { display: inline-block; background-color: #f1f5f9; color: #0f172a !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 10px; margin-left: 8px; border: 1px solid #cbd5e1; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-pill">3ZERO CLUB ISIMS • SFAX</div>
      <h1>${bannerHeadline}</h1>
      <div><span class="badge">${badgeText}</span></div>
    </div>
    <div class="content">
      <div class="greeting">Bonjour ${recipientName},</div>
      <p class="intro">${variationMessage}</p>

      <div class="card">
        <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td width="130" style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px;">RÉUNION</td>
            <td style="color: #0f172a; font-weight: 800; font-size: 15px;">${meetingTitle}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px;">DATE</td>
            <td style="color: #0f172a; font-weight: 600;">${meetingDateStr}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px;">HORAIRE</td>
            <td style="color: #0f172a; font-weight: 700;">${startTimeStr} – ${endTimeStr} <span style="color: #64748b; font-weight: normal; font-size: 11px;">(Heure de Tunis, GMT+1)</span></td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px;">ORGANISATEUR</td>
            <td style="color: #0f172a; font-weight: 600;">${organizerName}</td>
          </tr>
          ${description ? `
          <tr>
            <td style="color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px;">DESCRIPTION</td>
            <td style="color: #334155; font-size: 12px;">${description}</td>
          </tr>` : ''}
        </table>

        ${agenda ? `
        <div class="agenda-box">
          <strong style="display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Ordre du jour :</strong>
          ${agenda}
        </div>` : ''}
      </div>

      <div class="btn-container">
        ${meetingUrl ? `
        <a href="${meetingUrl}" target="_blank" class="btn-primary" style="margin-right: 6px;">
          📹 Rejoindre Google Meet
        </a>` : ''}
        <a href="${meetingHubUrl}" target="_blank" class="btn-secondary">
          Consulter sur ZEC Hub &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">
        Les enregistrements, transcriptions mot à mot et procès-verbaux seront consultables dans l'archive intelligente après la réunion.
      </p>
    </div>

    <div class="footer">
      <strong>ZERO EXCLUSION CARBON POVERTY — Campus Club ISIMS</strong><br>
      Institut Supérieur d'Informatique et de Multimédia de Sfax, Tunisie.<br>
      Ce message automatique vous est transmis conformément à votre statut de membre actif du club.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}
