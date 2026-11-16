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

  const utterances: MeetingBaaSUtterance[] = [];
  let detectedLanguage = 'en';

  // Format 1: Meeting BaaS output_transcription.json standard
  if (Array.isArray(data.transcriptions) && data.transcriptions.length > 0) {
    for (const tBlock of data.transcriptions) {
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
          });
        }
      }
    }
  }

  // Format 2: Direct utterances array
  if (utterances.length === 0 && Array.isArray(data.utterances)) {
    for (const u of data.utterances) {
      utterances.push({
        speaker: u.speaker || u.speaker_label || 'Participant',
        start: Number(u.start ?? u.start_seconds ?? 0),
        end: Number(u.end ?? u.end_seconds ?? 0),
        text: (u.text || u.content || '').trim(),
      });
    }
    if (data.languages && Array.isArray(data.languages) && data.languages[0]) {
      detectedLanguage = data.languages[0];
    }
  }

  // Format 3: Gladia native prediction
  if (utterances.length === 0 && Array.isArray(data.prediction)) {
    for (const p of data.prediction) {
      utterances.push({
        speaker: p.speaker || 'Speaker ' + (p.speaker_id ?? 1),
        start: Number(p.time_begin || 0),
        end: Number(p.time_end || 0),
        text: (p.transcription || '').trim(),
      });
    }
  }

  // Format 4: Segments array
  if (utterances.length === 0 && Array.isArray(data.segments)) {
    for (const s of data.segments) {
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
    data.full_text ||
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
