import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { MeetingBaaSUtterance } from './types';

export const MEETING_RECORDINGS_BUCKET = process.env.MEETING_RECORDINGS_BUCKET || 'meeting-recordings';

export interface NormalizedTranscript {
  fullText: string;
  utterances: MeetingBaaSUtterance[];
  detectedLanguage: string;
}

/**
 * Normalizes varied transcription payloads (Meeting BaaS standardized format,
 * Gladia, Deepgram, AssemblyAI) into a consistent utterance structure.
 */
export function normalizeTranscriptionPayload(data: any): NormalizedTranscript {
  if (!data) {
    return { fullText: '', utterances: [], detectedLanguage: 'en' };
  }

  // Handle wrappers (e.g. Gladia or Meeting BaaS returning { provider: 'gladia', result: { utterances: [...] } })
  const payload = data.result || data;

  const utterances: MeetingBaaSUtterance[] = [];
  let detectedLanguage = 'en';

  // Format 1: Meeting BaaS output_transcription.json standard
  if (Array.isArray(payload.transcriptions) && payload.transcriptions.length > 0) {
    for (const tBlock of payload.transcriptions) {
      const tx = tBlock.transcription;
      if (tx?.languages && Array.isArray(tx.languages) && tx.languages[0]) {
        detectedLanguage = tx.languages[0];
      }
      if (Array.isArray(tx?.utterances)) {
        for (const u of tx.utterances) {
          utterances.push({
            speaker: u.speaker || 'Participant',
            start: Number(u.start || 0),
            end: Number(u.end || 0),
            text: (u.text || u.words || '').trim(),
            language: u.language || (u as any).lang,
          });
        }
      }
    }
  }

  // Format 2: Direct utterances array (or payload.utterances or data.utterances)
  const directUtterances = Array.isArray(payload.utterances)
    ? payload.utterances
    : Array.isArray(data.utterances)
    ? data.utterances
    : null;

  if (utterances.length === 0 && directUtterances) {
    for (const u of directUtterances) {
      utterances.push({
        speaker: u.speaker || u.speaker_label || 'Participant',
        start: Number(u.start ?? u.start_seconds ?? 0),
        end: Number(u.end ?? u.end_seconds ?? 0),
        text: (u.text || u.content || '').trim(),
        language: u.language || u.lang,
      });
    }
    const langs = payload.languages || data.languages;
    if (langs && Array.isArray(langs) && langs[0]) {
      detectedLanguage = langs[0];
    }
  }

  // Format 3: Gladia native prediction
  const predictions = Array.isArray(payload.prediction) ? payload.prediction : Array.isArray(data.prediction) ? data.prediction : null;
  if (utterances.length === 0 && predictions) {
    for (const p of predictions) {
      utterances.push({
        speaker: p.speaker || 'Speaker ' + (p.speaker_id ?? 1),
        start: Number(p.time_begin || 0),
        end: Number(p.time_end || 0),
        text: (p.transcription || '').trim(),
        language: p.language || p.lang,
      });
    }
  }

  // Format 4: Segments array
  const segments = Array.isArray(payload.segments) ? payload.segments : Array.isArray(data.segments) ? data.segments : null;
  if (utterances.length === 0 && segments) {
    for (const s of segments) {
      utterances.push({
        speaker: s.speaker || s.speaker_label || 'Speaker',
        start: Number(s.start || s.start_seconds || 0),
        end: Number(s.end || s.end_seconds || 0),
        text: (s.text || s.content || '').trim(),
      });
    }
  }

  // Sort chronologically by start timestamp
  utterances.sort((a, b) => a.start - b.start);

  const fullText =
    payload.full_text ||
    data.full_text ||
    payload.content ||
    data.content ||
    utterances.map((u) => `${u.speaker}: ${u.text}`).join('\n\n');

  return {
    fullText,
    utterances,
    detectedLanguage: detectedLanguage.toLowerCase(),
  };
}

/**
 * Downloads a remote temporary artifact (video/audio/JSON) and uploads it into
 * the private Supabase Storage bucket under `meeting-recordings/{meeting_id}/{filename}`.
 */
export async function downloadAndUploadArtifact(params: {
  meetingId: string;
  sourceUrl: string;
  targetFilename: string;
  contentType: string;
}): Promise<{ storagePath: string; fileSize: number }> {
  const { meetingId, sourceUrl, targetFilename, contentType } = params;

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download artifact from ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storagePath = `meetings/${meetingId}/${targetFilename}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadErr } = await supabase.storage
    .from(MEETING_RECORDINGS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Failed to upload ${targetFilename} to Supabase Storage: ${uploadErr.message}`);
  }

  return {
    storagePath,
    fileSize: buffer.length,
  };
}

/**
 * Generates a short-lived signed URL for authorized media streaming or download.
 */
export async function createSignedPlaybackUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MEETING_RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL for ${storagePath}: ${error?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}
