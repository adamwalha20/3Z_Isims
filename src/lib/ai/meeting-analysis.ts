import { executeAICompletion, AIProvider } from './provider';
import { buildMeetingAnalysisSystemPrompt, buildMeetingAnalysisUserPrompt } from './prompts';
import { MeetingAnalysisResult, MeetingAnalysisResultSchema } from './schemas';

export interface AnalyzeMeetingTranscriptParams {
  meetingTitle: string;
  meetingType?: string;
  transcriptText: string;
  speakers?: string[];
  durationMinutes?: number;
  targetLanguage?: 'en' | 'fr' | 'ar-TN';
  provider?: AIProvider;
  model?: string;
}

export interface MeetingAnalysisResponse {
  analysis: MeetingAnalysisResult;
  provider: AIProvider;
  model: string;
}

/**
 * Strips markdown code fences (e.g. ```json ... ```) if an LLM outputs them.
 */
function cleanJsonString(str: string): string {
  const trimmed = str.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

/**
 * Analyzes a meeting transcript using OpenAI or Gemini,
 * validating the output against the 8-dimension MeetingAnalysisResultSchema.
 */
export async function analyzeMeetingTranscript(
  params: AnalyzeMeetingTranscriptParams
): Promise<MeetingAnalysisResponse> {
  const {
    meetingTitle,
    meetingType,
    transcriptText,
    speakers,
    durationMinutes,
    targetLanguage = 'en',
    provider,
    model,
  } = params;

  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Cannot analyze empty meeting transcript.');
  }

  // Cap max transcript characters to prevent context window blowouts (~60k chars approx 15k tokens)
  // For standard meetings, 60k characters easily covers 1-2 hours of conversation.
  const cappedTranscript =
    transcriptText.length > 60000
      ? `${transcriptText.slice(0, 58000)}\n\n[... Transcript section truncated for token context optimization ...]\n\n${transcriptText.slice(-2000)}`
      : transcriptText;

  const systemPrompt = buildMeetingAnalysisSystemPrompt(targetLanguage);
  const userPrompt = buildMeetingAnalysisUserPrompt({
    meetingTitle,
    meetingType,
    transcriptText: cappedTranscript,
    speakers,
    durationMinutes,
  });

  const { rawJsonText, provider: activeProvider, model: activeModel } = await executeAICompletion({
    systemPrompt,
    userPrompt,
    provider,
    model,
  });

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(cleanJsonString(rawJsonText));
  } catch (parseErr: any) {
    throw new Error(`Failed to parse AI meeting analysis JSON response: ${parseErr?.message}`);
  }

  // Validate strictly against our 8-dimension Zod schema
  const validationResult = MeetingAnalysisResultSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.warn('AI analysis schema validation issue:', validationResult.error.issues);
    // Provide sensible defaults for missing fields while preserving extracted data
    const defaultedAnalysis: MeetingAnalysisResult = {
      executive_summary: {
        purpose: parsedJson?.executive_summary?.purpose || `Meeting session for "${meetingTitle}"`,
        main_topics: parsedJson?.executive_summary?.main_topics || [],
        key_outcomes: parsedJson?.executive_summary?.key_outcomes || [],
        conclusion: parsedJson?.executive_summary?.conclusion || 'Session concluded successfully.',
      },
      overview: {
        title: meetingTitle,
        date: parsedJson?.overview?.date || new Date().toISOString().split('T')[0],
        duration_minutes: Number(parsedJson?.overview?.duration_minutes || durationMinutes || 0),
        participants: parsedJson?.overview?.participants || speakers || [],
        main_subjects: parsedJson?.overview?.main_subjects || [],
      },
      topics: Array.isArray(parsedJson?.topics)
        ? parsedJson.topics.map((t: any) => ({
            title: String(t.title || 'Discussion Topic'),
            explanation: String(t.explanation || ''),
            key_points: Array.isArray(t.key_points) ? t.key_points : [],
            speakers: Array.isArray(t.speakers) ? t.speakers : [],
            timestamp_seconds: Number(t.timestamp_seconds || 0),
          }))
        : [],
      decisions: Array.isArray(parsedJson?.decisions)
        ? parsedJson.decisions.map((d: any) => ({
            title: String(d.title || 'Decision'),
            explanation: String(d.explanation || ''),
            evidence: String(d.evidence || 'Transcript record'),
            timestamp_seconds: Number(d.timestamp_seconds || 0),
            status: ['confirmed', 'proposal', 'suggestion', 'unresolved'].includes(d.status)
              ? d.status
              : 'confirmed',
          }))
        : [],
      action_items: Array.isArray(parsedJson?.action_items)
        ? parsedJson.action_items.map((a: any) => ({
            title: String(a.title || 'Action Item'),
            description: String(a.description || ''),
            suggested_assignee: String(a.suggested_assignee || 'Unassigned'),
            deadline: String(a.deadline || 'Not specified'),
            priority: ['low', 'medium', 'high', 'urgent'].includes(a.priority) ? a.priority : 'medium',
            related_topic: a.related_topic ? String(a.related_topic) : undefined,
            timestamp_seconds: Number(a.timestamp_seconds || 0),
            evidence: String(a.evidence || 'Transcript excerpt'),
          }))
        : [],
      important_notes: {
        announcements: parsedJson?.important_notes?.announcements || [],
        risks_and_challenges: parsedJson?.important_notes?.risks_and_challenges || [],
        unresolved_questions: parsedJson?.important_notes?.unresolved_questions || [],
      },
      next_meeting: {
        proposed_date: parsedJson?.next_meeting?.proposed_date || null,
        proposed_time: parsedJson?.next_meeting?.proposed_time || null,
        proposed_agenda: parsedJson?.next_meeting?.proposed_agenda || [],
      },
      meeting_quality: {
        unclear_decisions: parsedJson?.meeting_quality?.unclear_decisions || [],
        missing_task_owners: parsedJson?.meeting_quality?.missing_task_owners || [],
        missing_deadlines: parsedJson?.meeting_quality?.missing_deadlines || [],
      },
      detected_language: parsedJson?.detected_language || targetLanguage,
    };

    return {
      analysis: defaultedAnalysis,
      provider: activeProvider,
      model: activeModel,
    };
  }

  return {
    analysis: validationResult.data,
    provider: activeProvider,
    model: activeModel,
  };
}
