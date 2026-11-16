import { getMeetingBaaSClient } from './client';
import type {
  MeetingBaaSCreateBotRequest,
  MeetingBaaSCreateBotResponse,
  MeetingBaaSBotDetailsResponse,
} from './types';
import { MeetingBaaSValidationError } from './errors';
import { validateGoogleMeetUrl } from './validation';

export { validateGoogleMeetUrl };

export async function createRecordingBot(params: {
  meetingUrl: string;
  meetingId: string;
  botName?: string;
  recordingMode?: 'speaker_view' | 'gallery_view' | 'audio_only';
  deduplicationKey?: string;
  extra?: Record<string, any>;
}): Promise<MeetingBaaSCreateBotResponse> {
  const { isValid, normalizedUrl, error } = validateGoogleMeetUrl(params.meetingUrl);
  if (!isValid) {
    throw new MeetingBaaSValidationError(error || 'Invalid meeting URL');
  }

  const client = getMeetingBaaSClient();

  const payload: MeetingBaaSCreateBotRequest = {
    meeting_url: normalizedUrl,
    bot_name: params.botName || 'ZEC AI Meeting Assistant',
    recording_mode: params.recordingMode || 'speaker_view',
    allow_multiple_bots: false,
    deduplication_key: params.deduplicationKey || `zec_meet_${params.meetingId}`,
    entry_message:
      'ZEC AI Meeting Assistant has joined. This session is recorded and transcribed for 3ZERO Club ISIMS institutional memory and task tracking.',
    automatic_leave: {
      waiting_room_timeout: 600, // 10 minutes in waiting room
      noone_joined_timeout: 300,  // 5 minutes if alone
      silence_timeout: 1200,      // 20 minutes silence
      everyone_left_timeout: 120, // 2 minutes after everyone leaves
    },
    transcription_enabled: true,
    transcription_config: {
      provider: 'gladia', // Gladia provides high-accuracy multilingual audio transcription & code-switching
      custom_params: {
        language_config: {
          languages: ['ar', 'fr', 'en'],
          code_switching: true,
        },
      },
    },
    extra: {
      meeting_id: params.meetingId,
      dispatched_at: new Date().toISOString(),
      ...(params.extra || {}),
    },
  };

  const response = await client.request<any>('/bots', {
    method: 'POST',
    body: payload,
  });

  const botId = response?.data?.bot_id || response?.bot_id || response?.id;

  return {
    success: true,
    bot_id: botId,
    status: response?.data?.status || response?.status || 'dispatched',
    data: response?.data,
  };
}

export async function getBotDetails(botId: string): Promise<MeetingBaaSBotDetailsResponse> {
  if (!botId) {
    throw new MeetingBaaSValidationError('Bot ID is required to fetch details');
  }

  const client = getMeetingBaaSClient();
  const res = await client.request<any>(`/bots/${encodeURIComponent(botId)}`, {
    method: 'GET',
  });

  return {
    success: true,
    data: res?.data || res,
  };
}

export async function getBotStatus(botId: string): Promise<{ success: boolean; status: string; sub_code?: string }> {
  if (!botId) {
    throw new MeetingBaaSValidationError('Bot ID is required to fetch status');
  }

  const client = getMeetingBaaSClient();
  try {
    const res = await client.request<any>(`/bots/${encodeURIComponent(botId)}/status`, {
      method: 'GET',
    });
    return {
      success: true,
      status: res?.status || res?.data?.status || 'unknown',
      sub_code: res?.sub_code || res?.data?.sub_code,
    };
  } catch (err) {
    // Fall back to full bot details if status sub-endpoint differs
    const details = await getBotDetails(botId);
    return {
      success: true,
      status: details.data.status,
    };
  }
}

export async function leaveMeeting(botId: string): Promise<{ success: boolean; message: string }> {
  if (!botId) {
    throw new MeetingBaaSValidationError('Bot ID is required to issue leave command');
  }

  const client = getMeetingBaaSClient();

  // Try standard DELETE /v2/bots/{bot_id} as specified in documentation
  try {
    await client.request(`/bots/${encodeURIComponent(botId)}`, {
      method: 'DELETE',
    });
    return { success: true, message: 'Bot successfully instructed to leave meeting.' };
  } catch (delErr: any) {
    // Some v2 builds support POST /v2/bots/{bot_id}/leave
    try {
      await client.request(`/bots/${encodeURIComponent(botId)}/leave`, {
        method: 'POST',
      });
      return { success: true, message: 'Bot leave command acknowledged.' };
    } catch {
      throw delErr;
    }
  }
}
