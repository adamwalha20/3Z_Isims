/**
 * Meeting BaaS API v2 Types & Interfaces
 * Docs: https://docs.meetingbaas.com/api-v2
 */

export type MeetingBaaSBotStatus =
  | 'dispatched'
  | 'joining'
  | 'waiting_admission'
  | 'in_meeting'
  | 'recording'
  | 'paused'
  | 'leaving'
  | 'completed'
  | 'failed'
  | 'kicked'
  | 'not_allowed';

export interface MeetingBaaSCreateBotRequest {
  meeting_url: string;
  bot_name: string;
  bot_image?: string;
  recording_mode?: 'speaker_view' | 'gallery_view' | 'audio_only';
  entry_message?: string;
  allow_multiple_bots?: boolean;
  deduplication_key?: string;
  automatic_leave?: {
    waiting_room_timeout?: number;
    noone_joined_timeout?: number;
    silence_timeout?: number;
    everyone_left_timeout?: number;
  };
  extra?: Record<string, any>;
  transcription_enabled?: boolean;
  transcription_config?: {
    provider?: 'gladia' | 'deepgram' | 'assemblyai' | 'speechmatics';
    language?: string;
    model?: string;
    custom_params?: Record<string, any>;
  };
}

export interface MeetingBaaSCreateBotResponse {
  success: boolean;
  bot_id: string;
  status?: string;
  message?: string;
  data?: {
    bot_id: string;
    status: string;
    meeting_url: string;
    created_at?: string;
  };
}

export interface MeetingBaaSParticipant {
  id?: string | number;
  name: string;
  display_name?: string;
  profile_picture?: string;
  is_host?: boolean;
}

export interface MeetingBaaSBotDetails {
  bot_id: string;
  status: string;
  meeting_url: string;
  video?: string | null;
  audio?: string | null;
  transcription?: string | null;
  raw_transcription?: string | null;
  output_transcription?: string | null;
  diarization?: string | null;
  participants?: MeetingBaaSParticipant[];
  duration_seconds?: number;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  extra?: Record<string, any>;
}

export interface MeetingBaaSBotDetailsResponse {
  success: boolean;
  data: MeetingBaaSBotDetails;
}

export interface MeetingBaaSUtterance {
  speaker: string;
  start: number;
  end: number;
  text: string;
  language?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
}

export interface MeetingBaaSTranscriptionOutput {
  bot_id?: string;
  transcriptions: Array<{
    transcription: {
      utterances: MeetingBaaSUtterance[];
      languages?: string[];
      full_text?: string;
      metadata?: Record<string, any>;
    };
  }>;
}

export interface MeetingBaaSWebhookPayload {
  event: 'bot.status_change' | 'bot.completed' | 'bot.failed' | 'bot.stopped' | 'bot.kicked' | string;
  event_id?: string;
  id?: string;
  bot_id?: string;
  data: {
    bot_id: string;
    status: string;
    sub_code?: string;
    failure_reason?: string;
    meeting_url?: string;
    duration?: number;
    video_url?: string;
    audio_url?: string;
    transcription_url?: string;
    extra?: Record<string, any>;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
  timestamp?: string | number;
}
